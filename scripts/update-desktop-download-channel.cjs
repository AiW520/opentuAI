const fs = require('node:fs');
const path = require('node:path');
const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const release = JSON.parse(fs.readFileSync(argument('release'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(argument('manifest'), 'utf8'));
const root = path.resolve(__dirname, '../apps/web/public');
const oldRelease = JSON.parse(fs.readFileSync(path.join(root, 'download-release.json'), 'utf8'));
const parse = tag => {
  const match = /^v(\d+)\.(\d+)\.(\d+)-preview\.(\d+)$/.exec(tag);
  if (!match) throw new Error('Invalid preview tag');
  return match.slice(1).map(Number);
};
const next = parse(release.tagName);
const old = parse(oldRelease.tag_name);
for (let i = 0; i < next.length; i++) {
  if (next[i] > old[i]) break;
  if (next[i] < old[i] || i === next.length - 1) throw new Error('Refusing to downgrade or republish the download channel');
}
if (release.isDraft !== false || release.isPrerelease !== true || !release.publishedAt || manifest.version !== next.slice(0, 3).join('.')) {
  throw new Error('Release and update manifest must match a public preview');
}
const assets = release.assets.map(asset => ({ name: asset.name, size: asset.size, browser_download_url: asset.url }));
for (const platform of Object.values(manifest.platforms)) {
  if (!assets.some(asset => asset.browser_download_url === platform.url)) throw new Error('Published updater payload missing');
}
const data = { tag_name: release.tagName, name: release.name, draft: false, prerelease: true, published_at: release.publishedAt, body: release.body, repository_visibility: 'public', assets };
fs.writeFileSync(path.join(root, 'download-release.json'), `${JSON.stringify(data, null, 2)}\n`);
fs.writeFileSync(path.join(root, 'latest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Verified download channel now points to ${release.tagName}`);
