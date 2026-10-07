const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const source = path.join(root, 'apps/web/public');
const output = path.join(root, 'outputs/download-site');
fs.mkdirSync(output, { recursive: true });
for (const name of ['download.html', 'download-release.json', 'desktop-preview.png', 'icons/favicon-32x32.png', 'download-assets/laptop.svg', 'download-assets/monitor.svg', 'download-assets/terminal.svg', 'download-assets/download.svg']) {
  const destination = path.join(output, name);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(path.join(source, name), destination);
}
fs.copyFileSync(path.join(source, 'download.html'), path.join(output, 'index.html'));
console.log(`Download site packaged at ${output}`);
