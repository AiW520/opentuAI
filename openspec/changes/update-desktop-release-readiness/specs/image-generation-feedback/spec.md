## ADDED Requirements

### Requirement: Generation Anchors Must Remain Visible Across Desktop WebViews
图片与视频生成任务反馈 MUST 在 Windows WebView2、macOS WKWebView 和 Linux WebKitGTK 的支持版本中保持清晰可见，且不得依赖渐变、滤镜或模糊效果成功渲染才能辨识。

#### Scenario: macOS WebKit drops advanced background effects
- **GIVEN** WKWebView 在 SVG `foreignObject` 中未正确渲染渐变、mask 或 backdrop filter
- **WHEN** 生成任务框处于 `submitted`、`queued` 或 `generating` 状态
- **THEN** 任务框 SHALL 仍具有不透明实体背景和清晰边界
- **AND** 用户 SHALL 能辨识任务正在进行

#### Scenario: Generation anchor is shown on light or dark canvas
- **WHEN** 生成任务框显示在浅色或深色画布上
- **THEN** 任务框边界、主要文字和状态指示 SHALL 保持可辨识
- **AND** 动画全过程 MUST NOT 将关键边界降低到与画布难以区分

#### Scenario: Batch generation slot changes state
- **WHEN** 批量生成槽位进入处理中、成功或失败状态
- **THEN** 每个槽位 SHALL 保留与其状态对应的不透明背景兜底
- **AND** `background` 状态覆盖 MUST NOT 将背景色重置为透明

#### Scenario: Desktop starts under a dark operating-system preference
- **GIVEN** 当前桌面产品只声明支持浅色主题
- **AND** 操作系统首选深色外观
- **WHEN** 桌面渲染器初始化组件主题
- **THEN** 根节点 SHALL 显式使用浅色 color scheme
- **AND** 透明任务项 MUST NOT 因系统媒体查询而与画布背景混合

### Requirement: Generation Anchor Visibility Must Have WebKit Regression Coverage
生成任务框可见性 MUST 具有自动化 WebKit 回归覆盖和真实 macOS 桌面验收。

#### Scenario: Pull request changes generation feedback styles
- **WHEN** Pull Request 修改生成任务框或进度覆盖层样式
- **THEN** CI SHALL 执行 WebKit 局部视觉或等价可见性测试
- **AND** SHALL 覆盖浅色/深色画布和关键生命周期状态

#### Scenario: macOS release candidate is validated
- **WHEN** macOS 候选安装包进入正式发布验收
- **THEN** 验收 SHALL 在真实 Tauri WKWebView 中覆盖单图、批量图和视频任务
- **AND** SHALL 覆盖进行中、成功和失败反馈
