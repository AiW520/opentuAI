## 1. Baseline and Scope

- [x] 1.1 Validate this proposal and record the pinned upstream `develop` commit.
- [x] 1.2 Create an integration branch from the current desktop branch without touching existing untracked files.
- [x] 1.3 Record the upstream files and commits selected for porting and the deferred areas.

## 2. Model and Provider Contracts

- [x] 2.1 Port the v1.1.24 model catalog and capability metadata with desktop-safe defaults.
- [x] 2.2 Port GPT Image 2.5 advanced parameter and transparent-background routing.
- [x] 2.3 Port Seedance 2.5 and MiniMax-H3 parameter routing and response metadata.
- [x] 2.4 Port safe Tuzi model/provider synchronization and manual-provider persistence behavior.
- [x] 2.5 Add or update adapter and routing tests for supported and unsupported capability combinations.

## 3. Image, Canvas, and Media Behavior

- [x] 3.1 Port request recovery and Request ID polling without bypassing native media storage.
- [x] 3.2 Port reference-image import and drag/drop race fixes.
- [x] 3.3 Port image generation details and canvas inspection behavior through the desktop renderer.
- [x] 3.4 Verify preview, download, cache eviction, and restart persistence for generated media.

## 4. Desktop Integration

- [x] 4.1 Reconcile shared composer/model-picker changes with Tauri URL, filesystem, and CSP constraints.
- [x] 4.2 Preserve updater event handling, signature checks, release asset mapping, and download-page behavior.
- [x] 4.3 Keep browser-only workflow/account/analytics changes excluded and document follow-up scope.

## 5. Verification and Delivery

- [x] 5.1 Run focused unit and integration tests for models, routing, recovery, media, and provider settings.
- [x] 5.2 Run typecheck, lint, and both renderer builds. Native desktop production packaging is blocked locally because `cargo` is unavailable.
- [ ] 5.3 Run updater signature verification and inspect all platform artifacts. Blocked locally: `cargo` and `TAURI_UPDATER_PUBLIC_KEY` are unavailable.
- [ ] 5.4 Run desktop smoke tests for text, image, reference-image, video, canvas insertion, download, and restart persistence. Requires a native Tauri build.
- [ ] 5.5 Run the approved live Tuzi smoke matrix without storing credentials in the repository. Requires the runtime API credential to be supplied in the test environment.
- [x] 5.6 Update version/release metadata and report any platform signing or notarization limits.
