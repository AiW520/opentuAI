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

当前 Renderer 依赖仍包含动态 `Function`/运行时样式能力，因此 CSP 暂时保留 `script-src 'unsafe-eval'` 与 `style-src 'unsafe-inline'` 兼容项。正式对外发布前需完成相关依赖清理或提供经过三平台运行验证的最小例外说明；不得进一步扩大到任意 HTTP 脚本或无限制远程源。

发布完成前必须验证：

- macOS：`codesign`、`spctl`、Apple 公证与 staple。
- Windows：Authenticode 签名与可信时间戳。
- 更新器：每个平台更新资产、`.sig` 和 `latest.json` 完整且签名有效。
- 所有安装资产：对应 SHA-256 文件存在。
