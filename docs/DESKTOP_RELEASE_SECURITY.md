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

生产桌面 CSP 的脚本策略仅允许 `script-src 'self'`，不再允许内联脚本或动态求值。`style-src 'unsafe-inline'` 暂时作为最小兼容例外保留，因为启动页、React 组件和画布运行时仍会写入内联样式；该例外只覆盖样式，不允许任意 HTTP 脚本或无限制远程源。

发布完成前必须验证：

- macOS：`codesign`、`spctl`、Apple 公证与 staple。
- Windows：Authenticode 签名与可信时间戳。
- 更新器：每个平台更新资产、`.sig` 和 `latest.json` 完整且签名有效。
- 所有安装资产：对应 SHA-256 文件存在。
