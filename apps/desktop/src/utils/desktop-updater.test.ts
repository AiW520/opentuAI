import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ check: vi.fn(), relaunch: vi.fn() }));
vi.mock('./tauri-api', () => ({ isTauriEnvironment: () => true }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: mocks.relaunch }));

let listeners: EventListener[];
const confirm = () => window.dispatchEvent(new CustomEvent('user-confirmed-upgrade'));

describe('desktop updater', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    delete window.__OPENTU_DESKTOP_UPDATE_EVENT__;
    delete window.__OPENTU_DESKTOP_UPDATER_ACTIVE__;
    listeners = [];
    const add = window.addEventListener.bind(window);
    vi.spyOn(window, 'addEventListener').mockImplementation((type, listener, options) => {
      if (type === 'user-confirmed-upgrade') listeners.push(listener as EventListener);
      add(type, listener, options);
    });
  });
  afterEach(() => {
    for (const listener of listeners) window.removeEventListener('user-confirmed-upgrade', listener);
    vi.restoreAllMocks();
  });

  it('retains an update discovered before the prompt mounts and ignores duplicate installs', async () => {
    let finish!: () => void;
    const downloadAndInstall = vi.fn(callback => {
      callback({ event: 'Started', data: { contentLength: 100 } });
      callback({ event: 'Progress', data: { chunkLength: 50 } });
      return new Promise<void>(resolve => { finish = resolve; });
    });
    mocks.check.mockResolvedValue({ version: '1.2.12', body: 'New release', downloadAndInstall });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    await initializeDesktopUpdater();
    expect(mocks.check).toHaveBeenCalledTimes(1);
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ version: '1.2.12', status: 'ready' });
    confirm();
    confirm();
    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ status: 'downloading', progress: 50 });
    finish();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(1));
  });

  it('shows a failed download and allows retry', async () => {
    const downloadAndInstall = vi.fn().mockRejectedValueOnce(new Error('bad signature')).mockResolvedValueOnce(undefined);
    mocks.check.mockResolvedValue({ version: '1.2.12', downloadAndInstall });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    confirm();
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ status: 'error', restartOnly: false }));
    expect(mocks.relaunch).not.toHaveBeenCalled();
    confirm();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(1));
    expect(downloadAndInstall).toHaveBeenCalledTimes(2);
  });

  it('retries only restart after the update was installed', async () => {
    const downloadAndInstall = vi.fn().mockResolvedValue(undefined);
    mocks.relaunch.mockRejectedValueOnce(new Error('restart failed')).mockResolvedValueOnce(undefined);
    mocks.check.mockResolvedValue({ version: '1.2.12', downloadAndInstall });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    confirm();
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ status: 'error', restartOnly: true }));
    confirm();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(2));
    expect(downloadAndInstall).toHaveBeenCalledTimes(1);
  });

  it('does not announce automatic updates when the plugin is unavailable', async () => {
    mocks.check.mockRejectedValue(new Error('plugin not registered'));
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toBeUndefined();
    expect(window.__OPENTU_DESKTOP_UPDATER_ACTIVE__).toBe(false);
  });
});
