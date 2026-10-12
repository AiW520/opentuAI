const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const directory = path.resolve(process.argv.find(value => value.startsWith('--assets-dir='))?.slice(13) || '.');
const platforms = ['macos-aarch64', 'macos-x86_64', 'windows-x86_64', 'linux-x86_64', 'linux-aarch64'];
const version = process.env.RELEASE_TAG?.match(/^v(\d+\.\d+\.\d+)-preview\.[1-9]\d*$/)?.[1];
if (!version) throw new Error('A numeric preview RELEASE_TAG is required');
for (const platform of platforms) {
  const manifest = JSON.parse(fs.readFileSync(path.join(directory, `manifest-${platform}.json`), 'utf8'));
  if (manifest.version !== version || manifest.platform !== platform || manifest.commit !== process.env.GITHUB_SHA || manifest.updaterSigned !== true) {
    throw new Error(`Build metadata mismatch: ${platform}`);
  }
  const extensions = platform.startsWith('macos') ? ['.dmg'] : platform.startsWith('windows') ? ['-setup.exe', '.msi'] : ['.AppImage', '.deb'];
  for (const extension of extensions) {
    const name = `Opentu-${version}-${platform}${extension}`;
    const entry = manifest.files.find(file => file.name === name);
    if (!entry) throw new Error(`Installer missing: ${name}`);
    const bytes = fs.readFileSync(path.join(directory, name));
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== entry.size || sha256 !== entry.sha256 || fs.readFileSync(path.join(directory, `${name}.sha256`), 'utf8') !== `${sha256}  ${name}\n`) {
      throw new Error(`Installer checksum mismatch: ${name}`);
    }
  }
}
for (const script of ['verify-updater-signatures.cjs', 'generate-updater-manifest.js']) {
  execFileSync(process.execPath, [path.join(__dirname, script), `--assets-dir=${directory}`], { stdio: 'inherit' });
}
