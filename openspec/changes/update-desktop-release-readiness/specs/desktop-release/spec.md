## ADDED Requirements

### Requirement: Desktop Releases Must Be Atomic
桌面端正式发布 MUST 在所有要求的平台资产完成构建、校验和签名后才对用户公开。

#### Scenario: One platform build fails
- **GIVEN** 发布工作流已创建草稿 Release
- **WHEN** 任一要求的平台构建、签名、测试或资产上传失败
- **THEN** Release MUST 保持草稿状态
- **AND** 不得向用户宣称该版本已完成发布

#### Scenario: All release gates pass
- **GIVEN** 所有要求的平台资产、校验和、签名和更新清单均已验证
- **WHEN** 最终发布任务执行
- **THEN** 系统 SHALL 将草稿 Release 原子公开
- **AND** 公开版本 SHALL 包含完整资产集合

### Requirement: Desktop Versions Must Derive From The Release Tag
桌面端发布版本 MUST 从合法语义化 Git Tag 派生，并在所有桌面版本文件中保持一致。

#### Scenario: Version files disagree
- **GIVEN** Git Tag、根包、桌面包、Tauri 配置或 Cargo 包版本不一致
- **WHEN** 发布校验执行
- **THEN** 工作流 MUST 在构建或上传发布资产前失败

#### Scenario: Manual release is requested
- **WHEN** 操作者手动触发正式发布
- **THEN** 工作流 MUST 要求并校验显式语义化版本 Tag
- **AND** MUST NOT 将普通分支名作为发布版本

### Requirement: Production Desktop Packages Must Be Trusted By The Target Platform
正式桌面安装包 MUST 使用目标平台认可的代码签名和验证链。

#### Scenario: macOS package is released
- **WHEN** macOS 正式安装包准备上传
- **THEN** 应用 SHALL 使用 Developer ID 签名
- **AND** SHALL 通过 Apple 公证与 staple 验证
- **AND** 工作流 SHALL 验证 `codesign`、`spctl` 与公证票据

#### Scenario: Windows package is released
- **WHEN** Windows 正式安装包准备上传
- **THEN** 安装包 SHALL 包含有效 Authenticode 签名与可信时间戳
- **AND** 工作流 SHALL 在上传前验证签名有效

#### Scenario: Signing credentials are missing
- **GIVEN** 正式发布所需签名 Secrets 不完整
- **WHEN** 正式发布工作流执行
- **THEN** 工作流 MUST 失败并指出缺失配置
- **AND** MUST NOT 将未签名产物标记为正式版本

### Requirement: Desktop Updates Must Be Signed And Verifiable
桌面自动更新 MUST 只接受由受信公钥验证通过的更新资产和清单。

#### Scenario: Valid newer update is available
- **GIVEN** endpoint 返回版本更高且签名有效的更新清单
- **WHEN** 客户端检查更新
- **THEN** 客户端 SHALL 允许下载并安装该更新

#### Scenario: Update signature is invalid
- **GIVEN** 更新资产或清单签名无效、缺失或与受信公钥不匹配
- **WHEN** 客户端检查或安装更新
- **THEN** 客户端 MUST 拒绝该更新
- **AND** 当前安装 SHALL 保持可用

#### Scenario: Updater is not fully configured
- **GIVEN** endpoint、公钥或签名产物尚未完整配置
- **WHEN** 桌面应用构建或运行
- **THEN** 系统 MUST NOT 宣称自动更新可用
- **AND** 正式发布门禁 SHALL 阻止不完整的更新配置

### Requirement: Desktop Release Assets Must Be Complete And Verifiable
正式发布 SHALL 验证必需资产完整性，并为发布资产提供加密校验和。

#### Scenario: Required asset is missing
- **GIVEN** 任一目标平台或架构的必需安装资产缺失
- **WHEN** 最终发布任务检查资产集合
- **THEN** Release MUST 保持草稿
- **AND** 工作流 SHALL 明确报告缺失资产

#### Scenario: User verifies a downloaded asset
- **WHEN** 用户下载正式发布资产及其校验和
- **THEN** 用户 SHALL 能使用 SHA-256 验证下载内容完整性

### Requirement: Release Metadata Must Point To The Owning Repository
桌面应用的用户可见仓库、下载、问题和更新地址 SHALL 统一指向当前正式仓库。

#### Scenario: Release documentation is generated
- **WHEN** README、安装脚本或 Release Notes 展示下载与支持地址
- **THEN** 地址 SHALL 指向 `tuziapi/opentu`
- **AND** 正式安装指引 MUST NOT 以清除 quarantine 或绕过系统安全校验作为默认步骤

### Requirement: Desktop Release Gates Must Exercise Installed Runtime Behavior
正式发布门禁 SHALL 覆盖生产安装包的安装、首启和关键桌面流程，而不只验证编译成功。

#### Scenario: Desktop release candidate is validated
- **WHEN** 候选版本在目标平台执行上线验收
- **THEN** 验收 SHALL 覆盖安装、首启、本地媒体导入、生成任务、预览、导出与删除
- **AND** SHALL 记录失败信息与平台环境
