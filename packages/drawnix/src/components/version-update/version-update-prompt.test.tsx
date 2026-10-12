import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VersionUpdatePrompt } from './version-update-prompt';
import { publishDesktopUpdate, publishDesktopUpdateCheck } from '../../utils/desktop-update-state';

const tasks = vi.hoisted(() => ({ activeTasks: [] as unknown[] }));
vi.mock('../../hooks/useTaskQueue', () => ({ useTaskQueue: () => tasks }));
vi.mock('tdesign-react', () => ({
  Button: ({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) => <button onClick={onClick} disabled={disabled}>{children}</button>,
  Dialog: () => null,
}));

describe('desktop update prompt', () => {
  beforeEach(() => {
    tasks.activeTasks = [];
    delete window.__OPENTU_DESKTOP_UPDATE_EVENT__;
    delete window.__OPENTU_DESKTOP_UPDATE_CHECK__;
  });
  afterEach(cleanup);

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
});
