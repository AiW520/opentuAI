const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function run(command, args) {
  const result = spawnSync(command, args, { encoding: 'utf8' });
  const output = `${result.stdout || ''}\n${result.stderr || ''}`.trim();
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${output}`);
  return output;
}

function verifyApp(app, { trusted = false, team, arch } = {}, execute = run) {
  execute('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
  if (!trusted) return;
  const metadata = execute('codesign', ['--display', '--verbose=4', app]);
  if (!/^Authority=Developer ID Application: .+$/m.test(metadata) || /^Signature=adhoc$/m.test(metadata)) {
    throw new Error('Trusted release requires a Developer ID Application signature; ad-hoc signatures are not accepted');
  }
  if (!metadata.split('\n').includes(`TeamIdentifier=${team}`)) {
    throw new Error('Application signer does not match the expected Apple team');
  }
  if (!/^CodeDirectory [^\n]*\([^\n)]*\bruntime\b/m.test(metadata) || !/^Timestamp=.+$/m.test(metadata)) {
    throw new Error('Trusted release requires hardened runtime and a secure signing timestamp');
  }
  const executable = execute('/usr/libexec/PlistBuddy', ['-c', 'Print :CFBundleExecutable', path.join(app, 'Contents', 'Info.plist')]).trim();
  if (!executable || path.basename(executable) !== executable) throw new Error('Invalid application executable');
  const architectures = execute('lipo', ['-archs', path.join(app, 'Contents', 'MacOS', executable)]).trim().split(/\s+/);
  if (!architectures.includes(arch)) throw new Error(`Application does not contain the expected architecture: ${arch}`);
  execute('xcrun', ['stapler', 'validate', app]);
  const assessment = execute('spctl', ['--assess', '--type', 'execute', '--verbose=4', app]);
  if (/override=/i.test(assessment) || !/^source=Notarized Developer ID$/m.test(assessment)) {
    throw new Error('Gatekeeper must accept the notarized Developer ID without a local override');
  }
  const digest = metadata.match(/^CDHash=([0-9a-f]+)$/m)?.[1];
  if (!digest) throw new Error('Missing application code signature digest');
  return digest;
}

function onlyFile(directory, extension) {
  const files = fs.readdirSync(directory).filter((name) => name.endsWith(extension));
  if (files.length !== 1) throw new Error(`Expected one ${extension} in ${directory}, found ${files.length}`);
  return path.join(directory, files[0]);
}

function verifyInstaller(directory, options = {}, execute = run) {
  if (options.trusted) {
    if (!/^[A-Z0-9]{10}$/.test(options.team || '') || !['arm64', 'x86_64'].includes(options.arch)) {
      throw new Error('Trusted verification requires --team=<Apple team ID> and --arch=arm64|x86_64');
    }
    if (execute('spctl', ['--status']).trim() !== 'assessments enabled') {
      throw new Error('Gatekeeper is disabled; this machine cannot validate a trusted release');
    }
  }
  const digest = verifyApp(path.join(directory, 'macos', 'Opentu.app'), options, execute);
  const dmg = onlyFile(path.join(directory, 'dmg'), '.dmg');
  execute('hdiutil', ['verify', dmg]);
  const mount = fs.mkdtempSync(path.join(os.tmpdir(), 'opentu-dmg-verify-'));
  let attached = false;
  try {
    execute('hdiutil', ['attach', '-readonly', '-nobrowse', '-mountpoint', mount, dmg]);
    attached = true;
    const mountedDigest = verifyApp(path.join(mount, 'Opentu.app'), options, execute);
    if (options.trusted && mountedDigest !== digest) throw new Error('DMG application signature differs from the build application');
  } finally {
    if (attached) execute('hdiutil', ['detach', mount]);
    fs.rmdirSync(mount);
  }
  if (options.trusted) {
    const archive = onlyFile(path.join(directory, 'macos'), '.app.tar.gz');
    const extracted = fs.mkdtempSync(path.join(os.tmpdir(), 'opentu-updater-verify-'));
    try {
      execute('tar', ['-xzf', archive, '-C', extracted]);
      const updaterDigest = verifyApp(path.join(extracted, 'Opentu.app'), options, execute);
      if (updaterDigest !== digest) throw new Error('Updater application signature differs from the build application');
    } finally {
      fs.rmSync(extracted, { recursive: true, force: true });
    }
  }
}

module.exports = { verifyApp, verifyInstaller };
if (require.main === module) {
  try {
    if (process.platform !== 'darwin') throw new Error('macOS is required to verify DMG installers');
    const [bundle, ...flags] = process.argv.slice(2);
    if (!bundle) throw new Error('Usage: verify-macos-installer.cjs <bundle-directory> [--require-notarization --team=TEAMID --arch=arm64|x86_64]');
    const options = {
      trusted: flags.includes('--require-notarization'),
      team: flags.find((flag) => flag.startsWith('--team='))?.slice(7),
      arch: flags.find((flag) => flag.startsWith('--arch='))?.slice(7),
    };
    if (flags.some((flag) => flag !== '--require-notarization' && !flag.startsWith('--team=') && !flag.startsWith('--arch='))) throw new Error('Unknown verification option');
    verifyInstaller(path.resolve(bundle), options);
    console.log(options.trusted
      ? 'Build, DMG and updater applications passed Developer ID, architecture, staple and Gatekeeper checks.'
      : 'Application and DMG bundle signatures are valid (not a notarization check).');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
