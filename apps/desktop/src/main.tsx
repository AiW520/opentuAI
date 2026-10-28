import '../../web/src/utils/permissions-policy-fix';
import 'tdesign-react/es/style/css';
import { isTauriEnvironment } from './utils/tauri-api';
import { initializeVirtualUrlInterceptor } from './utils/virtual-url-interceptor';
import { initializeDesktopModelSetup } from './utils/desktop-model-setup';
import { initializeDesktopUpdater } from './utils/desktop-updater';
import { initializeDesktopAnalytics } from './utils/desktop-analytics';
import { initializeDesktopCanvasNavigation } from './utils/canvas-navigation';
import { writeFile } from '@tauri-apps/plugin-fs';

declare const __APP_VERSION__: string;
declare const __OPENTU_DESKTOP_CHANNEL_PROOF__: string;

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
// Keep the build channel visible for packaged-renderer verification and support.
// Request routing reads the same build constant; the optimizer can otherwise
// fold its comparison and remove the literal from the JavaScript bundle.
const channelMeta = document.createElement('meta');
channelMeta.name = 'opentu-desktop-client-channel';
channelMeta.content = __OPENTU_DESKTOP_CHANNEL_PROOF__;
document.head.appendChild(channelMeta);
initializeDesktopAnalytics();

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
  initializeDesktopCanvasNavigation();
  console.log('[Desktop] Early initialize virtual URL interceptor');
  initializeVirtualUrlInterceptor();
}

async function bootstrap() {
  updateBootProgress(30);

  if (isTauriEnvironment()) {
    const [{ setDesktopBinaryWriter }, { setSaveLocationFn }] = await Promise.all([
      import('../../../packages/drawnix/src/utils/desktop-binary-writer'),
      import('../../../packages/drawnix/src/utils/download-utils'),
    ]);
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
        void initializeDesktopUpdater();
        void initializeDesktopModelSetup().catch(() => console.warn('[Desktop] 无法加载模型配置，请在设置中配置 API Key'));
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
