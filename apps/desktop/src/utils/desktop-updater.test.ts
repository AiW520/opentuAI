import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ check: vi.fn(), relaunch: vi.fn(), openUrl: vi.fn() }));
vi.mock('./tauri-api', () => ({ isTauriEnvironment: () => true }));
vi.mock('@tauri-apps/plugin-updater', () => ({ check: mocks.check }));
vi.mock('@tauri-apps/plugin-process', () => ({ relaunch: mocks.relaunch }));
vi.mock('@tauri-apps/plugin-opener', () => ({ openUrl: mocks.openUrl }));

let listeners: { target: Window | Document; type: string; listener: EventListener }[];
const confirm = () => window.dispatchEvent(new CustomEvent('user-confirmed-upgrade'));

describe('desktop updater', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv('VITE_OPENTU_SIGNED_UPDATER', 'true');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({
      tag_name: 'v1.2.14-preview.1', assets: [{ name: 'Opentu-macos-aarch64.dmg', browser_download_url: 'https://github.com/AiW520/opentuAI/releases/download/v1.2.14-preview.1/Opentu-macos-aarch64.dmg' }],
    }) }));
    document.head.innerHTML = '<meta name="app-version" content="1.2.14">';
    delete window.__OPENTU_DESKTOP_UPDATE_EVENT__;
    delete window.__OPENTU_DESKTOP_UPDATER_ACTIVE__;
    delete window.__OPENTU_DESKTOP_UPDATE_CHECK__;
    window.__OPENTU_PREPARE_DESKTOP_UPDATE__ = vi.fn().mockResolvedValue(undefined);
    listeners = [];
    for (const target of [window, document]) {
      const add = target.addEventListener.bind(target);
      vi.spyOn(target, 'addEventListener').mockImplementation((type, listener, options) => {
        listeners.push({ target, type, listener: listener as EventListener });
        add(type, listener, options);
      });
    }
    vi.spyOn(window, 'setInterval').mockReturnValue(0);
  });
  afterEach(() => {
    delete window.__OPENTU_PREPARE_DESKTOP_UPDATE__;
    for (const { target, type, listener } of listeners) target.removeEventListener(type, listener);
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it('retains an update discovered before the prompt mounts and ignores duplicate installs', async () => {
    let finish!: () => void;
    const download = vi.fn(callback => {
      callback({ event: 'Started', data: { contentLength: 100 } });
      callback({ event: 'Progress', data: { chunkLength: 50 } });
      return new Promise<void>(resolve => { finish = resolve; });
    });
    const install = vi.fn().mockResolvedValue(undefined);
    mocks.check.mockResolvedValue({ version: '1.2.15', body: 'New release', download, install });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    await initializeDesktopUpdater();
    expect(mocks.check).toHaveBeenCalledTimes(1);
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ version: '1.2.15', status: 'ready' });
    confirm();
    confirm();
    expect(download).toHaveBeenCalledTimes(1);
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ status: 'downloading', progress: 50 });
    finish();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(1));
  });

  it('shows a failed download and allows retry', async () => {
    const download = vi.fn().mockRejectedValueOnce(new Error('bad signature')).mockResolvedValueOnce(undefined);
    mocks.check.mockResolvedValue({ version: '1.2.12', download, install: vi.fn().mockResolvedValue(undefined) });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    confirm();
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ status: 'error', restartOnly: false }));
    expect(mocks.relaunch).not.toHaveBeenCalled();
    confirm();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(1));
    expect(download).toHaveBeenCalledTimes(2);
  });

  it('retries only restart after the update was installed', async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    const install = vi.fn().mockResolvedValue(undefined);
    mocks.relaunch.mockRejectedValueOnce(new Error('restart failed')).mockResolvedValueOnce(undefined);
    mocks.check.mockResolvedValue({ version: '1.2.12', download, install });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    confirm();
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ status: 'error', restartOnly: true }));
    confirm();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(2));
    expect(download).toHaveBeenCalledTimes(1);
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('does not announce automatic updates when the plugin is unavailable', async () => {
    mocks.check.mockRejectedValue(new Error('plugin not registered'));
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toBeUndefined();
    expect(window.__OPENTU_DESKTOP_UPDATER_ACTIVE__).toBe(false);
    expect(window.__OPENTU_DESKTOP_UPDATE_CHECK__).toEqual({ status: 'error' });
  });

  it('falls back to manual download without calling a disabled plugin', async () => {
    vi.stubEnv('VITE_OPENTU_SIGNED_UPDATER', 'false');
    document.querySelector('meta')!.setAttribute('content', '1.2.13');
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    expect(mocks.check).not.toHaveBeenCalled();
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ version: '1.2.14-preview.1', downloadUrl: 'https://aiw520.github.io/opentuAI/download.html' });
    confirm();
    await vi.waitFor(() => expect(mocks.openUrl).toHaveBeenCalledWith('https://aiw520.github.io/opentuAI/download.html'));
    expect(mocks.relaunch).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent checks and clears withdrawn updates', async () => {
    const close = vi.fn().mockResolvedValue(undefined);
    mocks.check.mockResolvedValueOnce({ version: '1.2.15', close }).mockResolvedValue(null);
    const { initializeDesktopUpdater, checkDesktopUpdates } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    await Promise.all([checkDesktopUpdates(), checkDesktopUpdates()]);
    expect(mocks.check).toHaveBeenCalledTimes(2);
    expect(close).toHaveBeenCalledTimes(1);
    expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toBeUndefined();
    expect(window.__OPENTU_DESKTOP_UPDATE_CHECK__).toEqual({ status: 'current' });
  });

  it('retries a failed startup check on reconnect and from the menu', async () => {
    mocks.check.mockRejectedValueOnce(new Error('offline')).mockResolvedValue(null);
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    expect(window.__OPENTU_DESKTOP_UPDATE_CHECK__).toEqual({ status: 'error' });
    window.dispatchEvent(new Event('online'));
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_CHECK__).toEqual({ status: 'current' }));
    window.dispatchEvent(new Event('desktop-check-for-updates'));
    await vi.waitFor(() => expect(mocks.check).toHaveBeenCalledTimes(3));
  });

  it('does not replace the installer while downloading or awaiting restart', async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    mocks.relaunch.mockRejectedValue(new Error('restart failed'));
    mocks.check.mockResolvedValue({ version: '1.2.15', download, install: vi.fn().mockResolvedValue(undefined) });
    const { initializeDesktopUpdater, checkDesktopUpdates } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    confirm();
    await checkDesktopUpdates();
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__?.restartOnly).toBe(true));
    await checkDesktopUpdates();
    expect(mocks.check).toHaveBeenCalledTimes(1);
  });

  it('waits for new tasks before installing and reuses the downloaded update', async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    const install = vi.fn().mockResolvedValue(undefined);
    window.__OPENTU_PREPARE_DESKTOP_UPDATE__ = vi.fn().mockRejectedValueOnce(new Error('请等待正在进行的生成任务完成后再更新')).mockResolvedValue(undefined);
    mocks.check.mockResolvedValue({ version: '1.2.15', download, install });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    confirm();
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__?.errorMessage).toContain('生成任务'));
    expect(install).not.toHaveBeenCalled();
    expect(mocks.relaunch).not.toHaveBeenCalled();
    confirm();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(1));
    expect(download).toHaveBeenCalledTimes(1);
    expect(install).toHaveBeenCalledTimes(1);
  });

  it('defers restart when a task begins during installation', async () => {
    const download = vi.fn().mockResolvedValue(undefined);
    const install = vi.fn().mockResolvedValue(undefined);
    window.__OPENTU_PREPARE_DESKTOP_UPDATE__ = vi.fn().mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error('请等待生成任务完成')).mockResolvedValue(undefined);
    mocks.check.mockResolvedValue({ version: '1.2.15', download, install });
    const { initializeDesktopUpdater } = await import('./desktop-updater');
    await initializeDesktopUpdater();
    confirm();
    await vi.waitFor(() => expect(window.__OPENTU_DESKTOP_UPDATE_EVENT__).toMatchObject({ status: 'error', restartOnly: true }));
    expect(mocks.relaunch).not.toHaveBeenCalled();
    confirm();
    await vi.waitFor(() => expect(mocks.relaunch).toHaveBeenCalledTimes(1));
    expect(download).toHaveBeenCalledTimes(1);
    expect(install).toHaveBeenCalledTimes(1);
  });
});
