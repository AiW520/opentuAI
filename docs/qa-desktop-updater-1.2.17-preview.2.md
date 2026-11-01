# Desktop updater repair 1.2.17 preview.2

Date: 2026-11-01. Release tag: `v1.2.17-preview.2`. Numeric application and updater version remains `1.2.17`, as requested.

## Scope and diagnosis

- Give native update downloads an explicit 30-minute timeout, independent of the 15-second metadata check. The pinned Rust updater 2.10.1 otherwise inherits the check timeout.
- Preserve native string/object error details and report the failed download, preparation, installation or restart stage. Read-only locations and permission failures receive actionable instructions.
- Keep existing downloaded-payload reuse after failed installation; the pinned plugin retains those resources. Keep the existing save/restart protections.
- Retain the warm-white dotted canvas and existing batch image generation. No new persisted fields, migrations or signing keys.

The observed local application was version 1.2.16 running from a read-only mounted DMG. The original native exception was not captured, so the screenshot alone does not prove whether its failure occurred during download or installation. Slow GitHub downloads and the inherited timeout were separately confirmed.

## Upgrade limitations

Existing 1.2.17 clients do not discover another 1.2.17 revision automatically; manually download preview.2 and replace the application after quitting it. Old 1.2.16 clients may still hit their old timeout and need manual installation. On macOS, move the application to Applications and launch it there before attempting future updates.

The release has Tauri updater integrity signatures, but no Apple Developer ID notarization or Windows Authenticode signature. Real native in-place upgrades have not been tested for this revision. No application was replaced or user data modified during diagnosis. Published preview.1 assets remain intact.

## Validation

- Complete desktop utility suite: 29 tests passed, including 16 updater tests. Coverage includes slow downloads, native string/object/empty errors, permissions and retry behavior.
- Update prompt lifecycle: 9 tests passed.
- Release integrity, channel and signing guards: 9 Node tests passed.
- Desktop TypeScript, version consistency and diff checks passed.
- Production renderer build passed in 37.17 seconds. Packaged QR assets match source; no web service worker is included. The unsigned local renderer correctly reports channel 0/local across 472 scripts. Existing Sass deprecation and chunk-size warnings remain.
- Native installers were built and checked by the signed preview workflow; the local environment has no Rust toolchain.

The separate general Web CI limitations documented in `qa-desktop-warm-canvas-1.2.17.md` are outside this updater repair. No snapshot thresholds, baselines or unrelated CI checks were changed.

## Published result

- Published `v1.2.17-preview.2` from source `4a8e414076e86fef1174dccf0d8a15a4d88c1edd` in `AiW520/opentuAI` on 2026-11-01 at 04:49:17 UTC.
- Signed preview workflow `41273696176` succeeded: all five platform builds, artifact/signature validation, publication and Pages deployment. Independent Desktop Verification Build `41273685493` also succeeded.
- Download channel commit: `acb67cfd2ca3844dbd033939ffedb1b9e884af2b`.
- Verified all five platform manifests against source commit, version, channel 3 and preview profile. All eight installer sizes and GitHub SHA-256 digests match the manifests and checksum files.
- All eight installers returned HTTP 200 with matching content lengths through the official public GitHub asset API redirects. Direct `github.com` browser-download checks timed out on this machine, including an HTTP/1.1 retry; direct browser-link reachability is not reported as verified.
- All seven updater signature strings match the release manifest; signing key IDs match retained `v1.2.17-preview.1` assets.
- Live Pages download metadata points to `v1.2.17-preview.2`. Live `latest.json` exactly matches the release manifest and retains numeric version `1.2.17`. The redesigned download page is live.
- Local evidence: `outputs/desktop-release-1.2.17-preview.2/published-verification.json`. Machine-specific outputs are excluded from source publication.

## Separate general CI result

General Web CI `41273685520` failed and is not a passing full-product regression acceptance. Linux browser installation again failed because Playwright 1.57.0 does not support the runner's Ubuntu 26.04. Both macOS visual jobs failed the mobile-landscape screenshot: one had 38 passing and one flaky test (AI input); the other had 37 passing and two flaky tests (AI input and view navigation). The input/navigation retries passed. No checks or screenshot baselines were relaxed. Real native in-place upgrades remain untested.
