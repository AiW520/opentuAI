import { isTauriEnvironment } from './tauri-api';
import {
  publishDesktopUpdate,
  type DesktopUpdateState,
} from '../../../../packages/drawnix/src/utils/desktop-update-state';

let initialized = false;

export async function initializeDesktopUpdater(): Promise<void> {
  if (!isTauriEnvironment() || initialized) return;
  initialized = true;

  try {
    const [{ check }, { relaunch }] = await Promise.all([
      import('@tauri-apps/plugin-updater'),
      import('@tauri-apps/plugin-process'),
    ]);
    const update = await check();
    if (!update) return;

    window.__OPENTU_DESKTOP_UPDATER_ACTIVE__ = true;
    const available: DesktopUpdateState = {
      version: update.version,
      desktop: true,
      status: 'ready',
      changelog: update.body?.split(/\r?\n/).filter(Boolean),
    };
    let busy = false;
    let installed = false;

    const install = async () => {
      if (busy) return;
      busy = true;
      try {
        if (!installed) {
          publishDesktopUpdate({ ...available, status: 'downloading' });
          let total: number | undefined;
          let received = 0;
          await update.downloadAndInstall((event) => {
            if (event.event === 'Started') {
              total = event.data.contentLength;
              received = 0;
            } else if (event.event === 'Progress') {
              received += event.data.chunkLength;
            } else if (event.event === 'Finished') {
              publishDesktopUpdate({ ...available, status: 'installing' });
              return;
            }
            publishDesktopUpdate({
              ...available,
              status: 'downloading',
              progress: total ? Math.min(100, Math.floor(received / total * 100)) : undefined,
            });
          });
          installed = true;
        }
        publishDesktopUpdate({ ...available, status: 'restarting' });
        await relaunch();
        window.removeEventListener('user-confirmed-upgrade', install);
      } catch (error) {
        console.error('[Desktop Updater] 安装更新失败:', error);
        publishDesktopUpdate({ ...available, status: 'error', restartOnly: installed });
      } finally {
        busy = false;
      }
    };
    window.addEventListener('user-confirmed-upgrade', install);
    publishDesktopUpdate(available);
  } catch (error) {
    // 普通本地构建未启用签名 updater 时应静默降级，不展示虚假的更新能力。
    window.__OPENTU_DESKTOP_UPDATER_ACTIVE__ = false;
    console.info('[Desktop Updater] 当前构建未启用签名自动更新:', error);
  }
}
