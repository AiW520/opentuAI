import React from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionUpdatePrompt } from './version-update-prompt';
import { publishDesktopUpdate, publishDesktopUpdateCheck } from '../../utils/desktop-update-state';

const tasks = vi.hoisted(() => ({ activeTasks: [] as unknown[] }));
const runtime = vi.hoisted(() => ({ desktop: true }));
vi.mock('../../hooks/useTaskQueue', () => ({ useTaskQueue: () => tasks }));
vi.mock('../../utils/tauri-env', () => ({ isTauriEnvironment: () => runtime.desktop }));
vi.mock('tdesign-react', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Dialog: () => null,
}));

describe('desktop update prompt', () => {
  beforeEach(() => {
    runtime.desktop = true;
    tasks.activeTasks = [];
    delete window.__OPENTU_DESKTOP_UPDATE_EVENT__;
    delete window.__OPENTU_DESKTOP_UPDATE_CHECK__;
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('ignores web update events in the desktop app', () => {
    const fetch = vi.fn();
    vi.stubGlobal('fetch', fetch);
    render(<VersionUpdatePrompt />);
    act(() => window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { version: '9.9.9' } })));
    expect(screen.queryByText('发现新版本 v9.9.9')).toBeNull();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('ignores queued and live desktop update events on the web', () => {
    runtime.desktop = false;
    publishDesktopUpdate({ version: '9.9.9', desktop: true, status: 'ready' });
    render(<VersionUpdatePrompt />);
    act(() => publishDesktopUpdate({ version: '9.9.10', desktop: true, status: 'ready' }));
    expect(screen.queryByText(/发现新版本/)).toBeNull();
  });

  it('continues to show web updates in the browser', async () => {
    runtime.desktop = false;
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ version: '9.9.9' }) }));
    render(<VersionUpdatePrompt />);
    act(() => window.dispatchEvent(new CustomEvent('sw-update-available', { detail: { version: '9.9.9' } })));
    expect(await screen.findByText('发现新版本 v9.9.9')).toBeTruthy();
  });

  it('replays early updates and waits for generation tasks to finish', () => {
    publishDesktopUpdate({ version: '1.2.15', desktop: true, status: 'ready' });
    tasks.activeTasks = [{}];
    const view = render(<VersionUpdatePrompt />);
    expect(screen.queryByText('发现新版本 v1.2.15')).toBeNull();
    tasks.activeTasks = [];
    view.rerender(<VersionUpdatePrompt />);
    expect(screen.getByText('发现新版本 v1.2.15')).toBeTruthy();
    act(() => publishDesktopUpdateCheck({ status: 'current' }));
    expect(screen.queryByText('发现新版本 v1.2.15')).toBeNull();
  });

  it('disables repeated installation and keeps failed restart visible', () => {
    publishDesktopUpdate({ version: '1.2.15', desktop: true, status: 'downloading', progress: 50 });
    render(<VersionUpdatePrompt />);
    expect(screen.getByText('正在下载 v1.2.15 · 50%')).toBeTruthy();
    expect((screen.getByRole('button', { name: '立即更新' }) as HTMLButtonElement).disabled).toBe(true);
    act(() => publishDesktopUpdate({ version: '1.2.15', desktop: true, status: 'error', restartOnly: true }));
    expect(screen.getByText('更新已安装，重启失败')).toBeTruthy();
    expect((screen.getByRole('button', { name: '重启应用' }) as HTMLButtonElement).disabled).toBe(false);
  });

  it('offers a manual download for builds without automatic installation', () => {
    const confirm = vi.fn();
    window.addEventListener('user-confirmed-upgrade', confirm);
    try {
      publishDesktopUpdate({ version: '1.2.15', desktop: true, status: 'ready', downloadUrl: 'https://aiw520.github.io/opentuAI/download.html' });
      render(<VersionUpdatePrompt />);
      fireEvent.click(screen.getByRole('button', { name: '下载新版' }));
      expect(confirm).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener('user-confirmed-upgrade', confirm);
    }
  });

  it('blocks installation when preparing the canvases fails', async () => {
    const confirm = vi.fn();
    window.addEventListener('user-confirmed-upgrade', confirm);
    try {
      publishDesktopUpdate({ version: '1.2.15', desktop: true, status: 'ready' });
      render(<VersionUpdatePrompt workflow prepareDesktopUpdate={vi.fn().mockRejectedValue(new Error('画布保存失败'))} />);
      fireEvent.click(screen.getByRole('button', { name: '立即更新' }));
      expect((await screen.findByRole('alert')).textContent).toContain('画布保存失败');
      expect(confirm).not.toHaveBeenCalled();
    } finally {
      window.removeEventListener('user-confirmed-upgrade', confirm);
    }
  });

  it('waits for canvas preparation before starting installation', async () => {
    let finish!: () => void;
    const prepare = vi.fn(() => new Promise<void>(resolve => { finish = resolve; }));
    const confirm = vi.fn();
    window.addEventListener('user-confirmed-upgrade', confirm);
    try {
      publishDesktopUpdate({ version: '1.2.15', desktop: true, status: 'ready' });
      render(<VersionUpdatePrompt workflow prepareDesktopUpdate={prepare} />);
      fireEvent.click(screen.getByRole('button', { name: '立即更新' }));
      expect(confirm).not.toHaveBeenCalled();
      await act(async () => finish());
      await waitFor(() => expect(confirm).toHaveBeenCalledTimes(1));
    } finally {
      window.removeEventListener('user-confirmed-upgrade', confirm);
    }
  });
});
