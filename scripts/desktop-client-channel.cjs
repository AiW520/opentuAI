function resolveDesktopClientChannel({
  command,
  profile,
  updaterEnabled,
  signingKeyPresent,
  nodeEnv,
}) {
  if (command !== 'build' || nodeEnv === 'development') return 0;
  if (profile === undefined || profile === '') return 0;
  if (!['production', 'preview'].includes(profile)) return 0;
  if (updaterEnabled !== '1' || !signingKeyPresent) return 0;
  return 3;
}

function assertExpectedChannel(actual, expected) {
  if (!['0', '3'].includes(String(expected)) || actual !== Number(expected)) {
    throw new Error(
      `Desktop client channel mismatch: expected ${expected}, resolved ${actual}`
    );
  }
}

module.exports = { resolveDesktopClientChannel, assertExpectedChannel };
