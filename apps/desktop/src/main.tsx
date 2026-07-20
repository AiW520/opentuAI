import '../../web/src/utils/permissions-policy-fix';
import { isTauriEnvironment } from './utils/tauri-api';
import { initializeVirtualUrlInterceptor } from './utils/virtual-url-interceptor';
import { initializeDesktopUpdater } from './utils/desktop-updater';

declare const __APP_VERSION__: string;

const DESKTOP_WRITE_CHUNK_BYTES = 1024 * 1024;

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

async function writeDataToPathInChunks(path: string, data: Uint8Array) {
  if (data.byteLength === 0) {
    await (window as any).__TAURI_INTERNALS__.invoke(
      'write_file_chunk_to_path',
      {
        savePath: path,
        buffer: [],
        append: false,
      }
    );
    return;
  }

  for (
    let offset = 0;
    offset < data.byteLength;
    offset += DESKTOP_WRITE_CHUNK_BYTES
  ) {
    const chunk = data.subarray(offset, offset + DESKTOP_WRITE_CHUNK_BYTES);
    await (window as any).__TAURI_INTERNALS__.invoke(
      'write_file_chunk_to_path',
      {
        savePath: path,
        buffer: Array.from(chunk),
        append: offset > 0,
      }
    );
  }
}

if (isTauriEnvironment()) {
  console.log('[Desktop] Early initialize virtual URL interceptor');
  initializeVirtualUrlInterceptor();
}

async function bootstrap() {
  updateBootProgress(30);

  if (isTauriEnvironment()) {
    const { setSaveLocationFn } = await import('@drawnix/drawnix');
    setSaveLocationFn(async (path: string, data: Uint8Array) => {
      await writeDataToPathInChunks(path, data);
    });
  }

  updateBootProgress(60);

  import('../../web/src/app/bootstrap')
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
