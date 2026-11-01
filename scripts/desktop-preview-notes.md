## OpenTu Desktop 1.2.17 Preview

- 桌面自由画布采用暖白细点背景，点阵随平移、缩放变化；导出图片不包含装饰点阵。
- 继续复用已有批量生图工具及工作流程。
- 桌面端隐藏重复的客户端下载宣传，保留资源入口。
- 发现新版本时，生成任务进行中仍显示更新提醒；任务完成后才可点击安装，沿用保存和重启保护。
- 更新下载页布局，保留 Windows、macOS、Linux 安装包与 SHA-256 校验入口。
- 保留已有双画布、模型配置、图片恢复、本地存储与桌面渠道功能。本次不宣称已完整同步上游 develop。

本预览版仅具有 Tauri 更新完整性签名，macOS 使用临时签名，未经 Apple 公证，首次打开可能提示“已损坏”或“无法验证开发者”。Windows 未配置 Authenticode 签名。本预览版不是正式稳定版。

macOS：核对下载来源与 SHA-256，将应用拖入“应用程序”后，在终端执行下面两行，仅放行此应用：

```bash
xattr -dr com.apple.quarantine "/Applications/Opentu.app"
open "/Applications/Opentu.app"
```

如果安装在用户目录，请将路径改为 `$HOME/Applications/Opentu.app`；若提示权限不足，可在第一行 `xattr` 前添加 `sudo` 后重试。请勿关闭系统全局 Gatekeeper。此命令不会补办 Apple 签名或公证。


应用版本号升至 **1.2.17**。已安装 1.2.16（包括 preview.1 / preview.2）及更早版本、且已接入此更新渠道的客户端可检查新版；未接入更新插件的旧版本需手动安装一次。本地数据存储在应用包之外，升级前请备份重要作品。

Download the installer matching your OS and architecture and verify its SHA-256 checksum. `.app.tar.gz`, `.nsis.zip`, `.AppImage.tar.gz` and their `.sig` files are updater payloads, not the normal manual installers.
