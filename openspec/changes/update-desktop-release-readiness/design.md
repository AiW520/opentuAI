## Context
桌面应用基于 Tauri 2，共用 Web 渲染器。Windows 使用 WebView2，macOS 使用 WKWebView，Linux 使用 WebKitGTK。三套 WebView 对 SVG `foreignObject`、多层渐变、滤镜与合成层的行为不完全一致，因此仅在 Chromium 中验证样式不足以证明桌面兼容性。

当前发布工作流在目标平台构建前创建公开 Release，安装包未形成完整可信签名链，应用版本也未与 Git Tag 统一。更新器依赖存在但未形成端到端的签名更新协议。

## Goals
- 让生成任务在支持的桌面平台和画布主题中始终具有清晰可见的实体边界。
- 让发布成为可复现、可回滚、资产完整且默认不公开残缺版本的流程。
- 让安装包和自动更新具备平台认可的签名与校验链。
- 在不引入大内存读写和重复媒体缓存的前提下验证核心桌面流程。

## Non-Goals
- 不在本变更中重写生成任务状态机。
- 不新增桌面专属 UI 框架。
- 不把签名证书、私钥或公证密码提交到仓库。
- 不通过关闭 Gatekeeper、清除 quarantine 或忽略 SmartScreen 作为正式发布方案。
- 不重复实现 `refactor-desktop-media-security-pipeline` 已定义的媒体安全与流式文件管线。

## Decisions

### 生成任务采用“实体兜底优先”
任务框及批量槽位的每个状态都必须保留不透明末层背景。动画不得把边框颜色降低到不可辨识水平；在 WKWebView 高风险路径中，优先动画 `transform`、`opacity` 与阴影，避免依赖 `backdrop-filter`、`mask-image` 或多层 `filter` 才能获得可见性。

桌面入口必须显式声明产品支持的根主题。若当前产品只支持浅色，则桌面根节点使用与 Web 一致的 `color-scheme: light`，并阻止组件库仅因系统深色偏好改变基础 surface；若未来支持深色，则由应用主题状态显式切换，不能让透明任务项被动继承系统配色。

WebKit 视觉测试至少覆盖：
- 浅色与深色画布；
- `submitted`、`queued`、`generating`、`completed`、`failed`；
- 单任务、批量槽位、图片和视频进度覆盖层。

### 自动化测试与真实桌面冒烟分层
Playwright WebKit 用于稳定复现布局和视觉退化；真实 Tauri 包冒烟用于覆盖平台 WebView、资源协议、安装和首启行为。自动化无法完全替代 Apple Intel/ARM 与 Windows 安装验收，Release 公开前必须保留平台验收记录或对应 CI 结果。

### 单一版本来源
发布版本从语义化 Git Tag 派生，并在构建前同步到根 `package.json`、桌面 `package.json`、`tauri.conf.json` 与 `Cargo.toml`。工作流在同步后校验四处版本完全一致；不一致立即失败，不能上传资产。

### 草稿式原子发布
工作流先创建或复用 Draft Release。各平台构建、签名、校验、冒烟和资产上传完成后，由最终任务检查必需资产、校验和与更新清单，再将 Release 公开。任何平台失败时 Release 保持草稿，不向用户暴露残缺版本。

手动触发必须显式输入合法版本 Tag，不能把任意分支名当作 Release Tag。

### 平台可信签名
- macOS：Developer ID Application 签名、Apple Notary Service 公证、staple，并用 `codesign`、`spctl`、`stapler validate` 校验。
- Windows：Authenticode 签名、可信时间戳，并在上传前验证签名状态。
- Linux：至少提供 SHA-256 校验和；可在后续引入包仓库签名，但不阻塞本变更的首期发布。

签名 Secrets 缺失时允许执行非发布构建，但正式 Release 工作流必须失败并说明缺少的配置。

### 签名自动更新
启用 Tauri updater 前必须初始化插件、配置受控 HTTPS endpoint 与公钥，并为更新资产生成签名和清单。客户端只接受签名有效且版本更高的更新。若尚未配置完整签名链，则 UI 和运行时不得显示自动更新已可用。

### CSP 分阶段收紧
生产桌面 CSP 移除不必要的 `unsafe-eval`、广泛 `http:` 和无限制远程 frame/connect 权限。若现有依赖阻止一次性移除，必须按指令类型记录最小例外，并通过测试证明核心功能可用；开发环境例外不得进入生产配置。

### 仓库迁移一致性
所有用户可见下载地址、问题地址、安装脚本默认仓库与更新 endpoint 统一为 `tuziapi/opentu`。不再提供清除 macOS quarantine 的默认安装流程。

## Risks / Trade-offs
- Apple 和 Windows 签名需要外部证书成本与 Secrets 配置；在凭据未就绪前只能产出内部测试包。
- WebKit 截图在不同系统字体和渲染版本上可能抖动；测试应聚焦任务卡区域，并结合结构/对比度断言降低噪声。
- CSP 收紧可能暴露现有动态脚本依赖；应逐项消除而不是永久保留全域例外。
- 双架构 macOS 冒烟增加 CI 时间；可以将完整验收限制在 Tag Release，PR 阶段只跑 WebKit 回归与编译检查。

## Migration Plan
1. 先完成桌面任意文件读取封堵和回归测试。
2. 修复任务框所有状态的实体兜底与动画覆盖，加入 WebKit 回归。
3. 统一版本与仓库元数据，改造 Draft Release 和资产完整性检查。
4. 接通签名 updater，但在签名链完整前保持禁用。
5. 配置平台签名 Secrets，执行三平台安装/首启/生成任务冒烟。
6. 仅在全部门禁通过后公开首个 `tuziapi/opentu` 正式 Release。

## Rollback
- Release 发布失败时保持 Draft 或删除未公开 Draft，不覆盖上一个稳定版本。
- updater endpoint 仅指向已公开且签名有效的清单；回滚时停止发布新清单，不向客户端下发未验证资产。
- 样式回归可独立回退，但不得回退实体背景与清晰边界的最低可见性要求。
