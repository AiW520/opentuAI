const fs = require('fs');
const path = require('path');

const output = process.argv.find((value) => value.startsWith('--output='))?.slice(9);
const pubkey = process.env.TAURI_UPDATER_PUBLIC_KEY;
const windowsSignCommand = process.env.OPENTU_WINDOWS_SIGN_COMMAND;
const repository =
  process.env.OPENTU_UPDATER_REPOSITORY ||
  process.env.GITHUB_REPOSITORY ||
  'AiW520/opentuAI';
const endpoint = process.env.OPENTU_UPDATER_ENDPOINT ||
  `https://github.com/${repository}/releases/latest/download/latest.json`;
if (!endpoint.startsWith('https://')) throw new Error('Updater endpoint must use HTTPS');

if (!output || !pubkey) {
  console.error('正式发布需要 --output 与 TAURI_UPDATER_PUBLIC_KEY');
  process.exit(1);
}

const config = {
  bundle: { createUpdaterArtifacts: 'v1Compatible' },
  plugins: {
    updater: {
      endpoints: [
        endpoint,
      ],
      pubkey,
    },
  },
};

if (windowsSignCommand) {
  config.bundle.windows = { signCommand: windowsSignCommand };
}

const target = path.resolve(output);
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 });
console.log(`已生成仅用于当前发布任务的 Tauri 配置: ${target}`);
