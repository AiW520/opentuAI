# Enable one OpenTu desktop channel

## Why
The user confirmed on 2026-10-21 that desktop analytics should be enabled now, there is no separate desktop testing product, and the channel selector should default to all OpenTu products. This supersedes the earlier dual-desktop draft.

## What Changes
- Use ch=3 for validated signed desktop packages, including the existing preview packaging workflow. Packaging profiles do not create analytics products.
- Keep local/development/unsigned builds at ch=0. Never infer desktop identity from runtime origin.
- Accept only desktop proof `opentu-desktop-client-channel:3`; invalid proof and ch=4 normalize to 0.
- Tuzi offers all (default/reset), web production 1, web testing 2, and desktop 3. All includes only 1/2/3.
- Keep billable model URL boundaries, Request semantics, metadata and signed assets intact.

## Impact
Existing ch fields are reused; no schema migration, new API field, billing change, historical relabeling, activation-boundary change, or daily aggregation change. Production publishing is a separate action. The authorized acceptance target is the shared 3210 test site.
