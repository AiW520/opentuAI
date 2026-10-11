# OpenTu Desktop 1.2.13 parity QA

Date: 2026-10-11  
Upstream source: `ljquan/opentu` `develop` at `df1715ab878d939418fb3d2e1fd793e585be7bd2` (web 1.1.25)  
Desktop version: `1.2.13`

## Verified

- Shared regression suite: 118 passed, 1 skipped. The skipped case requires the external `BATCH_XLSX_TEST_FILE` fixture.
- Desktop tests: 10 passed (Umami startup and updater behavior).
- Desktop TypeScript check: `pnpm exec tsc --noEmit -p apps/desktop/tsconfig.app.json` passed.
- Renderer production build: `pnpm run build:renderer` passed.
- Browser QA against the production renderer: 8 checks passed with no page errors.
- XLSX import/export preserved embedded image dimensions, row mapping after blank rows, selected export, and manual insertion metadata.
- Prompt history stayed inside 1440px and 1024px viewports and closed with Escape.
- Target settings were visible and both follow/center switches toggled successfully. TDesign base styles are explicitly loaded by the desktop entrypoint.
- Desktop Umami loader was exercised with the configured endpoint and returned HTTP 200 in the previous integration check; payloads are normalized to `desktop.opentu.ai/desktop` without local paths.

## Release gates still requiring the build environment

- No native installer was built or launched in this workspace because the Rust toolchain is unavailable. The browser preview at `http://127.0.0.1:7341/` is not an installer test.
- Signed updater manifests, notarization/signing, and platform installers must be checked by the CI/build host before publishing a new release.
- Umami delivery was verified at the SDK/request level, but the authenticated dashboard count and a signed native build have not been independently checked here.
- The published download manifest remains `v1.2.12-preview.1`; this change does not alter existing public download links.

## Reproduction

```text
node scripts/verify-desktop-web-parity.cjs
```

Artifacts are written to `outputs/desktop-web-parity/`, including `result.json`, screenshots, and workbook fixtures.
