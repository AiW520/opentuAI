# Desktop warm canvas release 1.2.17

Date: 2026-11-01. Release tag: `v1.2.17-preview.1`. Numeric app/updater version: `1.2.17`.

## Scope

Based on published desktop source `363f8aba6df5389e993fee9a3b9f2e9fbd11a2a4`.
The user approved the warm-white fine-dot canvas, reuse of existing batch image generation, removal of redundant desktop download promotion, visible update reminders during generation, the redesigned download page, and publication of a new installer release.

- Apply warm-white world-aligned dots to the desktop free canvas's default/colorful themes. Preserve explicit dark themes and the independently integrated workflow canvas. Dots are HTML decoration and do not enter document data or image exports.
- Keep the existing batch generation tool and its generation logic.
- Hide the desktop download promotion and its automatic popup inside desktop; keep the resource link.
- Keep desktop update reminders visible during generation and disable installation until generation finishes. Existing persistence/download/install/relaunch guards remain in place.
- Publish the redesigned responsive download page through the existing signed preview channel.
- Add the existing Nx TypeScript-path resolver to the desktop test configuration so analytics tests resolve workspace source consistently with the renderer.
- Increment all five desktop version descriptors to 1.2.17 so 1.2.16 clients can discover the release.

No new data fields, migrations, paid generation, or upstream synchronization are included. Upstream develop parity remains incomplete, as recorded in `openspec/changes/sync-dual-canvas-upstreams/tasks.md`.

## Local verification

- Resource button and update prompt: 16 tests passed.
- Complete desktop utility suite: 23 tests passed, including updater, release parsing, analytics and navigation. The initial analytics import-resolution failure was repaired through the test resolver configuration.
- Release integrity/channel/signing guards: 9 Node tests passed.
- Desktop TypeScript, numeric version consistency, OpenSpec strict validation and diff checks passed.
- Actual renderer browser checks passed: dot alignment during pan/zoom/resize, theme switching, byte-identical PNG export with/without decoration, unchanged document content, resource panel behavior and opening the existing batch generation tool. Tauri bridge was mocked and no generation was submitted.
- Download-page review covered widths 320/390/768/1024/1440, all eight installer/checksum selections and unavailable-release fallback.
- Production renderer build passed in 53.16 seconds; QR assets matched sources, no web service worker was packaged, and the local unsigned build correctly reported channel 0/local across 472 renderer scripts. Existing Sass deprecation and bundle chunk-size warnings remain. Local dependency links are machine-specific and excluded from Git.

## Release checks and limits

Use `.github/workflows/desktop-update-preview.yml` on the public repository's main branch. The workflow builds five platform/architecture targets, checks native core and desktop tests, verifies updater signatures and installer checksums, and publishes the updater/download manifests only after complete artifact validation.

This remains a preview release: Tauri updater integrity signatures are configured; Apple Developer ID notarization and Windows Authenticode are not. No real in-place native upgrade or real provider generation has been verified for this revision. Do not report those scenarios as passed.

## Published result

- Published `v1.2.17-preview.1` from source `91e2dedf06df1c852cdf70a92fba751837a6db93` in `AiW520/opentuAI` on 2026-11-01.
- Update-signed preview workflow `41269194436` succeeded: validation, all five platform builds, complete-asset/signature verification, publication and Pages deployment.
- Independent Desktop Verification Build `41269181873` also succeeded.
- Download channel commit: `48f14a9ae5fa5bcce7ad5590ad06af2b72688db5`.
- Post-publication checks verified all five build manifests against the source/version/channel/profile, eight installer HTTP 200 responses and lengths, GitHub asset SHA-256 digests against each manifest/checksum file, and all seven updater signature strings against the published update manifest. Signing key IDs match `v1.2.16-preview.2`.
- Live Pages download metadata points to `v1.2.17-preview.1`; live `latest.json` matches the release manifest and advertises `1.2.17`. The redesigned download page is live.
- Evidence is retained locally in `outputs/desktop-release-1.2.17/published-verification.json` and accompanying public release metadata/logs. Machine-specific preview scripts, logs and dependency links were not published as source.

## Separate general CI failures

General Web CI run `41269181822` is not a passing product-wide regression acceptance. Its Linux browser-install steps failed because `ubuntu-latest` supplied Ubuntu 26.04 while the locked Playwright 1.57.0 does not support that OS. The independent macOS visual-regression job passed 38 tests and failed two: a 720x509 versus 720x510 input screenshot and the mobile-landscape snapshot. The mobile-landscape failure also appears in previous run `40709750953`. These checks and snapshot baselines were not disabled or relaxed. The successful desktop release workflow is separate from those unresolved Web checks.
