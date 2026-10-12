const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
const target = process.env.BUILD_TARGET;
const platform = process.env.BUILD_PLATFORM;
if (!target || !platform || !/^[a-z0-9_-]+$/.test(target + platform)) {
  throw new Error('BUILD_TARGET and BUILD_PLATFORM must identify the built target');
}
const version = JSON.parse(fs.readFileSync(path.join(root, 'apps/desktop/package.json'), 'utf8')).version;
const bundleArgument = process.argv.find((value) => value.startsWith('--bundle-dir='))?.slice(13);
const bundle = bundleArgument ? path.resolve(bundleArgument) : path.join(root, 'apps/desktop/src-tauri/target', target, 'release/bundle');
const output = path.join(root, 'outputs/desktop-build');
const updaterSigned = process.env.OPENTU_UPDATER_ENABLED === '1';
fs.mkdirSync(output, { recursive: true });
const files = [];
function collect(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.endsWith('.app')) collect(file);
    } else if (entry.name.includes(version) && /\.(dmg|exe|msi|AppImage|deb)$/.test(entry.name)) {
      files.push(file);
    }
  }
}
collect(bundle);
if (!files.length) throw new Error(`No installers found in ${bundle}`);
const manifest = { version, platform, target, commit: process.env.GITHUB_SHA || null, signed: false, updaterSigned, files: [] };
for (const file of files) {
  const extension = path.extname(file);
  const name = `Opentu-${version}-${platform}${extension === '.exe' ? '-setup.exe' : extension}`;
  const bytes = fs.readFileSync(file);
  const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
  fs.writeFileSync(path.join(output, name), bytes);
  fs.writeFileSync(path.join(output, `${name}.sha256`), `${sha256}  ${name}\n`);
  manifest.files.push({ name, size: bytes.length, sha256 });
}
if (updaterSigned) {
  const payloads = [];
  function findUpdater(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.endsWith('.app')) findUpdater(file);
      } else if (/\.(app\.tar\.gz|nsis\.zip|AppImage\.tar\.gz)$/.test(entry.name)) payloads.push(file);
    }
  }
  findUpdater(bundle);
  const extension = platform.startsWith('macos-') ? '.app.tar.gz' : platform.startsWith('windows-') ? '.nsis.zip' : '.AppImage.tar.gz';
  const matching = payloads.filter(file => file.endsWith(extension));
  if (matching.length !== 1) throw new Error(`Expected one updater payload for ${platform}, got ${matching.length}`);
  const payload = matching[0];
  const name = `Opentu-${platform}${extension}`;
  if (!fs.existsSync(`${payload}.sig`)) throw new Error(`Missing updater signature: ${payload}`);
  fs.copyFileSync(payload, path.join(output, name));
  fs.copyFileSync(`${payload}.sig`, path.join(output, `${name}.sig`));
  if (platform.startsWith('linux-')) {
    const debs = files.filter(file => file.endsWith('.deb'));
    if (debs.length !== 1 || !fs.existsSync(`${debs[0]}.sig`)) throw new Error(`Expected one signed Debian updater for ${platform}`);
    fs.copyFileSync(debs[0], path.join(output, `Opentu-${platform}.deb`));
    fs.copyFileSync(`${debs[0]}.sig`, path.join(output, `Opentu-${platform}.deb.sig`));
  }
}
fs.writeFileSync(path.join(output, `manifest-${platform}.json`), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(output, 'BUILD-NOTES.txt'),
  (updaterSigned ? 'Update-signed preview build. Platform code signing is not configured.\n' : 'Unsigned verification build.\n') +
  'Not notarized. Not a stable release.\n' +
  'macOS/Windows system security prompts may prevent installation.\n' +
  (updaterSigned ? 'Signed preview updater assets are included.\n' : 'No stable updater manifest is published by this build.\n'));
console.log(`Collected ${manifest.files.length} installers for ${platform} ${version}`);
