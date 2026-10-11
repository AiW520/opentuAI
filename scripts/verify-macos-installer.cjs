const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

if (process.platform !== 'darwin') throw new Error('macOS is required to verify DMG installers');
const bundle = process.argv[2];
if (!bundle) throw new Error('Usage: node scripts/verify-macos-installer.cjs <bundle-directory>');
const directory = path.resolve(bundle);
const run = (command, args) => execFileSync(command, args, { stdio: 'inherit' });
const verify = (app) => run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
verify(path.join(directory, 'macos', 'Opentu.app'));
const images = fs.readdirSync(path.join(directory, 'dmg')).filter((name) => name.endsWith('.dmg'));
if (images.length !== 1) throw new Error(`Expected one DMG, found ${images.length}`);
const mount = fs.mkdtempSync(path.join(os.tmpdir(), 'opentu-dmg-verify-'));
let attached = false;
try {
  run('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount,
    path.join(directory, 'dmg', images[0])]);
  attached = true;
  verify(path.join(mount, 'Opentu.app'));
  console.log('Application and DMG bundle signatures are valid (not a notarization check).');
} finally {
  if (attached) run('hdiutil', ['detach', mount]);
  fs.rmSync(mount, { recursive: true, force: true });
}
