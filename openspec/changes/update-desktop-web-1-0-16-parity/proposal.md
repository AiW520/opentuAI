# Change: Sync desktop with web 1.0.16

## Why

The desktop repository diverged from the web application after their shared May 2026 baseline. The current desktop `main` also lost previously merged desktop hardening commits, so updating by copying the web tree would regress native media, security, and release behavior.

## What Changes

- Restore the complete desktop feature line and retain the later valid CI gate fixes.
- Integrate web `develop` at `927f4b29` (web version `1.0.16`) as the shared renderer baseline.
- Preserve Tauri-native storage, virtual media URLs, downloads, updater integration, and desktop startup behavior behind explicit runtime adapters.
- Adapt web Service Worker, cache, request recovery, local-data clearing, reference-image, provider routing, and task lifecycle changes for the desktop no-Service-Worker policy.
- Unify desktop version metadata and harden the release workflow so reruns are idempotent and release notes cannot execute Markdown as shell syntax.
- Complete the relevant open desktop media security and release-readiness requirements before considering the synchronized build releasable.

## Impact

- Affected specs: `desktop-web-parity`, `desktop-runtime`, `desktop-release`, `image-generation`, `media-preview`, `provider-routing`, `runtime-model-discovery`
- Affected code:
  - `apps/web/src/app/*`
  - `apps/web/src/sw/*`
  - `apps/desktop/*`
  - `packages/drawnix/src/components/*`
  - `packages/drawnix/src/services/*`
  - `packages/drawnix/src/utils/*`
  - `.github/workflows/*`
  - version and release scripts
