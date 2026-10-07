const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const target = process.env.BUILD_TARGET;
const platform = process.env.BUILD_PLATFORM;
if (!target || !platform || !/^[a-z0-9-]+$/.test(target + platform)) {
  throw new Error('BUILD_TARGET and BUILD_PLATFORM must identify the built target');
}
const version = JSON.parse(fs.readFileSync(path.join(root, 'apps/desktop/package.json'), 'utf8')).version;
const bundle = path.join(root, 'apps/desktop/src-tauri/target', target, 'release/bundle');
const output = path.join(root, 'outputs/desktop-build');
fs.mkdirSync(output, { recursive: true });
const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.endsWith('.app')) collect(file);
    } else if (/\.(dmg|exe|msi|AppImage|deb)$/.test(entry.name)) {
      files.push(file);
    }
  }
}
collect(bundle);
if (!files.length) throw new Error(`No installers found in ${bundle}`);
const manifest = { version, platform, target, commit: process.env.GITHUB_SHA || null, signed: false, files: [] };
for (const file of files) {
  const extension = path.extname(file);
  const name = `Opentu-${version}-${platform}${extension === '.exe' ? '-setup.exe' : extension}`;
  const bytes = fs.readFileSync(file);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(output, name), bytes);
  fs.writeFileSync(path.join(output, `${name}.sha256`), `${sha256}  ${name}\n`);
  manifest.files.push({ name, size: bytes.length, sha256 });
}
fs.writeFileSync(path.join(output, `manifest-${platform}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(output, 'BUILD-NOTES.txt'),
  'Unsigned verification build. Not notarized. Not a stable release.\n' +
  'macOS/Windows system security prompts may prevent installation.\n' +
  'No stable updater manifest is published by this build.\n');
console.log(`Collected ${manifest.files.length} installers for ${platform} ${version}`);
