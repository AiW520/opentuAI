# Change: Selectively port web develop v1.1.24 capabilities to desktop

## Why

The upstream `ljquan/opentu` `develop` branch is at v1.1.24 and contains useful model, image recovery, provider synchronization, and media detail improvements. The desktop branch has its own Tauri media pipeline, filesystem grants, signed updater, and release workflow, so a full branch merge would create a large and difficult-to-verify conflict surface.

## What Changes

- Port the shared model catalog additions and capability metadata for Nano Banana 2.1, GPT Image 2.5 variants, Seedream 5 Pro, Seedance 2.5, MiniMax-H3, and newly discoverable text models.
- Port GPT Image advanced parameters, transparent-background handling, request recovery, reference-image import fixes, and canvas image detail presentation.
- Port Seedance 2.5 and MiniMax-H3 parameter routing while preserving the desktop media cache, preview, and download adapters.
- Port safe Tuzi provider/model synchronization and manual-provider persistence fixes that do not require browser parent authentication.
- Preserve the desktop Tauri entry point, virtual media URL interceptor, filesystem grants, signed updater, release asset mapping, and download page.
- Add focused unit, integration, and desktop smoke coverage for the migrated behavior.

The following upstream areas are explicitly deferred from this change: the complete embedded Workflow Web application, the layer-decomposer Python service, document batch generation, browser-only postMessage/account onboarding, Umami analytics migration, and Web Service Worker bootstrap changes. They require separate desktop runtime and packaging proposals.

## Impact

- Affected capabilities: `runtime-model-discovery`, `image-generation`, `image-generation-feedback`, `provider-routing`, `media-preview`.
- Affected code: shared Drawnix model/configuration and adapter services, desktop renderer compatibility shims, desktop tests, and version metadata.
- Release behavior: desktop version will be advanced only after local production builds and updater signature checks pass.
- Data compatibility: existing provider settings, cached media, canvas documents, and updater state must remain readable.

## Approval

The user selected the staged migration option B on 2026-10-07. Implementation still requires review of this concrete scope and its OpenSpec deltas before code changes begin.
