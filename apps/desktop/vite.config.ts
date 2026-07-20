import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { nxViteTsPaths } from '@nx/vite/plugins/nx-tsconfig-paths.plugin';
import path from 'path';
import fs from 'fs';

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

export default defineConfig({
  root: __dirname,
  cacheDir: '../../node_modules/.vite/apps/desktop',
  base: './',

  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
    __APP_VERSION__: JSON.stringify(appVersion),
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
        find: /^\.\.\/web\/src\/(.+)$/,
        replacement: path.resolve(webSrcPath, '$1'),
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

  plugins: [react(), nxViteTsPaths()],
});
