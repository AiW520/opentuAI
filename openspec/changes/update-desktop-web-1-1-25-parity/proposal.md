# Change: Port web v1.1.25 improvements to desktop

## Why

The desktop port is pinned to web v1.1.24. Upstream develop at
`df1715ab878d939418fb3d2e1fd793e585be7bd2` adds useful batch image and canvas
interaction improvements. Native download, media cache, updater, and analytics
behavior must remain intact when importing the shared components.

## What Changes

- Port prompt history positioning and unified image/video/audio/text target controls from #296.
- Port embedded XLSX image import/export, selection controls, and manual insertion from #294.
- Adapt workbook downloads to the existing desktop save dialog and binary writer.
- Retain image dimensions when createImageBitmap is unavailable in a WebView.
- Preserve the desktop Umami integration and validate its loading/error behavior.
- Record the pinned upstream revision and advance the desktop version to 1.2.13 after verification.

## Impact

- Affected capabilities: image-generation, ai-input-generation, prompt-history.
- Affected code: shared batch-image tool, target toolbar, prompt popover, XLSX utilities, desktop version metadata.
- Existing local data remains readable. New batch tasks require explicit insertion; tasks already submitted retain their existing insertion behavior.
- Native packages and publishing are not represented by a successful renderer build.

## Approval

The user selected option B on 2026-10-11 after reviewing both upstream updates,
desktop download compatibility, and WebView image-dimension risk. This records
that approved scope; no additional capabilities are included.
