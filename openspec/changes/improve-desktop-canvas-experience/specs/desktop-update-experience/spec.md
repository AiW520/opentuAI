## ADDED Requirements

### Requirement: Desktop updates remain accessible across canvases
The desktop app SHALL own one shared update notification/check surface outside canvas-specific overlays. Supported signed builds SHALL retain startup/reconnect/periodic/menu discovery and user-confirmed download, signature validation, installation and relaunch with progress/retry. Unsigned/unsupported older installations MAY use a clearly labeled manual-download fallback.

#### Scenario: Update discovered before canvas mount or while switching
- **WHEN** an update is discovered before the notification mounts or while either canvas is active
- **THEN** the discovered version SHALL remain available and the update action SHALL be visible in both canvas modes when safe
- **AND** the app SHALL NOT download/install/relaunch without user confirmation

### Requirement: Update relaunch preserves active work
Update install/relaunch SHALL account for active generation/recovery and pending durable writes from both canvases, flush required data before relaunch, and expose actionable failure without reporting a successful restart prematurely.

#### Scenario: Active work or failed flush
- **WHEN** active tasks or unsaved durable writes prevent installation/relaunch
- **THEN** the app SHALL defer the transition or report the blocking failure
- **AND** SHALL preserve the running app and project/task data

#### Scenario: Installed update cannot restart
- **WHEN** installation succeeds but relaunch fails
- **THEN** retry SHALL attempt restart only, without downloading/installing the update again
