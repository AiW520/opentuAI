# Desktop Update Preview 1.2.14 QA

Date: 2026-10-12

## Published Artifact

- Source commit: `a67025654ff935427ff8f153e2fcd5dea3a01a5d`.
- Release: https://github.com/AiW520/opentuAI/releases/tag/v1.2.14-preview.1
- Build, publish and Pages deploy: https://github.com/AiW520/opentuAI/actions/runs/38243340013
- Download page: https://aiw520.github.io/opentuAI/download.html
- App/updater numeric version: `1.2.14`; public tag: `v1.2.14-preview.1`.

## Passed Verification

- macOS ARM64/Intel, Windows x64 and Linux x64/ARM64 production builds, packaging and publication succeeded.
- Build checks passed: desktop TypeScript, 16 updater/release unit tests, 3 prompt lifecycle tests, release/signing gate tests and 117 native parameter coverage tests.
- Seven update payloads passed cryptographic signature verification before publication, including separate Debian payloads for Debian installations.
- The public Pages `latest.json` matches the release manifest. All seven embedded signatures match the published `.sig` files; their URLs target this preview release.
- All eight manual installer URLs returned HTTP 200 with the expected sizes, and their SHA-256 files are accessible. These live checks verify availability; installer byte hashes and signatures were verified in the publication workflow.
- The live download page exposes two macOS, two Windows and four Linux installer choices. ARM64 Debian selection points to the matching installer and checksum.
- Playwright checks at 1440x1000 and 390x844 found no page exceptions, missing images or horizontal overflow. Screenshots are recorded locally under `outputs/desktop-download-live-*.png`.
- The desktop renderer includes the existing community/support QR images and excludes the Web service worker.

## Update Behavior

- A permanent Check for Updates command shares state with startup and periodic checks and reconnect retries.
- Startup state survives deferred UI mounting; update prompts wait for active generation tasks.
- Signed update checks use a timeout, with validated public release metadata as a manual-download fallback.
- Downloads support progress and retry; install/restart guards prevent duplicate operations.
- Earlier installations without the updater plugin need one manual installation. Already-installed `1.2.14` is not offered another update with the same numeric version.

## Broad CI Findings And Acceptance Limits

The separate full CI run did not pass: https://github.com/AiW520/opentuAI/actions/runs/38243338393 . Publication success is not full product acceptance.

- Five viewport E2E cases fail before assertions because they look up the development-only `/@plait_core.js` resource while CI serves a production build. Composer behavior is not evaluated by those failed cases.
- The inspiration E2E case omits the existing-input overwrite confirmation. A desktop production-renderer check confirmed that accepting the dialog correctly inserts the template.
- The image-delete E2E case clicks the selected image, opening its details dialog and focusing a checkbox. Delete therefore targets the dialog rather than the canvas. A desktop renderer check with a valid fixture image passed after closing details and returning focus to the canvas; editing the prompt with Backspace preserved the image. The desktop check substitutes an existing image because `/logo-tuzi.png` is not a packaged desktop asset.
- Visual jobs each pass 39 cases and fail the 640x360 baseline comparison. The actual capture shows the current resource announcement and input controls, while the expected capture shows the older inspiration board and controls. Input and send-button visibility assertions pass; the baseline has not been silently accepted or replaced.
- The main job fails the AI Chat bundle budget: 952.59 kB gzip against a 900 kB limit. The startup app and other measured bundles remain within their limits. This performance gate still needs follow-up.
- No Apple Developer ID/notarization or Windows Authenticode certificates are configured. The preview has Tauri updater integrity signatures; macOS uses an ad-hoc application signature. Operating-system warnings may occur.
- Native installation, first launch and a real subsequent-version signed upgrade on all target operating systems remain unverified. OpenSpec task 8.6 remains open.
- No live provider generation or external-service quota validation was performed.

This release is a preview. The evidence above does not establish a trusted stable release or a defect-free application.
