# 桌面正式发布安全配置

桌面正式发布工作流只从 GitHub Actions Secrets 读取签名材料。证书、私钥、密码、临时发布配置和构建产物不得提交到仓库。

## 必需 Secrets

### macOS

- `APPLE_CERTIFICATE`：Developer ID Application 证书的 P12 Base64。
- `APPLE_CERTIFICATE_PASSWORD`：P12 密码。
- `APPLE_SIGNING_IDENTITY`：Developer ID Application 身份名称。
- `APPLE_ID`：用于 Apple Notary Service 的账号。
- `APPLE_PASSWORD`：该账号的 app-specific password。
- `APPLE_TEAM_ID`：Apple Developer Team ID。

### Windows

- `WINDOWS_CERTIFICATE`：Authenticode PFX 的 Base64。
- `WINDOWS_CERTIFICATE_PASSWORD`：PFX 密码。

### Tauri Updater

- `TAURI_SIGNING_PRIVATE_KEY`：Tauri updater 私钥。
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`：Updater 私钥密码。
- `TAURI_UPDATER_PUBLIC_KEY`：客户端内置的 updater 公钥。

## 权限与轮换

- Secrets 仅开放给正式发布环境和最少维护人员。
- Apple app-specific password、Windows 证书和 updater 密钥应按组织策略定期轮换。
- Updater 私钥轮换必须保留受控迁移期；客户端公钥切换前不得发布仅由新私钥签名的更新。
- 证书吊销、账号泄漏或异常签名发生时，立即禁用发布环境并停止发布 `latest.json`。

## 发布门禁

工作流会在创建 Draft Release 前校验全部 Secrets。任何签名配置缺失都会终止正式发布；普通本地构建仍可用于开发，但不具备正式发布或自动更新能力。

`desktop-update-preview.yml` 按当前选择发布明确标记的未公证预览版，仅要求 Tauri updater 签名，macOS 使用临时签名；不强制 Apple Secrets。用户核对来源与 SHA-256，将应用复制到应用程序后，可手动放行单个应用：

```bash
xattr -dr com.apple.quarantine "/Applications/Opentu.app"
open "/Applications/Opentu.app"
```

安装路径不同时替换为实际 `.app` 路径；权限不足时仅对第一条命令使用 `sudo`。不关闭全局 Gatekeeper，不自动执行放行。清除隔离标记不等于正式签名或 Apple 公证。此选择不降低 `desktop-release.yml` 的正式发布要求。


准备正式签名发布时，在发布仓库的 Settings → Secrets and variables → Actions 配置六项 Apple Secrets。`APPLE_CERTIFICATE` 必须包含 Developer ID Application 证书及其私钥；开发证书不能用于公开分发。不得将凭据发送到聊天或提交到 Git。

发布配置使用 `OPENTU_MACOS_NOTARIZATION_REQUIRED=1`，覆盖本地配置的 `signingIdentity: "-"`，要求身份与 Team ID 一致并启用 hardened runtime。Tauri 通过 Apple 凭据执行公证和 staple。上传前运行：

```bash
node scripts/verify-macos-installer.cjs <bundle-directory> --require-notarization --team=<TEAM_ID> --arch=arm64
```

Intel 构建使用 `--arch=x86_64`。验证同时覆盖独立 app、DMG 内 app 和更新归档内 app，检查 Developer ID、团队、架构、安全时间戳、runtime、公证票据和 Gatekeeper，并要求三份 app 的代码签名摘要一致。系统安全检查关闭或本地规则放行不能作为验收通过的依据。证书导入和临时钥匙串仅用于临时 CI runner，任务结束时清理。

回归命令：`node --test scripts/macos-signing.test.cjs scripts/desktop-release-tools.test.cjs scripts/desktop-client-channel.test.cjs`。测试中的模拟证书输出只验证门禁逻辑；真实 Apple 公证及安装验收仍需签名构建和启用 Gatekeeper 的 Mac。

生产桌面 CSP 的脚本策略仅允许 `script-src 'self'`，不再允许内联脚本或动态求值。`style-src 'unsafe-inline'` 暂时作为最小兼容例外保留，因为启动页、React 组件和画布运行时仍会写入内联样式；该例外只覆盖样式，不允许任意 HTTP 脚本或无限制远程源。

发布完成前必须验证：

- macOS：`codesign`、`spctl`、Apple 公证与 staple。
- Windows：Authenticode 签名与可信时间戳。
- 更新器：每个平台更新资产、`.sig` 和 `latest.json` 完整且签名有效。
- 所有安装资产：对应 SHA-256 文件存在。
