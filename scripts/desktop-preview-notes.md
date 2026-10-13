## OpenTu Desktop Preview

- Added Storage & Cleanup settings with categorized disk usage, file search, filtering, folder opening and file reveal.
- Added confirmed deletion of unused application-owned originals, with board/task reference checks, stale-file protection and partial failure reporting. Referenced, unknown or incompletely inspected files remain protected.
- Added separate preview-cache clearing that retains persistent media and project data.
- Improved cleanup responsiveness with small database read batches, scan progress, recent inventory previews and debounced search. Native cache writes are bounded and ordered for shared destinations.
- Fixed inspection of absent legacy databases enumerated by macOS WebKit after aborted migration attempts.
- Added a permanent Check for Updates menu command, startup checks, periodic checks and retry after reconnecting.
- Update notices wait until active generation tasks finish. Downloads show progress and support retry.
- Preview updates now include verified Tauri updater signatures and a complete update manifest.
- Fixed missing community and support QR images in the desktop package.

This preview is signed for Tauri update integrity. macOS uses an ad-hoc application signature; Apple Developer ID signing, notarization and Windows Authenticode signing are not configured. Operating-system security warnings may appear. This is not a trusted stable release.

Older installations without the updater plugin must install this preview manually once. Existing local data is stored separately from the application bundle. Back up important work before upgrading.

Download the installer matching your OS and architecture and verify its SHA-256 checksum. `.app.tar.gz`, `.nsis.zip`, `.AppImage.tar.gz` and their `.sig` files are updater payloads, not the normal manual installers.
