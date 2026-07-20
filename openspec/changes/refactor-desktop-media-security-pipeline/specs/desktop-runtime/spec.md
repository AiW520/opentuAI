## ADDED Requirements

### Requirement: Desktop File Commands Must Enforce Explicit User Intent
The desktop runtime SHALL reject renderer-requested local file operations unless the target path is under the canonical media root or covered by a short-lived user-granted dialog capability.

#### Scenario: Arbitrary write path is rejected
- **GIVEN** renderer code calls a desktop write command with a path that was not returned by the save dialog
- **AND** the path is outside the configured media root
- **WHEN** the command executes
- **THEN** the command SHALL fail before creating or overwriting the file

#### Scenario: Dialog save path is accepted
- **GIVEN** the user selected a destination through the native save dialog
- **WHEN** renderer code writes the matching payload to that granted path
- **THEN** the command SHALL complete
- **AND** the grant SHALL NOT allow unrelated paths

#### Scenario: Media-root operation is accepted
- **GIVEN** a local media operation targets a canonical path under the configured media root
- **WHEN** the command validates the path
- **THEN** the command SHALL allow the operation if the media-specific validation also passes

### Requirement: Desktop Runtime Permissions Must Be Minimal
The desktop runtime SHALL expose only permissions required by implemented desktop features.

#### Scenario: Unused powerful permission is absent
- **WHEN** the desktop capability manifest is built
- **THEN** unused process and filesystem permissions SHALL NOT be enabled
- **AND** opener permissions SHALL be scoped to the minimum required URL/path patterns

### Requirement: Desktop Native Downloads Must Be Bounded And Public-Target Only
The desktop runtime SHALL stream renderer-requested native downloads with bounded time and size, and SHALL reject non-public network targets unless a separately specified local-network capability authorizes them.

#### Scenario: Download resolves to a private network target
- **GIVEN** a renderer-requested URL resolves to loopback, link-local, private, multicast, or another denied address range
- **WHEN** the native download command validates the request or a redirect destination
- **THEN** the command SHALL reject the download before sending sensitive local-network traffic

#### Scenario: Download exceeds configured limit
- **GIVEN** a remote response declares or streams more bytes than the configured desktop download limit
- **WHEN** the native download command processes the response
- **THEN** the command SHALL stop writing further bytes
- **AND** it SHALL remove the incomplete output file
- **AND** it SHALL NOT buffer the full response in memory

#### Scenario: Download stalls or times out
- **WHEN** connection or response progress exceeds the configured timeout
- **THEN** the command SHALL abort the request
- **AND** it SHALL clean up any incomplete output file

### Requirement: Desktop CSP Must Reduce Renderer Blast Radius
The desktop app SHALL use a content security policy that avoids broad script execution and unnecessary network wildcards.

#### Scenario: Production desktop CSP is inspected
- **WHEN** the production desktop configuration is loaded
- **THEN** `unsafe-eval` SHALL NOT be present unless a documented dependency requires it
- **AND** broad `http:` access SHALL be limited to documented local asset or development needs

### Requirement: Desktop Asset Protocol Must Stay Under Media Root
The desktop asset protocol SHALL only serve files whose canonical paths are under the configured media root.

#### Scenario: Encoded path escapes media root
- **GIVEN** an `opentu-asset` request encodes a file path outside the media root
- **WHEN** the protocol handler resolves the request
- **THEN** it SHALL return a forbidden response
- **AND** it SHALL NOT read the target file

#### Scenario: Large media range request succeeds
- **GIVEN** a large local media file under the media root
- **WHEN** the client requests a valid byte range through `opentu-asset`
- **THEN** the protocol handler SHALL return partial content with correct range headers
- **AND** memory usage SHALL be bounded by the requested range size

### Requirement: Desktop Asset URLs Must Match Runtime Support
The desktop runtime SHALL generate asset URLs only in forms that the current platform can actually serve.

#### Scenario: Windows asset URL is generated
- **GIVEN** the desktop runtime is Windows
- **WHEN** the renderer creates a URL for a local media file
- **THEN** the URL MAY use `http://opentu-asset.localhost`
- **AND** the protocol handler SHALL resolve it through the same media-root checks as custom-scheme URLs

#### Scenario: macOS or Linux asset URL is generated without loopback server
- **GIVEN** the desktop runtime is macOS or Linux
- **AND** no runtime-owned loopback asset server is active
- **WHEN** the renderer creates a URL for a local media file
- **THEN** the URL SHALL use the supported `opentu-asset://localhost` form
- **AND** it SHALL NOT assume `http://opentu-asset.localhost` will be intercepted

#### Scenario: Cross-platform HTTP asset URL is enabled
- **GIVEN** a runtime-owned loopback asset server is active
- **WHEN** the renderer creates a local media URL on any desktop platform
- **THEN** the URL MAY use the documented HTTP origin
- **AND** the server SHALL enforce media-root access checks and byte range semantics
- **AND** the server SHALL shut down with the app

### Requirement: Desktop File Writes Must Avoid JSON Array Inflation
The desktop runtime SHALL provide a bounded binary transfer path for large renderer-to-filesystem writes.

#### Scenario: Large desktop export is saved
- **GIVEN** the renderer needs to save a 10 MB or larger payload to a dialog-granted path
- **WHEN** the save operation transfers bytes to Rust
- **THEN** the transfer SHALL NOT serialize the payload as a JSON array of numbers
- **AND** memory usage SHALL remain bounded by the configured chunk or stream window

#### Scenario: Small compatibility write is saved
- **GIVEN** legacy renderer code calls the JSON-array write API with a payload below the documented threshold
- **WHEN** the command executes
- **THEN** the command MAY continue to accept the payload
- **AND** larger payloads SHALL be routed to the binary transfer path or rejected with a clear error

### Requirement: Desktop Service Worker Policy Must Be Explicit
The desktop runtime SHALL either bundle the required Service Worker contract or disable Service Worker registration with a documented fallback.

#### Scenario: Desktop build starts without silent missing SW
- **WHEN** the desktop renderer boots
- **THEN** it SHALL NOT repeatedly attempt to register a missing `sw.js`
- **AND** task/cache features SHALL use the configured desktop policy

### Requirement: Desktop Media Directories Must Be Portable
The desktop runtime SHALL write new media files into stable ASCII subdirectories while preserving read compatibility with legacy localized subdirectories.

#### Scenario: New image is saved
- **GIVEN** the desktop runtime saves a new image under the media root
- **WHEN** it chooses the target subdirectory
- **THEN** it SHALL use the ASCII `images` directory
- **AND** the UI may continue to display localized labels independently from the filesystem name

#### Scenario: Existing localized media is read
- **GIVEN** an existing installation has image files under the legacy localized image directory
- **WHEN** the user previews or references that media
- **THEN** the desktop runtime SHALL still find and serve the file
- **AND** migration SHALL NOT require deleting the legacy file first
