# Change: Synchronize both upstream canvases into desktop

## Why

On 2026-10-28, the GitHub API reported `ljquan/opentu` develop at
`5ef5e7da9dcd73771c174b39cbabc190c1daba69` and
`basketikun/infinite-canvas` main at `9cd3deacbcc598361807afc16c059a80dd18b6f9`.
The desktop integrates and modifies both canvases, and has pending, uncommitted
desktop recovery, update, navigation and cache work. OpenTu commit `b58a5463`
removes its standalone workflow, conflicting with the desktop requirement to
retain the independently integrated infinite canvas.

## Options

| | A: merge or replace from upstream | B: port pinned upstream changes with adaptations |
| --- | --- | --- |
| Advantages | Easier to track upstream ancestry and broad source parity | Preserves both desktop canvases and allows review of conflicting behavior |
| Drawbacks | Large conflicts and removal of the standalone workflow | Requires explicit change mapping, dependency analysis and ongoing tracking |
| Suitable when | Upstream architecture and product requirements match | Desktop intentionally differs from both upstream products |
| Maintenance | Simpler ancestry after an expensive convergence | Maintain version pins, adaptations, tests and a parity ledger |
| Risks | Loss of workflow integration, local data compatibility or pending desktop features | Missing a dependent change unless each upstream feature is mapped and verified |

Recommended option B preserves the requested two-canvas product while aiming
for equivalent applicable upstream behavior. Treat upstream removal of the
workflow as an intentional divergence, not as an instruction to delete it.

## Scope

- Obtain and verify complete pinned source and compare it with the actual local
  integration baselines; the GitHub API inventory is preliminary, not a full
  source diff. Identify already-imported, missing, conflicting, and unsupported
  changes, including dependencies and any new data fields.
- Port applicable OpenTu free-canvas features and fixes, including reviewing
  image editing, view restoration, source links, model loading, image caching,
  guides and user-facing feature notices.
- Port applicable Infinite Canvas features and fixes, including reviewing
  image quality and default resolutions, canvas element list, in-place
  regeneration and reference-connection behavior.
- Preserve desktop navigation, project data, settings, original credentials,
  recovery, update guards, cache and native media handling. Add migrations and
  backward compatibility where any added fields require them.
- Record exact pins, mapped changes, intentional exclusions and test evidence.
  No release is implied by completion of code synchronization.

## Verification

Run focused automated tests, relevant desktop and workflow type checks and
production builds. Validate both canvases, existing project restoration,
generation and recovery without duplicate submissions, cache, offline behavior,
and update guards in an isolated native desktop environment. Record manual,
platform and signed-update gaps; do not label release-ready without completing
the required native and upgrade checks.

## Approval

Option B approved by the user on 2026-10-28 for this two-upstream synchronization.
