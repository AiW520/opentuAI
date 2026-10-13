# Desktop storage cleanup QA: 1.2.15

Validated on macOS on 2026-10-13. Release target: `v1.2.15-preview.1`.

## Coverage

- Rust library: 43 tests passed, including cleanup path boundaries, symlinks, stale identities, failures and legacy media directories.
- Desktop frontend: 16 tests passed, including updater behavior.
- Drawnix focused tests: 11 cleanup, 2 file scheduler, 5 local data clearing and 3 update prompt tests passed.
- Desktop and Drawnix TypeScript checks passed. Release tooling tests and strict OpenSpec cleanup validation passed.
- Playwright exercised the desktop renderer at desktop and mobile sizes with mocked native IPC. Checked reference and unknown-file blocking, directory actions, confirmation, partial deletion failure and preview clearing. No page errors or cleanup panel horizontal overflow.
- A production macOS app was built and launched against the existing local data. The saved board and its media loaded. The menu contained Check for Updates. Storage settings scanned 26 files (57.8 MB), displayed references, blocked referenced-file deletion, filtered by filename and refreshed successfully. Opening the media directory launched Finder at the correct location.
- Native acceptance found a WebKit compatibility issue: an absent legacy database can remain enumerated after an aborted migration. The fix skips only `oldVersion=0` creation attempts aborted with `AbortError`; persisted database inspection errors still block deletion. The packaged app was restarted and the actual scan then completed without this error.
- Remote preview builds also run the focused storage cleanup and file scheduler tests before packaging.

## Limits

- Actual user originals were not deleted during native acceptance. Native deletion is covered by Rust temporary-directory tests; UI deletion uses isolated mocked fixtures.
- Local native runtime testing covers macOS only. Windows and Linux receive automated build/test coverage through the release matrix.
- No measured p50/p95 performance claim is made. The change bounds database batches and concurrent native writes, yields between batches, coalesces pending writes and debounces search.
- Actual installation of the next update was not tested. Existing updater lifecycle tests and release asset/signature checks cover the supported path. Older versions without the updater require one manual upgrade.
- This remains a preview: Tauri update payloads are signed, but Apple Developer ID signing/notarization and Windows Authenticode signing are not configured.
