const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { checkMacSigning } = require('./check-macos-signing.cjs');
const { verifyApp, verifyInstaller } = require('./verify-macos-installer.cjs');

const options = { trusted: true, team: 'ABC1234567', arch: 'arm64' };
const secrets = {
  APPLE_CERTIFICATE: 'test-certificate', APPLE_CERTIFICATE_PASSWORD: 'test-p12-secret',
  APPLE_SIGNING_IDENTITY: 'Developer ID Application: Test Company (ABC1234567)',
  APPLE_ID: 'test@example.invalid', APPLE_PASSWORD: 'test-notary-secret', APPLE_TEAM_ID: options.team,
};
const metadata = [
  'CodeDirectory v=20500 size=100 flags=0x10000(runtime) hashes=1+3',
  `Authority=${secrets.APPLE_SIGNING_IDENTITY}`, `TeamIdentifier=${options.team}`,
  'Timestamp=Oct 28, 2026 at 1:00:00 PM', 'CDHash=abcdef1234567890',
].join('\n');

function runner(overrides = {}) {
  const calls = [];
  const execute = (command, args) => {
    calls.push({ command, args });
    if (overrides.execute) {
      const result = overrides.execute(command, args);
      if (result !== undefined) return result;
    }
    if (command === 'codesign' && args[0] === '--display') return overrides.metadata ?? metadata;
    if (command.endsWith('PlistBuddy')) return 'opentu';
    if (command === 'lipo') return overrides.arch ?? 'arm64';
    if (command === 'spctl' && args[0] === '--status') return overrides.status ?? 'assessments enabled';
    if (command === 'spctl') return overrides.assessment ?? 'accepted\nsource=Notarized Developer ID';
    return '';
  };
  return { execute, calls };
}

test('release preflight rejects missing credentials without printing secret values', () => {
  for (const name of Object.keys(secrets)) {
    const env = { ...secrets, [name]: '' };
    assert.throws(() => checkMacSigning(env), (error) => {
      assert.match(error.message, new RegExp(name));
      assert.ok(!error.message.includes(secrets.APPLE_PASSWORD));
      assert.ok(!error.message.includes(secrets.APPLE_CERTIFICATE_PASSWORD));
      return true;
    });
  }
  for (const identity of ['-', 'Apple Development: Test (ABC1234567)', 'Developer ID Application: Test (ZZZ1234567)']) {
    assert.throws(() => checkMacSigning({ ...secrets, APPLE_SIGNING_IDENTITY: identity }), /Developer ID Application/);
  }
  assert.deepEqual(checkMacSigning(secrets), { signingIdentity: secrets.APPLE_SIGNING_IDENTITY, hardenedRuntime: true });
});

