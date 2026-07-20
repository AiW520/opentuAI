import { isTauriEnvironment } from './tauri-api';

declare global {
  interface Window {
    __OPENTU_DESKTOP_UPDATER_ACTIVE__?: boolean;
  }
}

export async function initializeDesktopUpdater(): Promise<void> {
  if (!isTauriEnvironment()) return;

  try {
    const [{ check }, { relaunch }] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-process'),
    ]);
    const update = await check();
    if (!update) return;

    window.__OPENTU_DESKTOP_UPDATER_ACTIVE__ = true;
    window.dispatchEvent(
      new CustomEvent('sw-update-available', {
        detail: { version: update.version, desktop: true },
      })
    );

    const install = async () => {
      window.removeEventListener('user-confirmed-upgrade', install);
      try {
        await update.downloadAndInstall();
        await relaunch();
      } catch (error) {
        console.error('[Desktop Updater] 安装更新失败:', error);
        window.__OPENTU_DESKTOP_UPDATER_ACTIVE__ = false;
      }
    };
    window.addEventListener('user-confirmed-upgrade', install);
  } catch (error) {
    // 普通本地构建未启用签名 updater 时应静默降级，不展示虚假的更新能力。
    window.__OPENTU_DESKTOP_UPDATER_ACTIVE__ = false;
    console.info('[Desktop Updater] 当前构建未启用签名自动更新:', error);
  }
}
