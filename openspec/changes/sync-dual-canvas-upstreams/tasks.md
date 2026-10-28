## 1. Inventory and approval
- [x] 1.1 Obtain complete upstream source at the pinned revisions; verify hashes and licenses.
- [ ] 1.2 Establish actual local baselines and document per-feature changes, dependencies and explicit exclusions.
- [ ] 1.3 Validate the proposal and record approval for the synchronization method (option B approved on 2026-10-28; strict validation pending).

## 2. Integration
- [ ] 2.1 Integrate applicable free-canvas changes while retaining desktop functionality.
- [ ] 2.2 Integrate applicable infinite-canvas changes while retaining host, provider and data integration.
- [ ] 2.3 Handle any new fields and existing-data compatibility; update parity ledger.

## 3. Acceptance
- [ ] 3.1 Run focused tests, desktop/workflow type checks, builds and diff checks.
- [ ] 3.2 Verify both native canvas workflows, project and image persistence, generation/recovery and update guards.
- [ ] 3.3 Document performance, signed upgrades, cross-platform gaps and release readiness.

## Progress
- OpenTu develop `5ef5e7da9dcd73771c174b39cbabc190c1daba69` fetched as `upstream-ljquan/develop`; current desktop descriptor remains at 1.1.28 until parity is verified.
- Infinite Canvas main `9cd3deacbcc598361807afc16c059a80dd18b6f9` checked out separately in `/tmp/opentu-infinite-upstream-9cd3deac`; MIT license retained in the integrated source. The historical baseline is still being verified.
- Ported OpenTu commits `8fea6ce0` (text card reading/copy), `049e01ed` (preserve selected generation mode), `6536f997` (reference preview) and the source portion of `fefd92f7` (reference MIME recognition), with adapted tests.
- Ported OpenTu `da61b3ce` Image 2.5 prompt-ratio and resolution request handling; adapted the existing Tuzi adapter tests. Resolver and adapter tests (103) and image recovery tests (51) pass; real provider and native desktop integration remain unverified.
- Partially adapted OpenTu `76cb9a6e`: Gemini size/tier mapping is used by direct and shared API requests while retaining request identity and cancellation; browser-side image downloads have a 30-second abort/fallback. The remaining cache-write, decode and image-display recovery changes are still pending; native desktop download uses its own Rust timeout.
- Further adapted `76cb9a6e` task previews: bounded cache reads and eager preview loading, ignored late cache results, retried the original source after a bad cached Blob, and exposed a preview-only retry. Desktop asset URLs retain their existing handling. Thirteen focused component tests and the drawnix type check pass; cache-write, decode, other display recovery and native acceptance remain pending. OpenSpec strict validation could not run because its CLI is not installed in this workspace.
- Ported Infinite Canvas commits `fb061e8` (storage estimate fallback), `6f01173` (reference hint), `4ec0636` (duplicate references), `99bb4b3` (resize observation), `e5193b6` (toolbar language), `ab11c3b` (overlay scale), and `88fd1e2` (element thumbnail view).
- Partially adapted Infinite Canvas `4aa64c4`: added `xhigh`/`max` quality options and image plugin `resolution` for generation and editing. Existing quality-to-size and Gemini mappings remain in place for saved projects; full quality/resolution separation and the new Gemini plugin template still require compatibility design and validation.
- Ported Infinite Canvas `660365c`: hide the node hover toolbar while selecting reference nodes.
- Adapted Infinite Canvas `bc6689a` and the node/panel portion of `6e09f61` for focus positioning; added geometry tests. Ported header sizing from `1c66ca5` and reduced repeated array copying when grouping list entries. The hover-toolbar portion still requires integration.
- Adapted `b444f7d`: the toolbar can focus one selected node without discarding a multi-selection; optional auto-focus defaults off and persists through existing config hydration. Native interaction still needs acceptance testing.
- Isolated Chromium verification: a text node could be focused, multi-selection disabled the focus button, auto-focus persisted across reload, and its open panel stayed above the bottom toolbar. No page errors observed. This does not substitute for native desktop acceptance.
- Focused text card, generation-mode, reference preview, Gemini MIME, native recovery, storage and fallback tests passed; desktop renderer build and drawnix type check passed. An isolated browser uploaded a PNG, verified list and grid thumbnails, and confirmed image and grid-mode restoration after reload. Grid thumbnails use the same lazy, leased storage path as list thumbnails, including storage-key-only records. Native desktop UI, full parity and signed upgrades are still unverified.
- Other upstream commits, including image editing and quality/resolution preferences, remain to be mapped, integrated and validated. This is not full parity and is not release-ready.
