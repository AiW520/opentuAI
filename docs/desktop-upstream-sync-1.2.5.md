# OpenTu develop 1.2.5 桌面适配记录

核对日期：2026-11-02。执行已批准的增量适配方案 B。

## 版本与边界

| 项目 | 固定版本 |
| --- | --- |
| 桌面起点 | `7d05f299fec40599221294a34c9b26f888177c9e`，桌面 1.2.17 preview.2 |
| 原 OpenTu pin | develop `3d84bb7c3b24fe6215a2daa945b80227fbd72456`，1.1.28 |
| 本次 OpenTu pin | develop `f6a3e0cf1b1e1a66d271ceb57eb4bbf6bd029114`，1.2.5 |
| 同期 OpenTu main | `f57c21235d3b2e970131ed0a583a0f0f8aa2b054`，已在桌面历史中 |

实际通过 `git fetch` 和 `git ls-remote` 核对两条远程分支。桌面版本号保持 1.2.17；此记录和 `apps/desktop/upstream-web.json` 表示适用源码的同步范围，不表示安装包已发布。未推进独立 Infinite Canvas 上游版本，其未完成事项仍保留在原 OpenSpec 任务中。

## 特性映射

| 上游提交 | 桌面结果 |
| --- | --- |
| `8fea6ce0` | 文本卡片阅读、复制；兼容既有桌面实现 |
| `27d0e843` | 参考图保真和速度提醒；原生与虚拟缓存原图同样遵守开关 |
| `af3338d5` | Suno v2、原生动作、结果详情、草稿和任务恢复；保留上游不可用动作限制 |
| `fefd92f7`、`76cb9a6e` | Gemini MIME、尺寸、缓存、加载超时和失败恢复；保留原生媒体读取和画布进度 |
| `6536f997` | @ 引用缩略图和悬停预览，保留本地素材运行时 URL |
| `4c61ceae` | GPT Image 蒙版编辑；蒙版不压缩，保留透明度，图片读取传递取消信号 |
| `9f4e2b9c`、`da61b3ce`、`049e01ed` | 模型目录/PPT 路由、Image 2.5 比例和尺寸、点击素材保留生成模式 |
| `8f91da5e` | 延续桌面构建证明与渠道边界，补入 Suno 提交/轮询路径；额度、元数据和签名媒体 URL 不改写 |
| `b58a5463` | 图片创作工具、关联关系、上下文操作；有意保留桌面独立工作流 |
| `cc46efef`、`33ed4325`、`c898b4ee` | 关联线删除、工具栏配置、编辑缩放、拆图、视角回填、来源关联与模型获取 |
| `4937a780` | 图片缓存与工具恢复、参考线开关、新功能提示；保留桌面菜单、更新与找回图片入口 |
| `8f370209` | 保留桌面原有暖白细点实现，跟随平移缩放，背景不写入导出内容 |
| `bfc81186` | 以当前 Key 认证后的模型列表决定可用模型，定价目录仅补充元数据；保留原生发现通道和缺 Key 提示 |
| `e8aff018` | 批量导入按勾选行身份填充、容量校验、循环填充、素材缩略图、历史搜索/日期筛选、生成结果回填与同步期间插入保存 |
| `26d88768`、`7b3aa15e`、`68f2ca1b`、`3386b632`、`5ef5e7da`、`21f3f787`、`f6a3e0cf` | 只记录上游版本，不覆盖桌面版本和发布元数据 |

对共同基线、桌面起点和上游目标做三方比较后处理冲突。适用 delta 未增加依赖；保留桌面原有依赖、锁文件、workflow 别名和 CSS 隔离。上游删除 workflow、Web Service Worker、网站版本/更新文件与桌面交付方式不兼容，未直接覆盖。

额外修复：从工作流返回普通画布时，背景 effect 可能暂时拿到已卸载的旧 board。现在跳过不存在的 DOM，并在新 board 初始化后重新挂载；已增加卸载和重新初始化回归测试。

## 新字段与旧数据

