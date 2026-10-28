# macOS 安装签名检查（2026-10-28）

## 当前结论

已修复发布配置及门禁。本轮按“手动放行预览包”路线验收：没有 Apple Developer ID 公证包，也不把临时签名预览包当作正式生产发布。当前预览仓库 `AiW520/opentuAI` 只有三项 Tauri updater Secrets，尚缺六项 Apple Secrets；正式签名配置方法见 `DESKTOP_RELEASE_SECURITY.md`。

## 真实包检查

- 检查来源：`v1.2.16-preview.1` 的 `Opentu-1.2.16-macos-aarch64.dmg`。
- 已下载文件大小：13,287,019 字节。
- SHA-256：`4436d3a92a2c027fbf8c98e07ec09f41ad02d693ec85d9f1cfebbc45be86a24d`，与发布的校验文件一致。
- `hdiutil verify` 通过。只读挂载后检查包内 `Opentu.app`：`Signature=adhoc`、`TeamIdentifier=not set`，没有 stapled ticket。检查后已卸载镜像。
- 本机安装的 `Opentu Canvas Preview.app`：新验证脚本的内部完整性检查通过；正式分发模式在 Developer ID 检查处正确拒绝临时签名。
- 本机 `spctl --status` 为 `assessments disabled`。没有修改系统设置；此设备当前不能证明 Gatekeeper 验收通过。

上述结果指向签名/公证未配置，不能将系统提示的“已损坏”直接解释为下载文件损坏。

## 本次修复验证

- `node --test scripts/macos-signing.test.cjs scripts/desktop-release-tools.test.cjs scripts/desktop-client-channel.test.cjs`：9 项通过。覆盖缺凭据、开发证书/临时签名、团队不符、错误架构、缺票据、Gatekeeper 关闭/本地放行，以及 DMG/更新归档与构建 app 不一致。
- 新增签名用例使用模拟命令输出，不能替代真实 Apple 服务检查；本机临时签名拒绝检查使用了真实 app。
- JavaScript、Shell 语法、工作流 YAML 解析及 diff 空白检查通过。
- 未覆盖系统中已有应用，未清除 quarantine，未关闭 Gatekeeper，未更新现有公开安装包或下载渠道。

## 预览包使用方式

用户应先核对下载来源和 SHA-256，再将应用复制到“应用程序”，仅对该应用清除隔离标记并启动：

```bash
xattr -dr com.apple.quarantine "/Applications/Opentu.app"
open "/Applications/Opentu.app"
```

安装在用户目录时替换为实际路径；权限不足时只对第一条命令使用 `sudo`。不要关闭全局 Gatekeeper，也不要把这条命令用于来源不明的应用。清除隔离标记只改变本机对该文件的放行状态，不会补办签名或公证。

## 待验收

1. 配置真实 Apple Secrets，从新标签构建 ARM 和 Intel 公证包。不要覆盖现有公开预览标签。
2. 在启用 Gatekeeper 的 Mac 上，验证 Developer ID、Team ID、安全时间戳、runtime、DMG 内 app、公证票据和更新归档内 app；缺任一项不得公开发布。
3. 从浏览器重新下载，保留系统隔离标记，安装并首启，确认系统接受签名和公证。
4. 验证双画布、旧数据恢复及一次真实签名升级，再记录最终上线结果。
