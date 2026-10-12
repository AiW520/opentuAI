# Change: Synchronize upstream web 1.1.28 into desktop

## Why

The desktop source records upstream web 1.1.25 at
`df1715ab878d939418fb3d2e1fd793e585be7bd2`. On 2026-10-12, live upstream
`https://github.com/ljquan/opentu.git` develop resolves to
`3d84bb7c3b24fe6215a2daa945b80227fbd72456` (web 1.1.28).
The upstream delta touches 180 files and includes shared media lifecycle changes
that intersect native rendering, export, storage, and provider routing.

## Options

| | A: Merge develop | B: Port the pinned incremental changes |
| --- | --- | --- |
| Benefit | Records upstream ancestry and supports future Git merges | Reviews each new behavior against existing desktop integrations |
| Cost | Resolves older divergent web and desktop history together | Requires a mapping of imported commits and desktop adaptations |
| Suitable use | Long-term convergence of both repository histories | Updating this customized desktop release to the newest capabilities |
| Maintenance | Lower ancestry bookkeeping after the initial merge | Maintain the pinned upstream revision and adaptation record |
| Main risk | Broad conflict resolution can undo native media, updater, or release fixes | Omitted dependencies or incomplete imports without an explicit checklist |

The user approved B on 2026-10-12, with the same user-facing feature coverage as A.

## What Changes

- Port Flux 3 image routing and adapter, Suno v6 variants, Gemini aliases,
  Seedream dimensions/quality, Veo parameters, and supported parameter cleanup.
- Port canvas resources and the supplied support/community QR assets.
- Port generation placement fixes, automatic image loading, video cleanup,
  deferred asset loading, export resource handling, and workflow media leases.
- Evaluate local Tuzi session changes against desktop startup and existing
  provider settings. Preserve the upstream loopback-only credential import gate;
  introducing native OAuth or extending token import to a desktop scheme requires
  the separate unified-backend proposal.
- Adapt intersecting changes to native SVG overlays, virtual media URLs,
  filesystem saves, offline data, updater startup, and desktop analytics.
- Keep web-only Service Worker cache changes scoped to the web entry. Desktop
  production remains without a Service Worker.
- Preserve the locally selected B generation-card rendering and its tests.
- Update the upstream descriptor only after verification. Decide the next desktop
  version under the existing release convention, without copying the web version.

## Verification

Run affected model/routing, placement, loading/export, authentication, media,
workflow, cache, and desktop regressions; desktop type checks and renderer build;
then inspect canvas loading, resource controls, failed-card placement, export,
and batch XLSX workflows. Record native-package verification separately from
browser renderer verification. API fixtures do not establish live provider support.

## Impact

- Affected specifications: desktop-web-parity.
- Affected code: shared drawnix/react-board, workflow host/web, web runtime and
  assets, desktop startup as required, upstream descriptor and QA records.
- No data schema migration, destructive cleanup, native OAuth implementation,
  or release publication is included in this approval scope.
- Coordinate with pending desktop-storage and unified-backend proposals without
  marking their independent tasks complete.

## Approval

Approved by the user on 2026-10-12: port incrementally from the existing 1.1.25 baseline.
