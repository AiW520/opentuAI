## 1. Native storage operations
- [x] 1.1 Add asynchronous bounded inventory with sizes, types, identities and scan errors.
- [x] 1.2 Add constrained media folder opening and file reveal.
- [x] 1.3 Add exact-file deletion with canonical path and stale identity checks plus per-file results; require frontend ownership verification.
## 2. Reference-aware cleanup
- [x] 2.1 Inspect persisted IndexedDB, local storage, native records and live board references; fail closed on incomplete reads.
- [x] 2.2 Protect referenced or unknown files, coordinate cache/import writes, revalidate selections and remove indexes after successful disk deletion.
- [x] 2.3 Add derived preview-cache clearing without deleting persistent media sources.
## 3. Desktop interface
- [x] 3.1 Add usage summary, file filters, pagination, selection, open/reveal actions and deletion confirmation.
- [x] 3.2 Display referenced projects, blocked actions, released bytes and partial failures; retain existing storage path controls.
- [x] 3.3 Bound reference reads to 200-record batches, yield between batches, debounce filtering and show recent root-matched inventories without allowing stale deletion.
- [x] 3.4 Bound desktop cache writes to two independent destinations, serialize filename collisions, coalesce pending URL updates and await queue drain before cleanup.
## 4. Verification
- [x] 4.1 Verify native boundaries, symlinks, stale files, failures and compatibility directories.
- [x] 4.2 Verify reference protection, incomplete scans, write coordination and metadata cleanup.
- [x] 4.3 Build the desktop renderer and check desktop/mobile layouts and interactions with screenshots.
- [x] 4.4 Test cross-batch references, absent legacy WebKit databases, write ordering, queue drain and failed-write recovery.
- [x] 4.5 Recheck the packaged macOS app after the WebKit compatibility fix.
- [ ] 4.6 Publish verified preview installers and check the live download and update manifests.
