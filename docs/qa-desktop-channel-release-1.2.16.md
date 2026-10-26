# Desktop channel attribution release 1.2.16

## Scope

Release tag: `v1.2.16-preview.1`. Numeric app/updater version: `1.2.16`.
Base: published desktop source `42bdbf831153a83f4b9c0a0cd727e3373b300634`.
The release adds the approved single Tuzi desktop channel without importing the unrelated canvas/UI changes in the existing local working tree.

Signed update-preview/production builds resolve to `ch=3`; development, local, missing-proof and unsigned builds resolve to `0`. Exact trusted/configured Tuzi model invocation and polling endpoints are attributed before proxy wrapping. Third-party APIs, metadata and signed media downloads are preserved. The field is analytics metadata, not authentication or pricing authority. No server schema or API fields are added.

The existing `AiW520/opentuAI` preview updater channel is used. Tauri update signatures are required; Apple Developer ID notarization and Windows Authenticode are not configured, as for 1.2.15. This remains a preview release.

## Local checks

- Release integrity/channel resolution: 3 Node tests passed.
- Renderer attribution, provider transport and text request behavior: 175 tests passed; existing IndexedDB test-environment diagnostics are present without assertion failures.
- Workflow channel request boundary: 4 tests passed with the workflow config.
- Desktop application TypeScript check passed.
- OpenSpec strict validation passed.
- Version consistency check passed.
- Unsigned local renderer production build passed; artifact verification confirmed channel 0/local.

The update-preview workflow must build five platforms, validate compiled channel 3 metadata, verify all manual installer checksums and seven updater signatures, and then publish the release/download channel. Publication results will be appended after the workflow completes.

## Acceptance limits

A separate independent macOS QA build previously completed real text requests from both canvas modes: consumption logs 957 and 2191 recorded `ch=3`, 4 quota each; disposable tokens were disabled. That QA evidence is not a claim of real asynchronous terminal/refund/adjustment coverage. Such supplier acceptance, cross-day settlement and production-scale API-site migration remain pending. This action publishes desktop packages and does not deploy the API service.

## Published result

- Public release: https://github.com/AiW520/opentuAI/releases/tag/v1.2.16-preview.1
- Source: `0fac3105fae8d10b3add525ef102bfe6efe8ed58`; release published 2026-10-26 17:30:45 Asia/Shanghai.
- Update-preview workflow `40296271391`: validate, all five platform builds, publish and Pages deploy succeeded. Every platform verified compiled `channel=3`, `profile=preview` with 460 renderer scripts. Publication verified seven updater signatures.
- Independent Desktop Verification Build `40296269598` also succeeded.
- Post-publication verification passed: five manifests identify the same source/version/channel, eight manual installer URLs return HTTP 200 with matching sizes and GitHub asset digests/checksum files, all seven published signatures match `latest.json`, and live Pages updater/download metadata points to 1.2.16.
- Download channel commit: `e9283004`. Live download page: https://aiw520.github.io/opentuAI/download.html . Existing signed-updater 1.2.15 installations can check for updates; installations without the updater need manual installation.
- Broad CI `40296269535` failed separately. Bundle-size check measured 954 kB against 900 kB; E2E reports unavailable Plait core modules plus UI assertions/timeouts; visual snapshots differ. These checks were not disabled, thresholds were not relaxed, and baselines were not overwritten. Successful package publication is not full product regression acceptance.

Public verification evidence is stored locally in `published-verification.json`, `release-assets.json`, `publish-run.log` and `final-workflow-status.json` under the private release evidence directory. No credentials, updater private keys or user data were committed.
