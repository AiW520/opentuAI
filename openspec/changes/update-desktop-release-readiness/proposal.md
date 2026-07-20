# Change: 提升桌面端正式发布就绪度

## Why
当前桌面端已经能够构建 Windows、macOS 与 Linux 安装包，但仍缺少正式上线所需的可信签名、原子发布、统一版本、安全自动更新和真实桌面回归门禁。macOS WKWebView 中生成任务框曾与画布接近同色，现有样式修复缺少 WebKit 与实际安装包验证，批量任务和动画状态仍可能削弱实色兜底。

同时，正在进行的 `refactor-desktop-media-security-pipeline` 已定义本地文件安全边界。本变更不重复设计媒体安全管线，而是依赖其完成任意文件读取封堵，并聚焦发布、可视兼容与上线验收。

## What Changes
- 强化生成任务框在 macOS WKWebView、浅色/深色画布、单任务/批量任务各状态下的实体背景和边界可见性。
- 统一桌面根主题策略，避免系统深色偏好让透明任务项与画布背景混合。
- 增加 WebKit 视觉回归，并为 macOS、Windows、Linux 桌面包建立安装、首启与核心流程冒烟门禁。
- 统一 Git Tag、根包、桌面包、Tauri 与 Cargo 版本来源，禁止版本不一致的发布。
- 将 Release 改为草稿式原子发布：全部目标构建、校验、签名和资产检查完成后才公开。
- 接通 Tauri 签名自动更新，生成并校验更新清单；无签名配置时不得宣称或启用自动更新。
- 为 macOS 配置 Developer ID 签名、公证与 staple；为 Windows 配置 Authenticode 签名与时间戳。
- 更新仓库元数据、README、安装脚本和发布说明，使其统一指向 `tuziapi/opentu`。
- 收紧桌面 CSP，并移除通过清除 quarantine 绕过 Gatekeeper 的正式安装指引。
- 为发布资产生成校验和，并验证每个平台要求的产物完整存在。

## Dependencies
- 必须完成 `refactor-desktop-media-security-pipeline` 中的桌面文件访问边界，尤其是 `read_local_file` 的授权目录与大小限制。
- 正式公开发布依赖 Apple Developer ID/公证凭据与 Windows 代码签名证书；凭据只通过 GitHub Secrets 注入，不进入仓库。

## Impact
- Affected specs: `desktop-release`, `image-generation-feedback`, `desktop-runtime`（由依赖变更维护）
- Affected code:
  - `.github/workflows/ci.yml`
  - `.github/workflows/desktop-release.yml`
  - `apps/desktop/package.json`
  - `apps/desktop/src-tauri/Cargo.toml`
  - `apps/desktop/src-tauri/tauri.conf.json`
  - `apps/desktop/src-tauri/src/lib.rs`
  - `apps/web-e2e/playwright.config.ts`
  - `apps/web-e2e/src/**`
  - `packages/drawnix/src/components/image-generation-anchor/**`
  - `packages/drawnix/src/components/task-queue/task-progress-overlay.scss`
  - `scripts/install_opentu.sh`
  - `README.md`
  - `package.json`
