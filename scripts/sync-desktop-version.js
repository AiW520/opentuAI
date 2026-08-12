const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SEMVER = /^v?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;
const CHECK_ONLY = process.argv.includes('--check');
const input = process.argv.find((value) => value.startsWith('--tag='))?.slice(6)
  || process.env.RELEASE_TAG
  || process.env.GITHUB_REF_NAME;

if (!input || !SEMVER.test(input)) {
  console.error(`无效的发布标签: ${input || '(empty)'}，必须是 v1.2.3 形式的语义化版本`);
  process.exit(1);
}

const version = input.replace(/^v/, '');
const jsonFiles = [
  'package.json',
  'apps/desktop/package.json',
  'apps/desktop/src-tauri/tauri.conf.json',
];
const cargoFile = 'apps/desktop/src-tauri/Cargo.toml';
const cargoLockFile = 'apps/desktop/src-tauri/Cargo.lock';

function replaceCargoPackageVersion(content) {
  const packagePattern = /(^\[\[package\]\]\nname = "opentu"\nversion = ")[^"]+("$)/m;
  if (!packagePattern.test(content)) {
    console.error(`未在 ${cargoLockFile} 中找到 opentu 包版本`);
    process.exit(1);
  }
  return content.replace(packagePattern, `$1${version}$2`);
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, relativePath), 'utf8'));
}

function currentVersions() {
  const versions = Object.fromEntries(
    jsonFiles.map((relativePath) => [relativePath, readJson(relativePath).version])
  );
  const cargo = fs.readFileSync(path.join(ROOT, cargoFile), 'utf8');
  versions[cargoFile] = cargo.match(/^version\s*=\s*"([^"]+)"/m)?.[1];
  const cargoLock = fs.readFileSync(path.join(ROOT, cargoLockFile), 'utf8');
  versions[cargoLockFile] = cargoLock.match(/^\[\[package\]\]\nname = "opentu"\nversion = "([^"]+)"/m)?.[1];
  return versions;
}

if (!CHECK_ONLY) {
  for (const relativePath of jsonFiles) {
    const absolutePath = path.join(ROOT, relativePath);
    const json = readJson(relativePath);
    json.version = version;
    fs.writeFileSync(absolutePath, `${JSON.stringify(json, null, 2)}\n`);
  }

  const cargoPath = path.join(ROOT, cargoFile);
  const cargo = fs.readFileSync(cargoPath, 'utf8');
  fs.writeFileSync(cargoPath, cargo.replace(/^version\s*=\s*"[^"]+"/m, `version = "${version}"`));

  const cargoLockPath = path.join(ROOT, cargoLockFile);
  const cargoLock = fs.readFileSync(cargoLockPath, 'utf8');
  fs.writeFileSync(cargoLockPath, replaceCargoPackageVersion(cargoLock));
}

const mismatches = Object.entries(currentVersions()).filter(([, value]) => value !== version);
if (mismatches.length > 0) {
  console.error(`版本不一致，期望 ${version}:`);
  for (const [file, value] of mismatches) console.error(`- ${file}: ${value || '(missing)'}`);
  process.exit(1);
}

console.log(`${CHECK_ONLY ? '版本校验通过' : '桌面版本已同步'}: ${version}`);
