const fs = require('node:fs');
const path = require('node:path');

const expectedArg = process.argv
  .find((value) => value.startsWith('--expected='))
  ?.slice(11);
const expected = expectedArg ?? process.env.OPENTU_DESKTOP_CHANNEL_EXPECTED;
const root = path.resolve(__dirname, '..');
const proofPath = path.join(
  root,
  'apps/desktop/dist/opentu-client-channel.json'
);
const proof = JSON.parse(fs.readFileSync(proofPath, 'utf8'));
if (
  !['0', '3'].includes(String(expected)) ||
  proof.channel !== Number(expected)
) {
  throw new Error(
    `Desktop client artifact channel mismatch: expected ${expected}, found ${proof.channel}`
  );
}
const validProfiles =
  proof.channel === 3 ? ['production', 'preview'] : ['local'];
if (!validProfiles.includes(proof.profile))
  throw new Error(`Desktop client artifact profile mismatch: ${proof.profile}`);
const jsRoot = path.join(root, 'apps/desktop/dist/assets');
const scripts = fs.readdirSync(jsRoot).filter((name) => name.endsWith('.js'));
if (
  !scripts.some((name) =>
    fs
      .readFileSync(path.join(jsRoot, name), 'utf8')
      .includes(`opentu-desktop-client-channel:${proof.channel}`)
  )
) {
  throw new Error('Built renderer is missing its matching channel proof');
}
console.log(
  JSON.stringify({
    channel: proof.channel,
    profile: proof.profile,
    rendererScripts: scripts.length,
  })
);
