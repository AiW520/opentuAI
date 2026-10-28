# Change: Desktop canvas entry, loading and request-result recovery

## Why

The user reports slow desktop startup/canvas interaction and requests a desktop experience focused on the free canvas and infinite canvas, without the featured-content home screen. The user selected restoration of the last canvas/project, with free canvas as the first-run default. Missing image responses must be recoverable using the original API key and request identity. The user also expects visible update notifications and click-to-install/restart.

The published 1.2.16 source and the local 1.2.15 app are different baselines: the featured home and newer canvas shell exist in the original workspace's uncommitted changes, not in the published release tree. Those changes must be reviewed selectively, not copied wholesale. Existing image recovery and updater services already implement much of the requested behavior and must be extended rather than duplicated.

## What Changes

- Desktop startup restores the last valid canvas kind and project; first run enters free canvas. Remove featured home/navigation from desktop entry, while preserving project access, model configuration and switching between both canvases. Web home behavior stays unchanged.
- Measure current desktop startup, first interactive canvas, first/second switch, media hydration and save behavior before selecting performance fixes. Reduce confirmed eager imports, duplicate loads and unnecessary full-image reads using existing lazy loaders, thumbnail/media storage and save scheduling.
- Unify Tuzi image result lookup around the documented `GET /log/get-request?id=...` contract for both canvas paths, reusing current task/recovery services. Preserve original provider/key identity; do not automatically repeat a generation POST.
- Surface concise uncertain/recovering/recovered/failed states and a contextual manual lookup action. Successful recovered images use normal cache/insertion behavior, with remote URL preserved if local cache fails.
- Ensure update notification/check controls are available in the shared desktop shell for both canvases. Retain existing signed download/install/relaunch, progress and failure retry behavior. Test both task and persistence guards.

## Implementation choices

| Approach | Strengths | Costs / risks | Appropriate use |
| --- | --- | --- | --- |
| Targeted reuse of current storage, loaders, recovery and updater (recommended) | Preserves data and request identity; smaller change; measured hot spots can be fixed independently | Requires tracing two canvas paths and verifying the local/published source boundary | This desktop optimization |
| Replace storage/cache engine and rebuild recovery/update flows | Can unify more internals eventually | Requires migration, larger regression scope, more maintenance and risk of project/media loss or duplicate requests | Only after evidence shows existing storage cannot meet requirements |

The proposed implementation uses targeted reuse. It does not set a larger cache budget or promise a speed improvement without before/after measurements.

## Impact

- Affected specs: desktop-canvas-runtime, desktop-image-recovery, desktop-update-experience.
- Affected code: desktop bootstrap/virtual media interceptor, shared app entry, selected newer canvas-shell integration, media/cache/save services only where measured, image recovery service and workflow/native recovery adapters, shared update prompt.
- No API-site deployment, billing change, generation retry, database schema migration, destructive cleanup, raw-key duplication, or public telemetry is included.
- Existing `add-image-request-recovery-polling`, `refactor-startup-shell-loading`, `add-desktop-storage-cleanup` and `update-desktop-release-readiness` remain the authoritative behavior to preserve. The original workspace's uncommitted `improve-desktop-storage-performance` proposal is a reference, not a second implementation to merge wholesale.

## Decisions and approval

- Confirmed by user: restore last canvas/project, first run free canvas, remove desktop home, improve loading/cache and image result retrieval.
- Proposal approval pending: exact loading/recovery/update design below. Per `openspec/AGENTS.md`, implementation begins after review/approval.
- Existing automatic recovery bounds are retained initially: 4 concurrent queries, 5-second polling, up to 60-second backoff, 20-second query timeout, original 15-minute task deadline. Any change to these user-visible limits requires an explicit decision.
- This change is prepared locally. A new public desktop release is a separate completion step after verification; it is not implied by writing this proposal.
