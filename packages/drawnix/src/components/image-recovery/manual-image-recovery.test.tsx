// @vitest-environment jsdom
import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ManualImageRecovery } from './manual-image-recovery';
import { RecoveredImageSaveError } from './recovery-events';

const state = vi.hoisted(() => ({
  profiles: [{ id: 'tuzi', name: '原渠道', enabled: true, baseUrl: 'https://api.tu-zi.com/v1', apiKey: 'fictional-key' }],
  query: vi.fn(),
}));
vi.mock('../../hooks/use-provider-profiles', () => ({ useProviderProfiles: () => state.profiles }));
vi.mock('../../utils/settings-manager', () => ({ providerProfilesSettings: { get: () => state.profiles } }));
vi.mock('../../utils/crypto-utils', () => ({ CryptoUtils: { isEncrypted: () => false } }));
vi.mock('../../services/provider-routing/tuzi-api-endpoints', () => ({ isTuziRequestRecoveryBaseUrl: () => true }));
vi.mock('../../workflow-mode/web/src/services/api/image-recovery', () => ({ queryWorkflowImageResult: state.query }));
vi.mock('tdesign-react', () => ({
  Button: ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Dialog: ({ children, onClose }: any) => <div role="dialog"><button onClick={onClose}>关闭</button>{children}</div>,
}));

beforeEach(() => { state.query.mockReset(); state.profiles[0].apiKey = 'fictional-key'; });
afterEach(cleanup);

function fillRequest() {
  fireEvent.change(screen.getByLabelText('原请求渠道'), { target: { value: 'tuzi' } });
  fireEvent.change(screen.getByLabelText('请求 ID'), { target: { value: 'request-1' } });
  fireEvent.click(screen.getByRole('button', { name: '查询图片' }));
}

describe('manual image recovery', () => {
  it('queries the selected channel and inserts only after the user requests it', async () => {
    state.query.mockResolvedValue({ status: 'succeeded', data: [{ url: 'https://example.test/image.png' }] });
    const insert = vi.fn().mockResolvedValue(undefined);
    render(<ManualImageRecovery onInsert={insert} onClose={vi.fn()} />);
    fillRequest();
    expect(await screen.findByAltText('找回的图片')).toBeTruthy();
    expect(state.query).toHaveBeenCalledWith('https://api.tu-zi.com/v1', 'fictional-key', 'request-1');
    expect(insert).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '插入画布' }));
    await waitFor(() => expect(insert).toHaveBeenCalledWith('https://example.test/image.png'));
  });

  it('discards a result if the selected credential changed while querying', async () => {
    let finish!: (value: unknown) => void;
    state.query.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    render(<ManualImageRecovery onInsert={vi.fn()} onClose={vi.fn()} />);
    fillRequest();
    await waitFor(() => expect(state.query).toHaveBeenCalled());
    state.profiles[0].apiKey = 'changed-key';
    finish({ status: 'succeeded', data: [{ url: 'https://example.test/image.png' }] });
    expect(await screen.findByText('渠道配置已改变，请确认原渠道后重新查询')).toBeTruthy();
    expect(screen.queryByAltText('找回的图片')).toBeNull();
  });

  it('treats an unknown result as pending without inserting anything', async () => {
    state.query.mockResolvedValue({ status: 'processing_or_not_found' });
    const insert = vi.fn();
    render(<ManualImageRecovery onInsert={insert} onClose={vi.fn()} />);
    fillRequest();
    expect(await screen.findByText('结果尚未找到，稍后可以再次查询')).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });

  it('requires the original channel configuration again before inserting', async () => {
    state.query.mockResolvedValue({ status: 'succeeded', data: [{ url: 'https://example.test/image.png' }] });
    const insert = vi.fn();
    render(<ManualImageRecovery onInsert={insert} onClose={vi.fn()} />);
    fillRequest();
    await screen.findByAltText('找回的图片');
    state.profiles[0].apiKey = 'changed-key';
    fireEvent.click(screen.getByRole('button', { name: '插入画布' }));
    expect(screen.getByText('渠道配置已改变，请确认原渠道后重新查询')).toBeTruthy();
    expect(insert).not.toHaveBeenCalled();
  });

  it('prevents duplicate insertion when the canvas write fails after insertion', async () => {
    state.query.mockResolvedValue({ status: 'succeeded', data: [{ url: 'https://example.test/image.png' }] });
    const insert = vi.fn().mockRejectedValue(new RecoveredImageSaveError('save failed'));
    render(<ManualImageRecovery onInsert={insert} onClose={vi.fn()} />);
    fillRequest();
    await screen.findByAltText('找回的图片');
    fireEvent.click(screen.getByRole('button', { name: '插入画布' }));
    expect(await screen.findByText(/图片已插入画布，但保存失败/)).toBeTruthy();
    expect((screen.getByRole('button', { name: '已插入' }) as HTMLButtonElement).disabled).toBe(true);
    expect(insert).toHaveBeenCalledTimes(1);
  });

  it('warns when an inserted image is available only from its remote URL', async () => {
    state.query.mockResolvedValue({ status: 'succeeded', data: [{ url: 'https://example.test/image.png' }] });
    render(<ManualImageRecovery onInsert={vi.fn().mockResolvedValue({ remoteOnly: true })} onClose={vi.fn()} />);
    fillRequest();
    await screen.findByAltText('找回的图片');
    fireEvent.click(screen.getByRole('button', { name: '插入画布' }));
    expect(await screen.findByText(/远程链接可能过期/)).toBeTruthy();
  });
});
