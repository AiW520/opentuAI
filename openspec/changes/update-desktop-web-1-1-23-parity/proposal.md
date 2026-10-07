# Change: Adapt web 1.1.23 features for desktop users

## Why

Desktop currently records web 1.0.16 at `927f4b2990037ebfb51e96564f2c4d6c2f5a90db`. The requested upstream develop snapshot is web 1.1.23 at `647e378d8c3b0213e688f2878efefc0042d0b04b`, with 106 additional commits. Desktop users need those shared features without regressions in native media, existing data, or signed updates.

## Approval

The user selected option B (staged feature integration with desktop adapters) on 2026-10-06. This approves this synchronization scope. The separate pending Tuzi unified backend contract is not approved by this selection.

## What Changes

- Integrate image parameters, generation details, canvas interaction, and composer viewport fixes first.
- Adapt new video models, reference-image drag/drop, audio results, and submission recovery to native desktop media.
- Integrate shared workflow and document tooling with desktop resource and runtime adapters; preserve upstream routing visibility.
- Keep embedded parent-page authentication inactive on desktop. Native OAuth/cloud synchronization remains under the existing separately gated proposal.
- Preserve filesystem grants, no-Service-Worker desktop startup, durable media, product version ordering, and release ownership.
- Record exact validation results and outstanding platform release gates.

## Impact

- Affected specs: desktop-web-parity (existing pending baseline proposal), provider-routing, image-generation, media-preview, ai-input-generation.
- Affected code: shared renderer, web bootstrap/build, desktop entry/build adapters, dependency lockfile, upstream baseline metadata.
- Existing untracked files and existing user data must be preserved.
