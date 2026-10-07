## Context

The recorded upstream snapshot is an ancestor of desktop HEAD. A three-way integration can preserve desktop-only files; a whole-tree replacement cannot. The upstream adds workflow code, browser authentication bridges, build assets and CSS processing, and substantial task changes.

## Decisions

- Pin upstream commit `647e378d8c3b0213e688f2878efefc0042d0b04b` and use three-way integration on a dedicated codex branch, resolving shared conflicts by capability.
- Validate changes in three groups: canvas/image experience; provider/media/recovery; workflow/document tooling.
- Preserve native storage/cache/download adapters and desktop-only regression tests when upstream changes their shared callers.
- Disable Web parent onboarding and system-token account mode in the desktop runtime; preserve manual provider configuration. Do not implement the separately gated native OAuth contract.
- Bundle workflow resources locally, isolate workflow CSS, and preserve production CSP without allowing arbitrary scripts.
- Preserve the desktop version (currently 1.2.10) independently of web 1.1.23. Do not publish or downgrade updater metadata during integration.
- External layer decomposition requires a configured real backend; unavailable backends must yield an actionable unavailable state, not simulated success. Do not bundle model weights or install a server implicitly.

## Risks And Mitigation

- New recovery paths could resend charged requests: preserve submission identity, route ownership and read-only recovery tests.
- Browser cache changes could orphan native files: preserve canonical native paths and verify restart/import/export/clear behavior.
- Workflow uses routes, workers and static assets: verify production assets and navigation, then smoke test the real desktop runtime.
- Package success cannot establish platform signing/installation: record native and platform limitations explicitly before distribution.

## Rollback

Retain the pre-integration HEAD `d3e955b4` as the source baseline. Do not perform destructive data migrations or resets. Release only after the applicable install, signing, updater and migration gates pass.
