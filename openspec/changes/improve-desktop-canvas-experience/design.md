## Evidence and source boundary

- `apps/desktop/src/main.tsx` imports the virtual-media interceptor before bootstrap; that interceptor imports the full Drawnix export. Bootstrap later awaits another full export for file-write registration. This is a candidate startup dependency hot spot, not measured proof of latency yet.
- The release's `apps/web/src/app/app.tsx` has no `NewExperienceHome`. The original workspace contains that new home plus newer two-canvas navigation, shared settings and other uncommitted UI changes. `/Applications/Opentu.app` reports numeric version 1.2.15. Version alone therefore cannot identify a source build. Record build identity in the benchmark.
- `image-generation-recovery-service.ts` already performs bounded query-only recovery and caches successful image URLs. It currently queries `/v1/images/generations/result?request_id=...`. `workflow-local-task.ts` and native task recovery have separate adapters into this behavior.
- `image-generation-recovery-metadata.ts` already constructs `/log/get-request?id=...` and captures `X-Oneapi-Request-Id`; recording a recovery URL is not the same as issuing and applying that lookup.
- The available Tuzi server source routes `/log/get-request` through token/user authentication and request-result scope checks. It accepts client IDs or gateway IDs and returns `succeeded`, `failed` or `processing_or_not_found`; log lookup includes asynchronous task sources. This is repository contract evidence, not an authenticated live check of the user's example request.
- The existing updater checks on startup, reconnect, periodic interval and menu action. `downloadAndInstall` then calls `relaunch`; a metadata fallback opens the download page. The update prompt currently belongs to the Drawnix deferred UI and filters its task queue. Verify overlay visibility and task coverage when either canvas is active rather than assuming coverage from the downloader alone.

## Desktop navigation

Use a small desktop-only preference for canvas kind and a safe project reference. Store no document contents or credentials in the preference. Explicit valid project links take precedence. Validate restored references after storage hydration; missing references open a valid canvas/project without deleting existing data. Desktop navigation never loads or returns to featured home. Both canvas toolbars retain project selection, settings, task access and a visible canvas switch.

Review local shell/settings modules as a dependency graph. Port only the pieces needed for two-canvas navigation, existing model configuration and this change; do not import unrelated image editing, model UI, tools or media behavior. Prevent parallel independent work on the original dirty workspace.

## Loading and cache

Measure the same isolated QA build/data before and after: empty, approximately 500-element and 2,000-element fixtures, plus an image-heavy fixture using local assets. Record device/OS/build, repeat count, median, range and p95 when samples support it. Measure time to usable canvas, first and repeat switches, image hydration, save completion, long tasks and memory when available. No paid generation is needed for performance fixtures.

Load the active canvas first. Reuse one pending/successful module-load promise and clear it on failure so retry works. Background preloading must be cancelable and must not make inactive canvas services, timers or original-image decoding active. Keep only lightweight route/module metadata warm unless measurements justify more.

Prefer thumbnails for project/media lists and hydrate originals when the active canvas needs them. Deduplicate concurrent reads and release object URLs/readers when unused. Keep existing durable files, virtual URLs and storage format. Only coalesce replaceable workspace autosaves; submission identity, accepted remote IDs, terminal results and explicit saves must settle durably. Do not delete user media or raise cache quotas as an unmeasured performance fix.

## Request-result recovery

Persist a unique printable ASCII submission ID of at most 128 characters before the formal trusted Tuzi image POST. Preserve any gateway request ID when provided, without confusing it with the client submission ID. Use the original request's provider and key identity; changing the active model/key does not redirect old lookups. Do not copy a raw API key into task metadata; reuse existing credential resolution/fingerprints and pause with a clear original-configuration message when unavailable.

Use one lookup contract/parser shared by both canvas adapters: trusted origin root `/log/get-request`, query `id`, Bearer auth from original credentials, no stale submission header. `succeeded` requires valid returned media URLs; `failed` uses sanitized `error.message`; `processing_or_not_found` means uncertain, never proof of rejection. Query cancellation, 401/403, 429, missing IDs and mismatched echoed IDs must preserve current attempt ownership. Legacy endpoint compatibility, if actually required, must be query-only and tested; do not issue two simultaneous lookup streams.

Start automatic lookup only after an ambiguous original submission has settled/released its execution lock or after restart restores a recoverable attempt. Keep the existing automatic bounds and original deadline. On success, cache using normal media paths and fill the original placeholder/target exactly once. Cancellation/deletion/retry/key change must prevent late insertion into a replacement task or another project. Cache failure preserves the validated remote result with a download warning.

Provide contextual single manual lookup for attempts beyond automatic recovery or for a user-supplied request ID and explicitly selected original provider. Preserve the old task's failure/cancellation record; a lookup result is a separate recovered result and must not silently reanimate a cancelled/deleted task. If a free image arrives without a known original target, show preview and let the user insert it in the current canvas explicitly. No generation POST is issued by a recovery action.

## Update experience

Mount a single shared desktop notification/check owner outside canvas-specific overlays. Preserve startup/reconnect/periodic/menu checks and in-memory discovered update replay. Keep signed-update and manual-download fallback labels distinct. Do not trigger download/install/restart without the user's update click.

Guard the transition into install/relaunch against active generation/recovery and pending writes across both canvas runtimes. Flush required project/task writes before relaunch and retain the running app with actionable error when flush/install fails. Installed-but-relaunch-failed state retries only relaunch. Existing installations without the updater still need one manual installation.

## Verification and limitations

Run focused navigation, cancellation/credential/duplicate insertion, media lifecycle and updater state tests, desktop typecheck and build. Use the independent QA identity/data directory for native UI checks. Test cold/warm entry, both canvas switches, offline/cache failure, restart restoration and deterministic lost-response recovery without paid generation. Authenticated live recovery of an existing request is read-only; use the original key only through its existing private configuration and do not print it. A mocked response is not live supplier evidence.

Signed artifact checks and public metadata availability do not prove a real updater replacement/relaunch. Record a real supported-old-to-new signed upgrade on the available OS separately, and keep untested OS upgrades explicit. New release publication follows verification and applicable authorization; preserve the original workspace and existing release assets.
