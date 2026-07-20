## Context
The desktop app reuses the web renderer while adding Tauri commands for local storage, downloads, media import, and a custom `opentu-asset` protocol. This makes the product direction viable, but local filesystem access becomes a trust boundary. The implementation must assume renderer code can be compromised by XSS, injected dependencies, or unsafe remote content.

The media pipeline also serves large images, video, audio, ZIP imports, and generated assets. Whole-file base64 conversion and JavaScript array copies are acceptable for small web uploads, but they are not acceptable as a default desktop path.

## Goals
- Constrain desktop file operations to explicit user intent.
- Keep local media operations memory-bounded under large files and batches.
- Preserve current browser behavior where possible.
- Make local asset URLs usable in UI and AI generation without exposing arbitrary filesystem reads.
- Keep GPT Image response behavior compatible with both `url` and `b64_json`.

## Non-Goals
- Rewriting all storage to a new database.
- Adding a new desktop-only media library UI.
- Changing provider profile compatibility semantics beyond safe response/request handling.
- Shipping auto-update signing keys in this change.

## Decisions

### User-approved local file capability
Tauri commands that read, write, move, import, or copy local files must either:
- operate under the configured media root, or
- operate on a path returned by a recent native dialog flow, or
- operate on a save path returned by the save dialog.

Plain renderer-provided arbitrary paths must not be enough for destructive or exfiltrating operations. The implementation can use short-lived in-memory grants keyed by path plus operation type.

Read-only commands are part of the same trust boundary. `read_local_file` and equivalent helpers must require media-root membership or a read grant, reject oversized full reads, and prefer the asset protocol or bounded transfer path for large media.

### Bound native URL downloads
Renderer-requested native downloads must accept only explicitly supported HTTP(S) URLs, resolve and reject loopback, link-local, private, multicast, and otherwise non-public targets unless the product has a documented local-network feature. Redirect destinations must be revalidated.

Downloads must use connection and total/request timeouts, enforce a configured maximum using both `Content-Length` and streamed byte counts, remove partial files on failure, and avoid buffering the full response in memory.

### Keep custom protocol constrained to media root
`opentu-asset` remains the runtime display protocol, but it must only serve canonical files under the configured media root. Large file responses must be range-friendly. Full responses above the bounded threshold should either stream safely or return a clear failure that UI can avoid.

### Do not assume `http://opentu-asset.localhost` is cross-platform
On Windows, Tauri custom protocols are represented as `http://<scheme>.localhost`, while macOS and Linux use `<scheme>://localhost`. The implementation must not make renderer URLs uniformly HTTP unless the desktop runtime adds and owns a real loopback asset server or another documented cross-platform interception mechanism.

The first implementation phase should preserve the existing platform-specific URL adapter and keep both URL forms accepted by detection and parsing helpers. A later cross-platform HTTP unification may be implemented only after the runtime owns the local server lifecycle, port binding, origin allow-list, range handling, and shutdown behavior.

### Use bounded binary file writes for desktop payloads
Renderer-to-Rust writes for large files must avoid converting `Uint8Array` chunks to JSON number arrays. The replacement path should use one of:
- Tauri v2 channels or another supported binary-capable IPC path, or
- a dialog-granted temporary file/stream handoff that never materializes large payloads as JSON arrays.

The old `write_file_chunk_to_path` and `save_file` APIs may remain for small payload compatibility, but large desktop exports, cache writes, and download saves must route through the bounded binary path. Verification should include at least one 10 MB payload and assert the code path does not call `Array.from(chunk)` for the transfer.

### Prefer native desktop import for desktop uploads
Desktop media-library upload should prefer the native picker so file paths are available and large files do not enter the renderer as full `File` blobs. Browser file input remains the fallback for web and unsupported desktop paths.

### Treat desktop filesystem as durable cache truth
In the desktop runtime, the configured media root is the durable source of truth for generated and imported media. Cache Storage may remain as a short-lived hot cache for immediate UI responsiveness and web parity, but it must not be the only path needed to recover generated assets after restart.

Desktop reads should prefer:
1. metadata/file path under media root or desktop asset URL,
2. Cache Storage hot cache,
3. bounded compatibility fallback for older records.

Desktop writes should record metadata only after the durable filesystem write succeeds or should explicitly mark records as pending-durable-write until completion. Cache Storage quotas in WKWebView/WebKitGTK should be bounded lower than web defaults, and large video/audio payloads should avoid duplicate Cache Storage writes unless there is a measured UI need.

### Migrate media directories to stable ASCII names
New desktop media directories should use stable ASCII names (`images`, `videos`, `audio`, `ppt`, `text`, `archives`) to avoid Unicode normalization and locale problems across platforms. Existing localized directories must remain readable during migration.

Migration should:
- create the ASCII directory set on startup,
- resolve reads from both new and legacy localized directories,
- write new files to ASCII directories,
- optionally move legacy files in a resumable, non-destructive step,
- never delete legacy files until the migrated target exists and metadata points to the new path.

### Bounded AI materialization
The UI may carry lightweight references such as virtual URLs or desktop asset URLs. Execution code is responsible for converting references into provider-compatible payloads. Conversion must:
- detect local virtual and desktop asset URLs,
- load through approved cache/protocol helpers,
- compress oversized images before base64 conversion,
- avoid storing full base64 strings in durable task metadata after submission.

### Desktop Service Worker policy
The desktop build must choose one explicit path:
- include the same `sw.js` contract as web if desktop task/cache features depend on it, or
- disable SW registration and use desktop-safe fallback services consistently.

Silent missing `sw.js` registration is not acceptable.

### Response format compatibility
Official GPT Image requests should not add unsupported default `response_format` fields. Explicit `response_format` values may be passed when supported, and response parsing must accept both URL and base64 image results.

## Risks
- Short-lived path grants must not persist across app restarts.
- Some existing download/export flows may rely on direct renderer-provided paths and need migration to dialog-backed calls.
- Reducing CSP may require removing inline/eval assumptions from the desktop shell.

## Validation
- Unit tests for path grant validation and denied arbitrary paths.
- Unit tests for denied private-network downloads, redirect revalidation, timeout, response-size limits, and partial-file cleanup.
- Rust tests for protocol range/full response behavior and media-root escape attempts.
- Vitest coverage for local asset reference conversion into AI requests.
- Manual desktop smoke test for upload, preview, select-as-reference, generate, export, and delete.
