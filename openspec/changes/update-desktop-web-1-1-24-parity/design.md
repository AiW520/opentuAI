## Context

The desktop branch is a descendant of an older web baseline and has 99 commits that are not present on upstream `develop`; upstream has 108 commits that are not present locally. The upstream tree does not contain the desktop Tauri application. Shared renderer code therefore needs selective porting instead of a branch merge.

## Goals / Non-Goals

- Goals: bring the stable model, request, recovery, provider, and media-detail improvements to the desktop app; keep native file handling and release behavior intact; provide a repeatable validation gate.
- Non-goals: make the full Web Workflow runtime a desktop dependency, add browser-only account authentication, or replace the desktop updater/release pipeline.

## Decisions

- Treat the current desktop branch as the integration base and use upstream `develop` only as a source of reviewed commits and code hunks.
- Port protocol and model-adapter changes before UI-only changes, with tests around request payloads, capability gating, and recovery state.
- Keep model IDs runtime-discoverable where the Tuzi endpoint supports them; static entries must have safe defaults and must not expose controls unsupported by the selected adapter.
- Route all generated media through the existing desktop cache and virtual URL interceptor. Upstream browser URLs are not allowed to bypass native storage.
- Keep parent-window token and postMessage onboarding disabled in Tauri. Native settings remain the source of provider credentials.
- Advance the desktop version after integration, then build the renderer and Tauri bundles before publishing release metadata.

## Risks / Trade-offs

- Upstream request contracts can diverge from the configured Tuzi endpoint. Mitigation: adapter contract tests and a live smoke matrix using one small request per selected model family.
- New video/image results can bypass native storage if inserted through browser-only helpers. Mitigation: desktop-specific media-path tests and end-to-end insertion/download checks.
- The shared composer has a high conflict rate with desktop fixes. Mitigation: port focused helpers and behavior tests, then reconcile the renderer manually rather than copying the whole component.
- The deferred Workflow runtime may leave feature parity gaps. Mitigation: document the non-goal and track it as a separate proposal.

## Migration Plan

1. Record the upstream commit and create a desktop integration branch from the current working branch.
2. Port model metadata and adapter contracts, then run focused unit tests.
3. Port recovery, reference-image, and detail UI behavior through desktop media adapters.
4. Run typecheck, lint, focused tests, renderer build, Tauri build, and updater signature verification.
5. Run a live smoke matrix against the configured Tuzi endpoint without committing credentials.
6. Update version/release metadata only after all required checks pass; retain a rollback point at the pre-migration commit.

## Rollback

Revert the migration commits and restore the pre-migration version metadata. Do not delete user data, cached media, signing secrets, or release assets.