| 字段/数据 | 缺失时行为与兼容处理 | 验证 |
| --- | --- | --- |
| `compatibilityDefaultModelsV2` | 缺失时执行一次兼容默认模型迁移；仅处理 Tuzi 的已知旧默认 ID，保留其他供应商配置；完成后写迁移标记 | settings-manager 旧设置/重复初始化测试 |
| Provider `discoverySource`，定价 `modelCatalog`、category/owner/endpoint 元数据 | 均为可选，旧缓存缺失时继续模型 ID 推断；定价信息不扩展认证可用列表 | provider-model-catalog、model-pricing-service、runtime-model-discovery 测试 |
| `sunoV2Results`、`sunoNativeResults`、两类 drafts、音频 `analysisData` | 可选；旧音乐记录按空结果/空草稿读取，不改写旧任务身份 | task-sync、Suno 页面/合同/边界测试 |
| anchor `reservedInsertSize`、`failureStage` | 可选，旧 anchor 使用原几何/任务状态推断；区分生成失败与后处理失败 | anchor controller/view-model/readiness、插入位置测试 |
| 原图保真、参考图自动插入、图片工具栏配置 | 新 key 缺失时分别默认关闭、开启、全部工具显示且标签/参考线关闭；不可访问存储时有回退 | reference-image-settings、工具栏偏好测试 |
| 蒙版/来源关联/本地 resize 操作信息 | 可选扩展；旧图片无需补写。resize 记录经字段投影和尺寸/算法校验，蒙版不参与有损压缩 | mask、canvas-association、resize/尺寸/来源测试 |
| 历史筛选、批量导入范围 | UI 状态；不改变已存批量行结构/ID，旧缓存继续读取。日期范围使用已有创建时间索引 | batch import、TaskStorageReader、filter 测试和浏览器检查 |
| `PendingPersistence` | 内存修订号，无数据库升级；旧保存完成不得清除新变更的待保存状态 | pending-persistence 3 项、App 同步 7 项 |

本次未新增必填数据库列或提升数据库版本；现有原生文件保存调度器、关闭快照与更新前 flush 保持接入。

## 自动化验证

- Drawnix 最终全套：375 个文件通过，4,315 项通过；25 项既有失败、2 项跳过。原生引用 8 项与背景生命周期 2 项包含在本次全套中。
- 同步前 `7d05f299` 的隔离源码复现同样 25 项失败：ai-input-parser 22 项、Umami website ID 3 项。本次未修改这两个模块来掩盖既有失败。
- 独立工作流：50 个测试文件、539 项通过。
- 桌面工具：29 项通过；Node 发布/渠道工具测试 3 项通过。
- App 保存/同步：10 项通过，并新增可重复运行的 `apps/web/vitest.persistence.config.ts`。
- 桌面与 workflow TypeScript 检查通过。
- 桌面 renderer 生产构建通过；QR 资源一致，无 Web Service Worker 打入桌面；495 个脚本全部符合本地构建 channel 0。数字版本一致性检查通过。
- 将 App 保存同步、原生图片保真、蒙版和背景往返回归加入已有桌面预览发布检查。未触发发布 workflow。

常用复核命令（从仓库根目录运行）：

```sh
(cd packages/drawnix && pnpm exec vitest run --maxWorkers=2)
pnpm exec vitest run --config packages/drawnix/src/workflow-mode/web/vitest.config.ts --maxWorkers=2
(cd apps/desktop && pnpm exec vitest run)
pnpm exec vitest run --config apps/web/vitest.persistence.config.ts
pnpm exec tsc -p apps/desktop/tsconfig.app.json --noEmit
pnpm exec tsc -p packages/drawnix/src/workflow-mode/web/tsconfig.json --noEmit
NODE_OPTIONS=--max-old-space-size=8192 pnpm exec vite build --config apps/desktop/vite.config.ts
node scripts/verify-desktop-renderer.cjs
node scripts/verify-desktop-client-channel.cjs --expected=0
node scripts/sync-desktop-version.js --tag=v1.2.17 --check
```

## 界面验收与限制

隔离 Chromium、1440×1000 和 1024×768；无真实 Key、无付费生成。原生 bridge 和文件写入边界使用模拟。`scripts/verify-desktop-upstream-sync.cjs` 可针对桌面 Vite 服务重跑检查，默认地址 `http://127.0.0.1:7204/`，报告和截图写入本地 `outputs/desktop-upstream-sync/`。

已通过：暖白细点、PNG 尺寸回退、提示词弹层、模板导出、含空行/多列图片 Excel 导入导出、勾选行导出、超容量阻止与仅勾选行填充、已完成任务批量插入并保留任务元数据、原生图片覆盖层、跟随/居中/保真开关、历史日期过滤与清空、工作流批量页打开并返回原画布且结果保留。最终页面错误为 0。

仍需发布前单独验收：真实 Tauri 原生文件/数据库持久化与重启、真实供应商提交/网络中断恢复、签名升级安装、各平台安装包。当前环境未构建原生安装包；这次源码同步不代表 release-ready，也未改变线上下载页、已发布版本或更新清单。
