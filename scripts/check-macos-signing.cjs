const requiredSecrets = [
  'APPLE_CERTIFICATE', 'APPLE_CERTIFICATE_PASSWORD', 'APPLE_SIGNING_IDENTITY',
  'APPLE_ID', 'APPLE_PASSWORD', 'APPLE_TEAM_ID',
];

function checkMacSigning(env = process.env) {
  const missing = requiredSecrets.filter((name) => !env[name]?.trim());
  if (missing.length) throw new Error(`macOS trusted release requires GitHub Secrets: ${missing.join(', ')}`);
  const team = env.APPLE_TEAM_ID.trim();
  const identity = env.APPLE_SIGNING_IDENTITY.trim();
  if (!/^[A-Z0-9]{10}$/.test(team)) throw new Error('APPLE_TEAM_ID must be a 10-character Apple team ID');
  if (!identity.startsWith('Developer ID Application: ') || !identity.endsWith(` (${team})`)) {
    throw new Error('APPLE_SIGNING_IDENTITY must be a Developer ID Application identity belonging to APPLE_TEAM_ID');
  }
  return { signingIdentity: identity, hardenedRuntime: true };
}

module.exports = { checkMacSigning };
if (require.main === module) {
  try {
    checkMacSigning();
    console.log('Apple signing and notarization configuration is present; certificate validity is checked during build.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
