## OpenTu Desktop 1.2.16 Preview

- 新增 API 站桌面渠道分析支持：签名发布包的 Tuzi 模型请求携带单一 `ch=3`。
- 覆盖共享传输、文本、图片/视频/音频、工作流及模型插件请求边界；保留正文、鉴权、取消信号和其他查询参数。
- 素材下载、模型元数据及第三方 API 不增加渠道参数。本地开发或未签名构建使用 `ch=0`。
- API 站需已部署配套渠道分析服务；渠道看板依原有日终规则汇总。渠道参数仅作分析，不改变定价或认证权限。
- 保留 1.2.15 的存储清理、更新检查、下载进度及本地数据保护功能。

This preview is signed for Tauri update integrity. macOS uses an ad-hoc application signature; Apple Developer ID signing, notarization and Windows Authenticode signing are not configured. Operating-system security warnings may appear. This is not a trusted stable release.

Older installations without the updater plugin must install this preview manually once. Existing local data is stored separately from the application bundle. Back up important work before upgrading.

Download the installer matching your OS and architecture and verify its SHA-256 checksum. `.app.tar.gz`, `.nsis.zip`, `.AppImage.tar.gz` and their `.sig` files are updater payloads, not the normal manual installers.
