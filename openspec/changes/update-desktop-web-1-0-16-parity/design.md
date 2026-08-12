## Context

The web and desktop histories share commit `578f76da` but have accumulated independent changes. The full desktop line contains native media storage, path grants, updater and release hardening that are absent from the current desktop `main`. Web `develop@927f4b29` contains the current provider catalog, request recovery, taskbar, local-data clearing, media preview, and Service Worker fixes.

The desktop renderer reuses the web application but intentionally does not register a Service Worker. Durable media is owned by the native filesystem, while browser metadata and UI state remain in IndexedDB and related browser stores.

## Goals

- Make desktop renderer behavior match web 1.0.16 where platform semantics are shared.
- Preserve and complete desktop-native security, storage, download, update, and release behavior.
- Keep existing user media and metadata readable across the upgrade.
- Establish a repeatable upstream synchronization boundary.

## Non-Goals

- Replacing Tauri or rewriting the application as a separate desktop UI.
- Publishing or merging the synchronized branch before validation and review.
- Enabling Service Worker registration inside the production desktop WebView.
- Deleting legacy localized media directories or existing application data.

## Decisions

### Integration baseline

The integration branch starts from the complete desktop feature tip `2e11918f`, then applies the five valid CI/build commits from the current desktop `main`. Web changes are integrated from the explicit commit `927f4b29`, not from a moving branch name.

### Shared renderer with runtime adapters

Shared feature code follows web 1.0.16 unless it assumes browser-only Service Worker or Cache Storage ownership. Platform decisions SHALL use explicit runtime helpers and native adapters instead of scattered `window.__TAURI_INTERNALS__` conditionals.

### Desktop cache and task policy

Production desktop continues without Service Worker registration. Browser-only Service Worker calls must either be skipped safely or route to a desktop fallback. Native durable media remains authoritative for generated and imported assets; Cache Storage is a bounded compatibility layer, not the only recovery source.

### Local-data clearing

Web cache clearing semantics are preserved, but desktop clearing must not delete native durable media unless the user explicitly selects a desktop media deletion action. Login state, provider settings, and user preferences remain governed by the web specification.

### Version model

The desktop product version is a single semantic version synchronized across root package metadata, desktop package metadata, Tauri configuration, Cargo, and generated web version metadata. The synchronized web baseline is recorded separately so product version ordering is not confused with upstream web versions.

### Release workflow safety

Release notes are passed through a quoted file or stdin. Release creation is idempotent: a rerun reuses the draft for the same tag rather than failing or publishing partial assets. Formal release still requires signing, checksums, updater signatures, and all platform gates.

## Risks

- Cache and task recovery conflicts can create duplicate submissions or lost results. Mitigation: retain request IDs, execution ownership checks, and targeted recovery tests.
- Desktop local-data clearing can accidentally remove durable files. Mitigation: separate metadata/cache clearing from native media deletion and add desktop-specific tests.
- Reference images can inflate memory through base64 and JSON arrays. Mitigation: prefer stable native references, bound materialization concurrency, and use a binary transfer path for large writes.
- A large merge can silently keep obsolete behavior. Mitigation: resolve conflicts by capability, retain upstream tests, and add desktop parity tests around every platform exception.

## Migration Plan

1. Preserve current remote refs and create a dedicated integration branch.
2. Restore the complete desktop line and current valid build gates.
3. Merge web 1.0.16 and resolve shared feature conflicts by capability.
4. Complete desktop runtime adapters, versioning, and release fixes.
5. Validate TypeScript, unit, E2E, Rust, renderer, and platform package gates.
6. Submit reviewable PRs without merging or releasing automatically.

Rollback is branch-level before release. Existing user data formats remain readable; no destructive data migration is introduced by this change.
