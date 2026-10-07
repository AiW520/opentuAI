# Change: Add desktop download page and build delivery

## Why
Desktop users need a clear download entry that reflects actual release assets. The current signed release workflow cannot run without repository signing secrets, so preview and official delivery must retain separate labels and gates.

## What Changes
- Add a responsive Apple-inspired download page with rounded controls, a real desktop screenshot, platform/architecture selection and verified release asset links.
- Resolve available version, file size, release notes and checksums from GitHub releases; never offer an absent asset as a download.
- Build the page with the existing React/Vite toolchain and provide a GitHub Pages deployment workflow.
- Preserve signing/notarization requirements for official releases. If the user selects preview delivery, add an explicitly unsigned prerelease build workflow that does not publish to the stable updater channel.
- Push the existing approved desktop integration and the new page to `tuziapi/opentu`, then build the selected delivery channel.

## Impact
- Affected specs: desktop-download.
- Affected code: download page, GitHub workflows, desktop version metadata.
- Page and source build scope: requested directly by the user. Public preview versus signed official delivery remains pending the user's selection.
