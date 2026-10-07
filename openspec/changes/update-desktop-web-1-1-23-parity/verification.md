# Desktop Integration Verification

Date: 2026-10-07

## Integrated Baseline

- Approved option B: staged feature adaptation for desktop.
- Requested upstream: https://github.com/ljquan/opentu.git, develop.
- Pinned snapshot: `647e378d8c3b0213e688f2878efefc0042d0b04b`, web 1.1.23.
- Remote `develop` was rechecked on 2026-10-07 and still matched this snapshot.
- Desktop product version: 1.2.10.
- Integration branch: `codex/sync-web-1.1.23-desktop`.
- Existing settings and boards were preserved. A separate test provider and board were used.

## Real Native GPT Image Request

- Endpoint: `https://api.tu-zi.com/v1`.
- Provider: `Tuzi 桌面实测`; credentials were configured locally and are excluded from this report and source files.
- Model discovery succeeded: 633 models, including 150 image models.
- Initial generation model: `gpt-image-2`; the six-model acceptance run below extends this coverage.
- One native request, square 1:1, 1K, automatic quality/background, one output.
- Prompt: `A red ceramic mug on a white table, clean studio product photograph, soft daylight, square composition, no text.`
- Request started at 19:30:36 and completed at 19:31:19, approximately 43 seconds.
- PNG: 1254 x 1254, 1,520,916 bytes.
- SHA256: `590cac1eb4947927dd4beb7bdbded3aaf756050cf8cf2a1c8d1748d0162c7266`.
- Durable output: `~/Library/Application Support/com.opentu.desktop/media/images/content-590cac1eb4947927dd4beb7bdbded3aaf756050cf8cf2a1c8d1748d0162c7266.png`.
- Native generation detail UI and local PNG contents were checked. Generation and durable storage passed.

## Native Quality And Size Smoke Tests

- A higher-quality editorial prompt for a cobalt glass perfume bottle was generated natively at 3:4, 1K, one image. It completed in 57 seconds and returned 1081 x 1455 PNG output. The image rendered on the WKWebView canvas and in the task queue.
- A cinematic coastal-villa prompt was generated natively at 16:9, 2K, two images. Both completed in 55 seconds and returned 2560 x 1440 PNG output. The task queue reported `2/2`, both thumbnails and both asset links were present, and both images rendered after insertion on the native canvas.
- The generated outputs were inspected as local PNGs and published through the image fallback skill. The published artifacts are under `outputs/codex-images/`.
- Reference-image conversion to request data has regression coverage, but a paid native reference-image edit request was not submitted in this acceptance run.

## Six-Model Native Acceptance

User approved one 1K image per named model at actual provider pricing. All six requests were submitted through the real macOS Tauri application, using the separate test provider and board, one image and no reference images. No further paid request was submitted after these results.

| Model | Start time (2026-10-07, local) | Duration | Result |
| --- | --- | --- | --- |
| `gpt-image-2.5-sunburst` | 11:21:56 | 42s | Passed, 1024 x 1024 PNG |
| `gpt-image-2.5-flare` | 11:30:47 | 31s | Passed, 1024 x 1024 PNG |
| `gpt-image-2-vip` | 11:36:06 | 15m | Failed, upstream result not found before timeout |
| `gpt-image-2.5` | 11:47:18 | 37s | Passed, 1254 x 1254 PNG |
| `gpt-image-2-1k` | 11:51:24 | 2m 29s | Passed, 1254 x 1254 PNG |
| `gpt-image-2` | 11:56:15 | 37s | Passed, 1254 x 1254 PNG |

Prompt:

```text
Square luxury editorial product photograph of a sculptural cobalt-blue glass perfume bottle with a polished silver cap, on a pale ivory marble slab. One elegant white orchid and a delicate green stem, softly lit pale mint background. Large diffused daylight from the left, precise glass refraction, subtle caustics, clean realistic shadows, tasteful negative space, immaculate styling, 85mm lens, premium magazine art direction, photorealistic. No text, no logos, no watermark.
```

