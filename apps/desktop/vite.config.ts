import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';
import fs from 'fs';
import { assertExpectedChannel, resolveDesktopClientChannel } from '../../scripts/desktop-client-channel.cjs';
import { workflowAssetsPlugin } from '../web/workflow-assets-plugin';

const workspaceRoot = path.resolve(__dirname, '../..');
const webSrcPath = path.resolve(workspaceRoot, 'apps/web/src');
const tauriConfigPath = path.resolve(__dirname, 'src-tauri/tauri.conf.json');
const packageJsonPath = path.resolve(__dirname, 'package.json');

function readDesktopVersion(): string {
  for (const filePath of [tauriConfigPath, packageJsonPath]) {
    try {
      if (!fs.existsSync(filePath)) continue;
      const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (typeof content.version === 'string' && content.version.trim()) {
        return content.version;
      }
    } catch (error) {
      console.warn('[Desktop Vite] Failed to read version from', filePath, error);
    }
  }
  return '0.0.0';
}

const appVersion = readDesktopVersion();
const qrAssets = ['logo/opentu-community-qr.png', 'logo/opentu-support-qr.png'];

export default defineConfig(({ command }) => {
  const desktopClientChannel = resolveDesktopClientChannel({
    command,
    profile: process.env.OPENTU_DESKTOP_RELEASE_PROFILE,
    updaterEnabled: process.env.OPENTU_UPDATER_ENABLED,
    signingKeyPresent: Boolean(process.env.TAURI_SIGNING_PRIVATE_KEY),
    nodeEnv: process.env.NODE_ENV,
  });
  if (process.env.OPENTU_DESKTOP_CHANNEL_EXPECTED) {
    assertExpectedChannel(desktopClientChannel, process.env.OPENTU_DESKTOP_CHANNEL_EXPECTED);
  }
  return {
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/desktop',
  base: './',

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    __APP_VERSION__: JSON.stringify(appVersion),
    __OPENTU_DESKTOP_CHANNEL_PROOF__: JSON.stringify(`opentu-desktop-client-channel:${desktopClientChannel}`),
    'import.meta.env.VITE_TUZI_EMBEDDED_MODE': JSON.stringify('false'),
    'import.meta.env.VITE_OPENTU_DESKTOP': JSON.stringify('true'),
    'import.meta.env.VITE_OPENTU_SIGNED_UPDATER': JSON.stringify(process.env.OPENTU_UPDATER_ENABLED === '1' ? 'true' : 'false'),
    __VUE_OPTIONS_API__: JSON.stringify(false),
    __VUE_PROD_DEVTOOLS__: JSON.stringify(false),
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: JSON.stringify(false),
  },

  server: {
    port: 7201,
    host: 'localhost',
    strictPort: true,
  },

  resolve: {
    alias: [
      {
        find: /^@\/(.+)$/,
        replacement: path.resolve(workspaceRoot, 'packages/drawnix/src/workflow-mode/web/src/$1'),
      },
      {
        find: '@web',
        replacement: webSrcPath,
      },
    ],
    dedupe: ['react', 'react-dom'],
  },

  build: {
    outDir: 'dist',
    emptyOutDir: true,
    reportCompressedSize: true,
    modulePreload: false,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
        },
      },
    },
  },

  worker: { format: 'es' },
  plugins: [react(), nxViteTsPaths(), workflowAssetsPlugin(), {
    name: 'desktop-qr-assets',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].replace(/^\//, '');
        if (!name || !qrAssets.includes(name)) return next();
        res.setHeader('Content-Type', 'image/png');
        res.end(fs.readFileSync(path.join(workspaceRoot, 'apps/web/public', name)));
      });
    },
    generateBundle() {
      for (const fileName of qrAssets) this.emitFile({
        type: 'asset', fileName,
        source: fs.readFileSync(path.join(workspaceRoot, 'apps/web/public', fileName)),
      });
    },
  }, {
    name: 'desktop-client-channel-proof',
    generateBundle() {
      this.emitFile({
        type: 'asset', fileName: 'opentu-client-channel.json',
        source: JSON.stringify({ appVersion, profile: process.env.OPENTU_DESKTOP_RELEASE_PROFILE || 'local', channel: desktopClientChannel }) + '\n',
      });
    },
  }],
  };
});
