const fs = require('node:fs');
const path = require('node:path');
const { createPublicKey, verify } = require('node:crypto');
const { blake2b } = require('@noble/hashes/blake2b');

function verifyUpdaterSignature(payload, signature, publicKey) {
  // Tauri encodes the standard Minisign public key and four-line signature.
  const keyLines = Buffer.from(publicKey.trim(), 'base64').toString('utf8').trim().split(/\r?\n/);
  const lines = Buffer.from(signature.trim(), 'base64').toString('utf8').trim().split(/\r?\n/);
  const key = Buffer.from(keyLines[1] || '', 'base64');
  const signed = Buffer.from(lines[1] || '', 'base64');
  const globalSignature = Buffer.from(lines[3] || '', 'base64');
  if (key.length !== 42 || signed.length !== 74 || globalSignature.length !== 64 ||
      !lines[2]?.startsWith('trusted comment: ') || key.subarray(0, 2).toString() !== 'Ed' ||
      !signed.subarray(2, 10).equals(key.subarray(2, 10))) {
    throw new Error('Invalid updater signature or public key');
  }
  const algorithm = signed.subarray(0, 2).toString();
  if (!['Ed', 'ED'].includes(algorithm)) throw new Error('Unsupported signature algorithm');
  const publicObject = createPublicKey({
    key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), key.subarray(10)]),
    format: 'der',
    type: 'spki',
  });
  const detached = signed.subarray(10);
  const data = algorithm === 'ED' ? blake2b(payload, { dkLen: 64 }) : payload;
  const comment = Buffer.from(lines[2].slice('trusted comment: '.length));
  if (!verify(null, data, publicObject, detached) ||
      !verify(null, Buffer.concat([detached, comment]), publicObject, globalSignature)) {
    throw new Error('Updater signature verification failed');
  }
}

if (require.main === module) {
  const directory = path.resolve(process.argv.find(value => value.startsWith('--assets-dir='))?.slice(13) || '.');
  const publicKey = process.env.TAURI_UPDATER_PUBLIC_KEY;
  if (!publicKey) throw new Error('TAURI_UPDATER_PUBLIC_KEY is required');
  const assets = [
    'Opentu-macos-aarch64.app.tar.gz',
    'Opentu-macos-x86_64.app.tar.gz',
    'Opentu-windows-x86_64.nsis.zip',
    'Opentu-linux-x86_64.AppImage',
    'Opentu-linux-aarch64.AppImage',
  ];
  for (const asset of assets) {
    verifyUpdaterSignature(
      fs.readFileSync(path.join(directory, asset)),
      fs.readFileSync(path.join(directory, `${asset}.sig`), 'utf8').trim(),
      publicKey
    );
    console.log(`Verified updater signature: ${asset}`);
  }
}

module.exports = { verifyUpdaterSignature };
