const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
for (const name of ['opentu-community-qr.png', 'opentu-support-qr.png']) {
  const expected = fs.readFileSync(path.join(root, 'apps/web/public/logo', name));
  const actual = fs.readFileSync(path.join(root, 'apps/desktop/dist/logo', name));
  if (!actual.equals(expected)) throw new Error(`Desktop QR asset differs: ${name}`);
}
if (fs.existsSync(path.join(root, 'apps/desktop/dist/sw.js'))) throw new Error('Web service worker must not be packaged in desktop');
console.log('Desktop QR assets match their sources; no Web service worker packaged.');