test('release overlay replaces ad-hoc signing only when trusted signing is required', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'opentu-config-test-'));
  const target = path.join(directory, 'release.json');
  const env = { ...process.env, ...secrets, TAURI_UPDATER_PUBLIC_KEY: 'test-public-key',
    OPENTU_DESKTOP_RELEASE_PROFILE: 'preview', OPENTU_MACOS_NOTARIZATION_REQUIRED: '1' };
  const generate = () => spawnSync(process.execPath, [path.join(__dirname, 'prepare-tauri-release-config.js'), `--output=${target}`], { env, encoding: 'utf8' });
  try {
    assert.equal(generate().status, 0);
    assert.deepEqual(JSON.parse(fs.readFileSync(target)).bundle.macOS, checkMacSigning(secrets));
    fs.unlinkSync(target);
    env.APPLE_PASSWORD = '';
    assert.notEqual(generate().status, 0);
    assert.equal(fs.existsSync(target), false, 'failed preflight must not emit a release config');
    env.OPENTU_MACOS_NOTARIZATION_REQUIRED = '0';
    env.OPENTU_WINDOWS_SIGN_COMMAND = 'test-sign %1';
    assert.equal(generate().status, 0);
    const config = JSON.parse(fs.readFileSync(target));
    assert.equal(config.bundle.macOS, undefined);
    assert.deepEqual(config.bundle.windows, { signCommand: 'test-sign %1' });
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

test('trusted verifier rejects ad-hoc signing, wrong teams, missing runtime and missing timestamp', () => {
  const invalid = [
    [metadata.replace(/^Authority=.*$/m, 'Signature=adhoc'), /Developer ID/],
    [metadata.replace('TeamIdentifier=ABC1234567', 'TeamIdentifier=ZZZ1234567'), /expected Apple team/],
    [metadata.replace('0x10000(runtime)', '0x0(none)'), /hardened runtime/],
    [metadata.replace(/^Timestamp=.*$/m, ''), /timestamp/],
  ];
  for (const [value, expected] of invalid) {
    assert.throws(() => verifyApp('/test/Opentu.app', options, runner({ metadata: value }).execute), expected);
  }
});

test('trusted verifier rejects incorrect architecture, missing tickets and Gatekeeper overrides', () => {
  assert.throws(() => verifyApp('/test/Opentu.app', options, runner({ arch: 'x86_64' }).execute), /architecture/);
  assert.throws(() => verifyApp('/test/Opentu.app', options, runner({ execute(command) {
    if (command === 'xcrun') throw new Error('ticket missing');
  } }).execute), /ticket missing/);
  for (const assessment of ['accepted\noverride=security disabled', 'accepted\nsource=Developer ID',
    'accepted\nsource=Notarized Developer ID\noverride=local rule']) {
    assert.throws(() => verifyApp('/test/Opentu.app', options, runner({ assessment }).execute), /Gatekeeper/);
  }
  assert.equal(verifyApp('/test/Opentu.app', options, runner().execute), 'abcdef1234567890');
});

test('disabled Gatekeeper is not a successful release validation', () => {
  const stub = runner({ status: 'assessments disabled' });
  assert.throws(() => verifyInstaller('/unused', options, stub.execute), /Gatekeeper is disabled/);
  assert.equal(stub.calls.length, 1);
  assert.throws(() => verifyInstaller('/unused', { trusted: true }, stub.execute), /requires --team/);
});

test('validates delivered DMG and updater applications, detaching the DMG after failures', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'opentu-bundle-test-'));
  fs.mkdirSync(path.join(directory, 'macos'));
  fs.mkdirSync(path.join(directory, 'dmg'));
  fs.writeFileSync(path.join(directory, 'dmg', 'test.dmg'), 'fixture');
  fs.writeFileSync(path.join(directory, 'macos', 'Opentu.app.tar.gz'), 'fixture');
  try {
    for (const failAt of [null, 'DMG', 'Updater', 'ticket']) {
      const stub = runner({ execute(command, args) {
        const app = args.at(-1) || '';
        if (command === 'codesign' && args[0] === '--display' &&
            ((failAt === 'DMG' && app.includes('opentu-dmg-verify-')) ||
             (failAt === 'Updater' && app.includes('opentu-updater-verify-')))) {
          return metadata.replace('abcdef1234567890', '9876543210abcdef');
        }
        if (failAt === 'ticket' && command === 'xcrun' && app.includes('opentu-dmg-verify-')) throw new Error('DMG ticket missing');
      } });
      if (failAt) assert.throws(() => verifyInstaller(directory, options, stub.execute), new RegExp(failAt === 'ticket' ? 'ticket missing' : `${failAt} application signature differs`));
      else verifyInstaller(directory, options, stub.execute);
      const attach = stub.calls.find(({ command, args }) => command === 'hdiutil' && args[0] === 'attach');
      const mount = attach.args[4];
      assert.ok(stub.calls.some(({ command, args }) => command === 'hdiutil' && args[0] === 'detach' && args[1] === mount));
      assert.equal(fs.existsSync(mount), false);
      if (!failAt) assert.equal(stub.calls.filter(({ command }) => command === 'xcrun').length, 3);
    }
    const internal = runner();
    verifyInstaller(directory, {}, internal.execute);
    assert.equal(internal.calls.some(({ command }) => command === 'spctl' || command === 'xcrun'), false);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
