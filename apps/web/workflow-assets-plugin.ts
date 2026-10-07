import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function workflowAssetsPlugin(): Plugin {
  const sourceDir = path.resolve(
    __dirname,
    '../../packages/drawnix/src/workflow-mode/web/public'
  );
  const files = (dir: string, prefix = ''): string[] => {
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const relative = path.join(prefix, entry.name);
      return entry.isDirectory()
        ? files(path.join(dir, entry.name), relative)
        : [relative];
    });
  };
  const pluginManifest = () => JSON.stringify(
    files(path.join(sourceDir, 'plugins'))
      .filter((file) => file.endsWith('.js') && !file.includes(path.sep))
      .sort()
      .map((file) => `/workflow-assets/plugins/${file}`)
  );
  return {
    name: 'opentu-workflow-assets',
    configureServer(server) {
      server.middlewares.use('/workflow-assets', (req, res, next) => {
        let relative: string;
        try {
          relative = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname).replace(/^\//, '');
        } catch {
          res.statusCode = 400;
          return res.end();
        }
        if (relative === 'plugins/index.json') {
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Content-Type', 'application/json');
          return res.end(pluginManifest());
        }
        const file = path.resolve(sourceDir, relative);
        const fromSource = path.relative(sourceDir, file);
        if (fromSource === '..' || fromSource.startsWith(`..${path.sep}`) || path.isAbsolute(fromSource) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) return next();
        res.setHeader('Cache-Control', 'no-cache');
        const types: Record<string, string> = {
          '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
          '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
          '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css',
        };
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.end(fs.readFileSync(file));
      });
    },
    generateBundle() {
      for (const relative of files(sourceDir)) {
        if (relative === path.join('plugins', 'index.json')) continue;
        this.emitFile({ type: 'asset', fileName: `workflow-assets/${relative.replaceAll(path.sep, '/')}`, source: fs.readFileSync(path.join(sourceDir, relative)) });
      }
      this.emitFile({ type: 'asset', fileName: 'workflow-assets/plugins/index.json', source: pluginManifest() });
    },
  };
}
