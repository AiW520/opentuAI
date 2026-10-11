# macOS 1.2.13 preview packaging fix

## Reproduction

- User-downloaded `Opentu-1.2.13-macos-aarch64.dmg` matches the published SHA-256: `b6530377b1dce5b585a3da00af849580e502000833b2694b850bb22991063289`.
- Host and executable are both arm64. Bundle version is 1.2.13.
- `codesign --verify --deep --strict` fails on the mounted app: `code has no resources but signature indicates they must be present`.
- The original binary has a linker-generated ad-hoc signature; the application bundle is not sealed. This is a packaging error, not a failed download.

## Fix and validation

- Configure Tauri macOS `signingIdentity: "-"` so the bundler signs the complete app before creating the DMG. The formal release workflow overrides this with its Developer ID environment variable.
- Verify both the build output app and the app mounted from its DMG before uploading installers.
- A copy of the affected app, signed using `codesign --force --sign -`, passes strict recursive verification.
- Launching that corrected copy creates the native `Opentu` process and a visible `Opentu 开图` window. Accessibility inspection finds the rendered canvas toolbar and image-generation controls.
- Screen capture is unavailable in this session, so no screenshot was verified.
- The host's Gatekeeper assessment reports `security disabled`; it cannot establish behavior on a Mac with default Gatekeeper policy. Ad-hoc signing is not Developer ID signing or notarization; a preview build can still require explicit user confirmation.
