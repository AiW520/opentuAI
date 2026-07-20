## 1. Desktop Security Boundary
- [x] 1.1 Audit renderer-callable Tauri commands and classify them as read, write, move, delete, import, protocol, or dialog.
- [x] 1.2 Add short-lived dialog-backed path grants for file open/import and save operations.
- [x] 1.3 Reject arbitrary renderer-provided paths unless they are under the canonical media root or covered by a valid grant, including `read_local_file` and other read-only commands.
- [x] 1.4 Remove unused or overly broad desktop permissions and plugin registrations.
- [ ] 1.5 Tighten desktop CSP and document remaining `unsafe-inline` / `unsafe-eval` compatibility exceptions before formal release.
- [x] 1.6 Restrict native URL downloads to validated public HTTP(S) targets with redirect revalidation, timeouts, streamed size limits, and partial-file cleanup.

## 2. Media Library Import And Preview
- [x] 2.1 Prefer native desktop picker for desktop media-library imports.
- [x] 2.2 Validate media type and extension before copying into the durable media directory.
- [ ] 2.3 Clean up temporary files if frontend validation or metadata persistence fails.
- [x] 2.4 Make `opentu-asset` image/video/audio serving range-friendly for large files.
- [ ] 2.5 Add UI fallback messaging for local assets that cannot be previewed.
- [x] 2.6 Preserve the existing platform-specific desktop asset URL adapter until a real cross-platform HTTP asset server exists.
- [ ] 2.7 If cross-platform HTTP asset URLs are implemented, add a runtime-owned loopback asset server with range support, media-root enforcement, lifecycle management, and tests before changing renderer URL generation.

## 3. Memory-Bounded AI Reference Handling
- [x] 3.1 Stop converting AI input uploads to base64 earlier than required when a stable local reference is available.
- [x] 3.2 Extend virtual/local asset detection to include desktop asset URLs where AI execution needs conversion.
- [ ] 3.3 Convert local references to compressed provider payloads at execution time with bounded concurrency.
- [ ] 3.4 Strip base64/reference payloads from in-memory and persisted task records after submission where safe.

## 4. Desktop Runtime Parity
- [x] 4.1 Decide whether desktop bundles `sw.js` or disables SW registration.
- [x] 4.2 Implement the chosen desktop SW/cache/task policy.
- [ ] 4.3 Align desktop cache recovery and task execution paths with that policy.
- [x] 4.4 Handle updater configuration explicitly: signed updater or no updater permission.
- [ ] 4.5 Replace large desktop writes that use `Array.from(Uint8Array)` with a bounded binary transfer path.
- [ ] 4.6 Keep the JSON-number-array write API only for small compatibility payloads and document its size threshold.
- [ ] 4.7 Prefer durable filesystem reads over Cache Storage for desktop generated/imported media recovery.
- [ ] 4.8 Bound desktop Cache Storage usage separately from web defaults and avoid duplicate Cache Storage writes for large video/audio unless required.
- [x] 4.9 Add startup migration for ASCII media subdirectories while keeping legacy localized directories readable.

## 5. Response Compatibility
- [ ] 5.1 Preserve current GPT Image behavior: no unsupported default `response_format`.
- [ ] 5.2 Add explicit `response_format` plumbing only where the selected request schema supports it.
- [ ] 5.3 Keep response parsing compatible with `data[].url`, `data[].b64_json`, and provider gateway variants.

## 6. Verification
- [x] 6.1 Add Rust tests for denied arbitrary paths, media-root escape attempts, and granted import/save paths.
- [x] 6.1.1 Add a regression test proving `read_local_file` rejects ungranted files outside the media root and enforces a bounded read limit.
- [x] 6.1.2 Add regression tests for private-network URL rejection, redirect target validation, timeout, download size limits, and cleanup after failure.
- [x] 6.2 Add Rust tests for large `opentu-asset` range requests and non-range behavior.
- [x] 6.3 Add Vitest tests for desktop/local asset URLs used as image references.
- [x] 6.4 Run targeted Vitest and Cargo tests.
- [ ] 6.5 Run a desktop smoke test covering import, preview, select from library, AI generation, export, and delete.
- [ ] 6.6 Add a 10 MB desktop write benchmark or regression test proving the binary transfer path avoids JSON number arrays.
- [x] 6.7 Add tests for ASCII media directory writes and legacy localized directory reads.
- [ ] 6.8 Add tests for desktop cache recovery when Cache Storage is empty but durable media files exist.
