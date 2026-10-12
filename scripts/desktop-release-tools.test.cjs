const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const { blake2b } = require('@noble/hashes/blake2b');
const { verifyUpdaterSignature } = require('./verify-updater-signatures.cjs');

function signingFixture() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  const keyId = crypto.randomBytes(8);
  const rawPublic = publicKey.export({ format: 'der', type: 'spki' }).subarray(-32);
  const key = Buffer.concat([Buffer.from('Ed'), keyId, rawPublic]);
  const pubkey = Buffer.from(`untrusted comment: test public key\n${key.toString('base64')}\n`).toString('base64');
  const sign = payload => {
    const detached = crypto.sign(null, blake2b(payload, { dkLen: 64 }), privateKey);
    const signed = Buffer.concat([Buffer.from('ED'), keyId, detached]);
    const comment = Buffer.from('test fixture');
    const globalSignature = crypto.sign(null, Buffer.concat([detached, comment]), privateKey);
    return Buffer.from(`untrusted comment: test\n${signed.toString('base64')}\ntrusted comment: ${comment}\n${globalSignature.toString('base64')}\n`).toString('base64');
  };
  return { pubkey, sign };
}

test('verifies updater integrity and rejects tampered data, comments and keys', () => {
  const fixture = signingFixture();
  const bytes = Buffer.from('signed installer');
  const signature = fixture.sign(bytes);
  verifyUpdaterSignature(bytes, signature, fixture.pubkey);
  assert.throws(() => verifyUpdaterSignature(Buffer.from('tampered'), signature, fixture.pubkey));
  const tampered = Buffer.from(Buffer.from(signature, 'base64').toString().replace('test fixture', 'fake fixture')).toString('base64');
  assert.throws(() => verifyUpdaterSignature(bytes, tampered, fixture.pubkey));
  assert.throws(() => verifyUpdaterSignature(bytes, signature, signingFixture().pubkey));
});

test('publishes a manifest only after all platforms, commits, checksums and signatures pass', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'opentu-preview-test-'));
  try {
    const { pubkey, sign } = signingFixture();
    const targets = {
      'macos-aarch64': '.app.tar.gz', 'macos-x86_64': '.app.tar.gz',
      'windows-x86_64': '.nsis.zip', 'linux-x86_64': '.AppImage.tar.gz', 'linux-aarch64': '.AppImage.tar.gz',
    };
    for (const [platform, extension] of Object.entries(targets)) {
      const bytes = Buffer.from(platform);
      fs.writeFileSync(path.join(directory, `Opentu-${platform}${extension}`), bytes);
      fs.writeFileSync(path.join(directory, `Opentu-${platform}${extension}.sig`), sign(bytes));
      if (platform.startsWith('linux-')) {
        fs.writeFileSync(path.join(directory, `Opentu-${platform}.deb`), bytes);
        fs.writeFileSync(path.join(directory, `Opentu-${platform}.deb.sig`), sign(bytes));
      }
      const extensions = platform.startsWith('macos') ? ['.dmg'] : platform.startsWith('windows') ? ['-setup.exe', '.msi'] : ['.AppImage', '.deb'];
      const files = extensions.map(ext => {
        const name = `Opentu-1.2.14-${platform}${ext}`;
        const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
        fs.writeFileSync(path.join(directory, name), bytes);
        fs.writeFileSync(path.join(directory, `${name}.sha256`), `${sha256}  ${name}\n`);
        return { name, size: bytes.length, sha256 };
      });
      fs.writeFileSync(path.join(directory, `manifest-${platform}.json`), JSON.stringify({ version: '1.2.14', platform, commit: 'fixture-commit', updaterSigned: true, files }));
    }
    const run = () => execFileSync(process.execPath, [path.join(__dirname, 'prepare-desktop-preview.cjs'), `--assets-dir=${directory}`], {
      env: { ...process.env, TAURI_UPDATER_PUBLIC_KEY: pubkey, RELEASE_TAG: 'v1.2.14-preview.1', GITHUB_SHA: 'fixture-commit', GITHUB_REPOSITORY: 'AiW520/opentuAI' }, stdio: 'pipe',
    });
    run();
    const manifest = JSON.parse(fs.readFileSync(path.join(directory, 'latest.json'), 'utf8'));
    assert.equal(manifest.version, '1.2.14');
    assert.equal(Object.keys(manifest.platforms).length, 7);
    assert.match(manifest.platforms['windows-x86_64'].url, /v1\.2\.14-preview\.1\/Opentu-windows-x86_64\.nsis\.zip$/);
    assert.match(manifest.platforms['linux-aarch64-deb'].url, /\/Opentu-linux-aarch64\.deb$/);
    assert.match(manifest.platforms['linux-aarch64'].url, /\.AppImage\.tar\.gz$/);
    fs.writeFileSync(path.join(directory, 'Opentu-linux-aarch64.deb'), 'corrupt');
    assert.throws(run);
    fs.writeFileSync(path.join(directory, 'Opentu-linux-aarch64.deb'), Buffer.from('linux-aarch64'));
    fs.writeFileSync(path.join(directory, 'Opentu-1.2.14-macos-aarch64.dmg'), 'corrupt');
    assert.throws(run);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
