const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  resolveDesktopClientChannel,
  assertExpectedChannel,
} = require('./desktop-client-channel.cjs');

const build = (
  profile,
  updaterEnabled = '1',
  signingKeyPresent = true,
  command = 'build'
) =>
  resolveDesktopClientChannel({
    command,
    profile,
    updaterEnabled,
    signingKeyPresent,
    nodeEnv: 'production',
  });

test('desktop attribution fails closed unless a signed release build explicitly selects a profile', () => {
  assert.equal(build(undefined), 0);
  assert.equal(build('invalid'), 0);
  assert.equal(build('preview', '0'), 0);
  assert.equal(build('production', '1', false), 0);
  assert.equal(build('production', '1', true, 'serve'), 0);
  assert.equal(build('production'), 3);
  assert.equal(build('preview'), 3);
  assert.throws(() => assertExpectedChannel(build('preview'), '4'));
  assert.doesNotThrow(() => assertExpectedChannel(build('preview'), '3'));
});
