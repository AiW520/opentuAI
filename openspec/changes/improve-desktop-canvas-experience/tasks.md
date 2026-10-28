## 1. Contract and baseline
- [x] 1.1 Inspect published source, original local home/two-canvas changes, existing storage/recovery/update paths and Tuzi server lookup contract.
- [x] 1.2 Confirm startup choice: restore last canvas/project; first run free canvas.
- [x] 1.3 Review and approve this implementation proposal before business-code changes.
- [ ] 1.4 Capture isolated current-build startup/switch/media/save baselines and document device, source and fixture identity.

## 2. Desktop entry and measured loading fixes
- [ ] 2.1 Review/select required local two-canvas shell dependencies without importing unrelated dirty changes.
- [ ] 2.2 Remove desktop featured home/navigation, preserve web behavior, restore valid last canvas/project and first-run free canvas.
- [ ] 2.3 Fix measured eager imports/repeated module reads; preload inactive code only when appropriate and without mounting its runtime.
- [ ] 2.4 Fix measured media read/decode/object-URL and replaceable save hot spots; preserve durable media/task writes and current storage format.
- [ ] 2.5 Verify navigation retry, missing project/config, offline restoration and cross-canvas task continuity.

## 3. Shared image lookup and presentation
- [ ] 3.1 Verify trusted Tuzi original-ID/original-key contract and add the shared `/log/get-request?id=` adapter/parser.
- [ ] 3.2 Wire both canvas paths to the existing bounded recovery lifecycle and preserve submission/gateway IDs correctly.
- [ ] 3.3 Add contextual uncertain/recovering/failed states and manual read-only lookup, including request-ID entry when needed.
- [ ] 3.4 Reuse cache and insertion with current attempt/project ownership, deduplication, remote-URL fallback and no automatic POST.
- [ ] 3.5 Test lost response, restart, success/failure/uncertain, malformed/mismatched IDs, cancellation/deletion/retry, key switch and cache/write failure.

## 4. Shared update experience
- [ ] 4.1 Make discovered updates and manual checks visible in either canvas with one notification owner.
- [ ] 4.2 Verify cross-canvas active-task and persistence flush guards before update/relaunch; retain progress/retry/manual fallback.
- [ ] 4.3 Test discovered-before-mount, offline retry, signature/download failure and restart-only retry.

## 5. Acceptance
- [ ] 5.1 Pass focused tests, desktop typecheck/build, OpenSpec strict and diff checks.
- [ ] 5.2 Repeat isolated native desktop timing and media fixtures; report before/after data and unresolved regressions.
- [ ] 5.3 Verify both canvas entries, project/viewport restoration, recovered-image placement/cache/restart and no duplicated generation submit.
- [ ] 5.4 Verify supported old signed build update notification and actual install/relaunch on the available OS; record other OS gaps.
- [ ] 5.5 Update changelog/pending-test/QA and prepare reviewable artifacts; publish only after actual checks and release authorization.

## Progress notes
- Added desktop last-canvas navigation and last free-board preference; native restoration and the newer local shell still require end-to-end verification.
- Narrowed desktop startup imports and changed both existing query paths to `/log/get-request?id=`. No startup latency improvement has yet been measured.
- Focused recovery, desktop navigation and updater unit tests and desktop renderer build/typecheck passed. The shared update prompt was checked in both canvas views in an isolated browser; native upgrade and cross-runtime guard acceptance remain open.
- Both canvases now expose manual lookup with explicit channel selection, preview and insertion. Isolated browser tests verified insertion and persistence in each canvas using a simulated response. Added guards for channel changes and workflow save failures; production channel and native desktop validation remain open.
- New free-canvas submissions persist a request-bound credential identity and verify it before each recovery query. Legacy tasks without the identity are directed to manual lookup. Workflow-local tasks already validate a route identity; native workflow tasks retain their existing route check.
- Automatic updates now download separately and recheck tasks and canvas persistence before installation and again before relaunch. Unit tests cover a task appearing during download and retrying without downloading again; a real signed native upgrade remains unverified.
- Built and launched an isolated macOS arm64 QA bundle with identifier `com.opentu.desktop.qa-isolated`; it used separate Application Support and WebKit directories. Native accessibility interaction verified the free-to-infinite canvas menu, project creation, project restoration after quit/relaunch, and return to the free canvas. Native visual capture and timed fixtures remain open.
- Acceptance found the free-canvas toolbar did not render its existing infinite-canvas action. Restored the desktop menu item and verified the native and browser round trip; its label has Chinese and English translations.
- Added workflow image remote-URL fallback with an explicit cache warning, and connected the existing free-canvas cache warning to the same manual recovery dialog. Storage and UI failure tests pass.
- On the isolated macOS arm64 QA bundles, the Git HEAD baseline (2d65021f) and the modified build were measured with separate empty free-board profiles. After warmup, alternating launches took 721/747/777 ms for baseline and 704/749/674 ms for the modified build, from invoking `open` until the app-menu button appeared in macOS accessibility. Three samples do not establish a speedup; larger-canvas, media, switching and save timings remain open.
- The system volume had approximately 840 MiB free during acceptance; signed upgrade packages have not been built or exercised.
