<div align="center">
  <h1>Opentu (opentu.ai)</h1>
  <h3>开图 · 以画布为核心的 AI 应用平台</h3>
  <p>连接多模型生成、工具、素材与知识流，让 AI 任务在同一工作区持续执行。</p>
  <p>
    <a href="https://github.com/tuziapi/opentu/blob/main/LICENSE"><img src="https://img.shields.io/badge/license-MIT-green.svg" alt="License"></a>
    <a href="https://opentu.ai"><img src="https://img.shields.io/badge/demo-online-brightgreen.svg" alt="Demo"></a>
  </p>
  <p>
    <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fljquan%2Faitu&project-name=aitu&repository-name=aitu"><img src="https://vercel.com/button" alt="Deploy with Vercel"></a>
    <a href="https://app.netlify.com/start/deploy?repository=https://github.com/tuziapi/opentu"><img src="https://www.netlify.com/img/deploy/button.svg" alt="Deploy to Netlify"></a>
  </p>
</div>

[English README](./README_en.md)

## 在线体验

- 正式站点：[opentu.ai](https://opentu.ai)
- 预览实例：[pr.opentu.ai](https://pr.opentu.ai)

## 产品展示

| 拆分图片 | 流程图 | 思维导图 |
| --- | --- | --- |
| ![](./apps/web/public/product_showcase/九宫格拆图.gif) | ![](./apps/web/public/product_showcase/流程图.gif) | ![](./apps/web/public/product_showcase/思维导图.gif) |
| 语义理解 - 拆分图片 | 语义理解 - 流程图 | 语义理解 - 思维导图 |

## 平台能力

- **AI 生成与模型路由**：统一调度图片、视频、音频、文本与 Agent 流程。
- **画布工作区**：承载 AI 任务、素材、Frame、工具窗口与知识库内容。
- **任务与素材管理**：通过任务队列、素材库、统一缓存和历史记录复用生成结果。
- **工具箱与扩展**：支持内部 React 工具、iframe 工具、Skill/Agent 和插件化运行时。
- **PPT 与内容工作流**：支持 Frame 幻灯片、PPT 导出、Markdown/Mermaid 转换和多媒体编辑。

## 桌面应用

### 下载与安装

桌面应用支持 Windows、macOS 和 Linux 系统。

**最新版本下载：**

| 平台 | 架构 | 下载链接 |
|------|------|---------|
| Windows | x64 | [Opentu-windows-x86_64-setup.exe](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-windows-x86_64-setup.exe) / [.msi](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-windows-x86_64.msi) |
| macOS | Apple Silicon | [Opentu-macos-aarch64.dmg](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-macos-aarch64.dmg) |
| macOS | Intel | [Opentu-macos-x86_64.dmg](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-macos-x86_64.dmg) |
| Linux | x86_64 AppImage | [Opentu-linux-x86_64.AppImage](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-linux-x86_64.AppImage) |
| Linux | x86_64 deb | [Opentu-linux-x86_64.deb](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-linux-x86_64.deb) |
| Linux | aarch64 AppImage | [Opentu-linux-aarch64.AppImage](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-linux-aarch64.AppImage) |
| Linux | aarch64 deb | [Opentu-linux-aarch64.deb](https://github.com/tuziapi/opentu/releases/latest/download/Opentu-linux-aarch64.deb) |

**macOS / Linux 一键安装（推荐）：**

```bash
curl -fsSL https://github.com/tuziapi/opentu/releases/latest/download/install_opentu.sh | bash
```

或指定版本：

```bash
curl -fsSL https://github.com/tuziapi/opentu/releases/download/v1.1.9/install_opentu.sh | OPENTU_TAG=v1.1.9 bash
```

> Linux AppImage 启动需要 `libfuse2` 与 `libwebkit2gtk-4.1`，多数发行版默认未安装。
> macOS 未签名包首次启动可能被 Gatekeeper 拦截，可右键 → 打开，或执行 `xattr -dr com.apple.quarantine /Applications/Opentu.app`。

**访问所有版本：** [GitHub Releases](https://github.com/tuziapi/opentu/releases)

### 安装路径设置

首次启动应用时，会弹出路径选择对话框，让您自定义生成产物的存放位置：

- **默认路径**：系统默认文档目录下的 `Opentu/媒体资源` 文件夹
- **自定义路径**：点击浏览按钮选择任意目录
- **分类存储**：应用会自动在您选择的路径下创建三个子目录：
  - `图片` - 存放生成的图片文件
  - `视频` - 存放生成的视频文件
  - `音频` - 存放生成的音频文件

### 修改存储路径

您可以随时在应用的设置页面中修改存储路径，修改后新生成的文件会保存到新路径，已有的文件不会自动迁移。

### 桌面应用构建

```bash
# 进入桌面应用目录
cd apps/desktop

# 安装依赖
pnpm install

# 开发模式
pnpm dev

# 构建生产版本
pnpm build

# Tauri 构建
pnpm tauri build
```

## 本地开发

### 环境要求

- Node.js 20+
- pnpm 10.21.0（推荐通过 Corepack 启用）

### 安装与启动

```bash
corepack enable pnpm
pnpm install
pnpm start
```

启动后访问 `http://localhost:7200`。

### 常用命令

```bash
pnpm start             # 启动 Web 开发服务
pnpm build:web         # 构建 Web 应用
pnpm build             # 构建工作区
pnpm check             # typecheck + lint
pnpm test              # 运行单元测试
pnpm e2e:smoke         # 运行冒烟测试
pnpm check:cycles      # 检查循环依赖
pnpm manual:build      # 生成用户手册
```

## 部署

项目保留多条部署链路：

- Vercel / Netlify：使用上方一键部署按钮或仓库配置。
- Docker：使用仓库根目录的 `Dockerfile` 构建静态站点镜像。
- Hybrid CDN + 自托管：见 [NPM CDN 部署](./docs/NPM_CDN_DEPLOY.md) 与 [CDN 部署](./docs/CDN_DEPLOYMENT.md)。

## 仓库结构

```text
aitu/
├── apps/
│   ├── web/                 # Opentu Web 应用与 Service Worker
│   └── web-e2e/             # Playwright E2E 与手册生成脚本
├── packages/
│   ├── drawnix/             # 画布工作区核心库
│   ├── react-board/         # Plait React 画布适配层
│   ├── react-text/          # 文本渲染组件
│   └── utils/               # 共享工具与工作流解析
├── docs/                    # 当前开发文档入口
├── openspec/                # 需求规格与变更提案
└── scripts/                 # 构建、发布、手册与部署脚本
```

## 文档入口

- [开发文档索引](./docs/README.md)
- [贡献指南](./CONTRIBUTING.md)
- [OpenSpec 说明](./openspec/AGENTS.md)

## License

MIT
