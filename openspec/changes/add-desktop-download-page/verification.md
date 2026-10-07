# Desktop Download Verification

Date: 2026-10-07 (Asia/Shanghai).

## Completed

- Desktop version 1.2.11: package, Tauri, Cargo and Cargo lock version checks passed.
- Integrated upstream web 1.1.23 at `647e378d8c3b0213e688f2878efefc0042d0b04b` and native fixes are committed on `codex/sync-web-1.1.23-desktop` and pushed to `https://github.com/tuziapi/opentu.git`.
- Download page: centered product identity, light neutral background, rounded platform cards and controls, real native desktop screenshot, Lucide icons, OS/architecture/format selection and real release asset metadata.
- Native browser checks at 1440 x 900 and 390 x 844: no horizontal overflow and all image assets loaded. Windows MSI and Linux Deb selection changed installer URL and size correctly.
- Browser anonymous GitHub API requests cannot read the private repository. A verified v1.0.0 metadata snapshot is used as an explicit fallback; version 1.2.11 is not misrepresented as published. Page states that authorized repository access is required.
- Standalone download site packaging passed. Relative media/metadata paths work under a hosting subdirectory.
- Web production build, Service Worker build and desktop TypeScript check passed.
- Local macOS Apple Silicon `.app` (22.85 MiB) and DMG (11.75 MiB) production builds passed. Reopening the app restored existing boards and controls.
- `hdiutil verify` passed for the 1.2.11 DMG. SHA256: `cf0e7dabc5eed21111db39233c047913fb25371b578fa24d7a9ab4303db4b525`.
- Local installer collector produced versioned DMG, SHA256 and manifest with `signed: false` and explicit verification-build notes.
- Tracked source credential scan returned no actual API keys or private keys. User credentials remain local.

## Remote Build And Public Delivery

- Latest installer workflow builds macOS Apple Silicon/Intel, Windows x64 and Linux x64 and uploads unsigned verification artifacts with checksums; the download site is separately packaged.
- Remote workflow: https://github.com/tuziapi/opentu/actions/runs/37582185151 (source `af21d8d8`); completion is pending at the time this record is drafted.
- No public preview or stable Release has been created by this work. Stable signing and notarization gates remain intact.
- Repository is private, has no Pages site, and the current account has push permission but no admin permission. Public hosting and file accessibility need an approved distribution destination.
- Signing secrets are absent. Official distribution requires certificate/updater setup or a user-approved, clearly labelled unsigned preview strategy.
- GPT Image VIP timed out in the previous native acceptance run. This remains a model availability issue, not resolved by packaging. See the parity verification record for all six model results.
- Existing full legacy Drawnix parser/Umami failures are not reported as passing. Windows/Linux runtime behavior has not been tested on physical machines in this session.
