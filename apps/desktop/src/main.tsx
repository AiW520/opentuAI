import '../../web/src/utils/permissions-policy-fix';
import { isTauriEnvironment } from './utils/tauri-api';
import { initializeVirtualUrlInterceptor } from './utils/virtual-url-interceptor';
import { initializeDesktopUpdater } from './utils/desktop-updater';
import { writeFile } from '@tauri-apps/plugin-fs';

declare const __APP_VERSION__: string;

// index.html 中的 `%__APP_VERSION__%` 占位符 Vite 不会替换，
// 这里在引导阶段把构建时注入的版本号写回 meta，供菜单读取。
function injectAppVersionMeta() {
  if (typeof document === 'undefined') return;
  const version =
    typeof __APP_VERSION__ === 'string' && __APP_VERSION__
      ? __APP_VERSION__
      : '0.0.0';
  const meta = document.querySelector('meta[name="app-version"]');
  if (meta) {
    meta.setAttribute('content', version);
  } else {
    const created = document.createElement('meta');
    created.setAttribute('name', 'app-version');
    created.setAttribute('content', version);
    document.head.appendChild(created);
  }
}

injectAppVersionMeta();

function updateBootProgress(progress: number) {
  const fill = document.getElementById('boot-progress-fill');
  const value = document.getElementById('boot-progress-value');
  if (fill) fill.style.width = `${progress}%`;
  if (value) value.textContent = `${progress}%`;
}

function hideBootScreen() {
  const bootRoot = document.getElementById('app-boot-loading');
  if (!bootRoot) return;

  bootRoot.classList.add('is-leaving');
  setTimeout(() => {
    bootRoot.parentNode?.removeChild(bootRoot);
  }, 360);
}

if (isTauriEnvironment()) {
  console.log('[Desktop] Early initialize virtual URL interceptor');
  initializeVirtualUrlInterceptor();
}

async function bootstrap() {
  updateBootProgress(30);

  if (isTauriEnvironment()) {
    const { setDesktopBinaryWriter, setSaveLocationFn } = await import(
      '@drawnix/drawnix'
    );
    setDesktopBinaryWriter(async (path, payload) => {
      const data =
        payload instanceof Blob && typeof payload.stream === 'function'
          ? payload.stream()
          : payload instanceof Blob
          ? new Uint8Array(await payload.arrayBuffer())
          : payload;
      await writeFile(path, data);
    });
    setSaveLocationFn(async (path: string, data: Uint8Array) => {
      await writeFile(path, data);
    });
  }

  updateBootProgress(60);

  import('@web/app/bootstrap')
    .then(() => {
      updateBootProgress(100);

      if (isTauriEnvironment()) {
        initializeVirtualUrlInterceptor();
        window.setTimeout(() => {
          void initializeDesktopUpdater();
        }, 3000);
      }

      setTimeout(hideBootScreen, 200);
    })
    .catch((error) => {
      console.error('[Desktop] Failed to load app bootstrap:', error);
      updateBootProgress(100);
      const tip = document.querySelector('.app-boot-tip');
      if (tip) tip.textContent = '启动失败，请重启应用';
    });
}

bootstrap();
