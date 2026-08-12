## 1. Baseline Recovery

- [x] 1.1 Create a dedicated integration branch from the complete desktop feature line.
- [x] 1.2 Apply the five valid CI/build gate commits from the current desktop `main` without reverting desktop features.
- [x] 1.3 Record the pinned web `develop@927f4b29` baseline in repository metadata.

## 2. Web 1.0.16 Integration

- [x] 2.1 Merge the pinned web baseline and retain all non-platform-specific renderer features and fixes.
- [x] 2.2 Resolve provider settings, model catalog, endpoint routing, and Seedance 2.0 conflicts.
- [x] 2.3 Resolve AI taskbar, request recovery, reference-image, and task lifecycle conflicts.
- [x] 2.4 Resolve media library, actual-dimension preview, cache, and local-data clearing conflicts.
- [x] 2.5 Preserve the Gemini 3.1 usable image response fix in both web and desktop fetch paths.

## 3. Desktop Runtime Adaptation

- [x] 3.1 Keep Service Worker registration disabled in production desktop and provide safe fallbacks for new web calls.
- [x] 3.2 Make native durable media the desktop recovery source when browser cache entries are missing.
- [x] 3.3 Ensure local-data clearing does not delete native durable media without explicit user intent.
- [ ] 3.4 Complete bounded reference-image materialization and remove large durable base64 payloads after submission.
- [ ] 3.5 Replace large JSON number-array writes with a bounded binary transfer path.
- [ ] 3.6 Clean up failed native imports and surface local preview failures in the UI.
- [ ] 3.7 Tighten production desktop CSP and document any remaining compatibility exceptions.

## 4. Version And Release

- [ ] 4.1 Synchronize all desktop semantic version files and record the web baseline separately.
- [ ] 4.2 Preserve updater signing and repository ownership configuration.
- [ ] 4.3 Make release creation idempotent and pass release notes without shell interpolation.
- [ ] 4.4 Keep draft, signing, checksums, asset completeness, and platform verification gates intact.

## 5. Verification

- [x] 5.1 Run OpenSpec strict validation.
- [x] 5.2 Install dependencies with the locked package manager and lockfile.
- [ ] 5.3 Run TypeScript checks, lint, focused Vitest, and the broader relevant test suite.
- [ ] 5.4 Run web and desktop renderer production builds.
- [ ] 5.5 Run Rust tests and a Tauri production build where the required toolchain is available.
- [ ] 5.6 Run desktop smoke tests for import, preview, reference generation, refresh recovery, export, delete, data clearing, and restart recovery.
- [ ] 5.7 Verify the branch contains no secrets, generated packages, or unrelated user files.
