# Change: Desktop storage inspection and safe cleanup

## Why

Desktop users need to inspect disk media usage, reveal media in the system file manager, and permanently remove unwanted local files. Existing cache clearing does not provide a disk inventory or reliable reference-aware disk cleanup. The user approved the optimized approach on 2026-10-13.

## What Changes

- Extend desktop storage settings with categorized file sizes/counts, filtering, file selection, folder opening and file reveal.
- Separate derived preview-cache clearing from permanent original-file deletion.
- Preview deletion size/count, protect files referenced by boards, tasks, workflows, knowledge, chat or other local data, and fail closed when reference inspection is incomplete.
- Recheck references and file identities before deletion. Remove matching library/cache indexes only after successful disk deletion; report individual failures.
- Restrict deletion to confirmed application-owned regular files in current media type directories, including legacy directory names; reject symlinks and stale inventory entries.
- Block cleanup during generation, imports, cache writes or pending synchronization. Retain preferences, credentials, projects, backups and external source files.

## Impact

- Affected specs: `desktop-storage-cleanup`.
- Affected code: Tauri storage/media commands, desktop settings, asset and cache services, new desktop cleanup service and panel.
- Coordinates with `improve-desktop-storage-performance` without modifying that existing proposal.
- Disk cleanup releases storage; rendering or decoding latency requires separate measurement.
