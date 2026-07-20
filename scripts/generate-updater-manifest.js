const fs = require('fs');
const path = require('path');

const dir = path.resolve(process.argv.find((value) => value.startsWith('--assets-dir='))?.slice(13) || '.');
const tag = process.env.RELEASE_TAG;
const repository = process.env.GITHUB_REPOSITORY || 'tuziapi/opentu';

if (!tag || !/^v\d+\.\d+\.\d+/.test(tag)) {
  console.error('RELEASE_TAG 必须是语义化版本标签');
  process.exit(1);
}

const mappings = {
  'darwin-aarch64': 'Opentu-macos-aarch64.app.tar.gz',
  'darwin-x86_64': 'Opentu-macos-x86_64.app.tar.gz',
  'windows-x86_64': 'Opentu-windows-x86_64.nsis.zip',
  'linux-x86_64': 'Opentu-linux-x86_64.AppImage',
  'linux-aarch64': 'Opentu-linux-aarch64.AppImage',
};

const platforms = {};
for (const [platform, asset] of Object.entries(mappings)) {
  const payload = path.join(dir, asset);
  const signatureFile = `${payload}.sig`;
  if (!fs.existsSync(payload) || !fs.existsSync(signatureFile)) {
    console.error(`缺少更新资产或签名: ${asset}`);
    process.exit(1);
  }
  const signature = fs.readFileSync(signatureFile, 'utf8').trim();
  if (!signature) {
    console.error(`更新签名为空: ${asset}.sig`);
    process.exit(1);
  }
  platforms[platform] = {
    signature,
    url: `https://github.com/${repository}/releases/download/${tag}/${asset}`,
  };
}

const manifest = {
  version: tag.slice(1),
  notes: `Opentu Desktop ${tag}`,
  pub_date: new Date().toISOString(),
  platforms,
};

fs.writeFileSync(path.join(dir, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`已生成更新清单: ${path.join(dir, 'latest.json')}`);
