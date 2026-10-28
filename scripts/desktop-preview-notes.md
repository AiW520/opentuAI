## OpenTu Desktop 1.2.16 Preview

- 修复普通画布与工作流的模型获取：桌面端通过原生请求访问模型 API；缺少 API Key 时提示填写，鉴权失败时显示明确错误，并保留保存后的配置。
- 更新双画布的导航、图片恢复和上游兼容；启动恢复上次画布。
- 桌面版与网页版分别检查各自更新，避免显示另一端的更新提示。
- 新增 API 站桌面渠道分析支持：签名发布包的 Tuzi 模型请求携带单一 `ch=3`。
- 覆盖共享传输、文本、图片/视频/音频、工作流及模型插件请求边界；保留正文、鉴权、取消信号和其他查询参数。
- 素材下载、模型元数据及第三方 API 不增加渠道参数。本地开发或未签名构建使用 `ch=0`。
- API 站需已部署配套渠道分析服务；渠道看板依原有日终规则汇总。渠道参数仅作分析，不改变定价或认证权限。
- 保留 1.2.15 的存储清理、更新检查、下载进度及本地数据保护功能。

本预览版仅具有 Tauri 更新完整性签名，macOS 使用临时签名，未经 Apple 公证，首次打开可能提示“已损坏”或“无法验证开发者”。Windows 未配置 Authenticode 签名。本预览版不是正式稳定版。

macOS：核对下载来源与 SHA-256，将应用拖入“应用程序”后，在终端执行下面两行，仅放行此应用：

```bash
xattr -dr com.apple.quarantine "/Applications/Opentu.app"
open "/Applications/Opentu.app"
```

如果安装在用户目录，请将路径改为 `$HOME/Applications/Opentu.app`；若提示权限不足，可在第一行 `xattr` 前添加 `sudo` 后重试。请勿关闭系统全局 Gatekeeper。此命令不会补办 Apple 签名或公证。


应用版本号保持 **1.2.16**。已经安装 1.2.16（包括 preview.1）的用户需要手动下载并安装本次修复包；相同版本号不会触发自动升级提醒。低于 1.2.16 且已接入此更新渠道的版本可检查新版；未接入更新插件的旧版本需手动安装一次。本地数据存储在应用包之外，升级前请备份重要作品。

Download the installer matching your OS and architecture and verify its SHA-256 checksum. `.app.tar.gz`, `.nsis.zip`, `.AppImage.tar.gz` and their `.sig` files are updater payloads, not the normal manual installers.