- Square 1:1 and 1K were selected for models with those controls. Before the fixed-1K patch, `gpt-image-2-1k` exposed only automatic background, so this request used its default/automatic size with the explicit square prompt. It did not verify an explicit size parameter on that variant.
- Five successful outputs rendered in both the native task queue and canvas and were stored as local PNG assets. Requested 1K is a provider tier: three models returned 1254 x 1254 rather than exactly 1024 x 1024.
- VIP reported `暂未查询到上游结果，可重试` after 15 minutes. It is not a passing model and was not retried. This run does not establish whether the upstream later completed or billed the request.
- One additional Sunburst request was accidentally submitted at 11:26:46 while clearing a reference selection. It completed in 46s with a 1024 x 1024 PNG, SHA256 `fbca4d9f72f0ede1e5581f05190e9c734b868c4b684591ec6e1f31f2c17bd724`. It is excluded from the uniform comparison and may incur an additional charge; actual charges were not independently audited.
- The final observed queue contained 27 tasks, 0 generating, 22 completed and 5 failed, including pre-existing tasks. All generated outputs were published using the image fallback skill.

## Fixes Found During Native Testing

- Native model discovery now requests the configured `/models` endpoint directly instead of a browser development proxy that returned application HTML.
- Tuzi polling/status proxy routing excludes native runtimes, including Windows HTTP custom origins.
- Native asset URLs now participate in image Blob fallback. The unified cache reads the native protocol first and falls back to the existing authorized `read_local_file` command when custom-scheme fetch fails.
- Native asset reference images are converted to base64 for AI requests instead of passing an inaccessible desktop URL.
- The canvas was blank before the final asset fallback fix. The fix is covered by regression tests and included in the rebuilt app. Native WKWebView rendering is now verified for square, portrait, and landscape images.
- `gpt-image-2-1k` now has a static model definition, preserved during runtime discovery, with automatic/square/portrait/landscape size controls, quality and opaque background controls. It has no 2K/4K selector; stale resolution parameters cannot inflate its requested size. Portrait/landscape mappings have regression coverage but were not submitted as paid requests for this variant.
- Send, library and uploaded-reference removal buttons now have accessible names to make native interaction unambiguous.

## Validation

- Model discovery and status routing: 26 tests passed.
- Native image fallback, RetryImage, unified cache and desktop URL handling: 29 tests passed.
- Shared TypeScript noEmit: passed.
- Focused ESLint: no errors; existing warnings remain.
- Workflow suite: 37 files / 457 tests passed.
- Runtime regression suite: 6 files / 172 tests passed.
- Desktop workspace/bridge suite: 33 tests passed.
- Rust native suite: 41 tests passed in the prior run. No Rust code changed in the final image fallback patch.
- Production web and Service Worker builds: passed.
- Latest desktop production renderer and Tauri `.app` bundle: passed; build log `/tmp/opentu-desktop-native-image-fallback-build.log`.
- Chromium canvas fixture using the actual generated PNG: image decoded at width 1254, visible, no page errors; screenshot `/tmp/opentu-image-chromium-verified.png`.
- Native WKWebView: square, 3:4 portrait and 16:9 landscape images were visible on the canvas; selection dimensions, task queue metadata and insert flow were checked.
- Native download: the square output was saved through the system Save dialog to `/tmp/opentu-native-download-test.png`; it remained a 1254 x 1254 PNG with matching SHA256 and the UI reported `下载成功`.
- Native persistence: after restarting the rebuilt app, the test board and generated images were reopened and remained visible.
- Full legacy Drawnix suite contains stale parser/Umami test failures; it is not reported as fully passing.
- Six-model acceptance fixes: 4 focused files / 144 tests passed; shared TypeScript noEmit passed; focused ESLint had no errors, with existing warnings.
- Latest six-model acceptance renderer and Tauri release `.app` build passed (22.85 MiB); log: `/tmp/opentu-desktop-six-model-acceptance-build.log`.
- The latest bundle was quit/relaunched through native UI automation. The separate test board reopened with visible generated images, and all 27 task records remained (0 generating, 22 completed, 5 failed). Accessible library/send labels were visible. The fixed-1K parameter panel showed automatic/1:1/2:3/3:2 sizes, quality and automatic/opaque background, without 2K/4K controls; selecting 1:1 updated the native UI. No new paid generation was submitted during this restart check.

## Outstanding Delivery Gates

- Native macOS coverage includes the requested six models (five passed, VIP failed), GPT image workflow, dimensions, quantity, canvas rendering, insertion, download and restart persistence. This does not establish support for all 150 discovered image models, every size/quality combination, or paid reference-image editing.
- VIP needs an upstream availability investigation and a successful authorized retest before it can be advertised as verified.
- Signing, notarization, distribution and Windows/Linux native smoke tests have not been performed.
- The current bundle is a local verification build, not a confirmed production release.
