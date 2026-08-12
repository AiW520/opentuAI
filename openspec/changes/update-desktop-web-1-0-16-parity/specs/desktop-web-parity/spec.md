## ADDED Requirements

### Requirement: Desktop Must Track An Explicit Web Baseline

The desktop repository SHALL record the exact web commit and web version used by its shared renderer rather than relying on a moving branch name.

#### Scenario: Desktop synchronization is reviewed

- **WHEN** a reviewer inspects the synchronized desktop source
- **THEN** the repository SHALL identify web commit `927f4b29` and web version `1.0.16` as the integration baseline
- **AND** later upstream updates SHALL use a new explicit commit

### Requirement: Shared Features Must Preserve Web Behavior

The desktop renderer SHALL preserve web 1.0.16 behavior for provider routing, model discovery, task lifecycle, reference images, media preview, and AI taskbar workflows unless a documented platform constraint requires an adapter.

#### Scenario: Shared feature has no desktop platform dependency

- **GIVEN** a web 1.0.16 feature uses only shared renderer capabilities
- **WHEN** the feature runs in the desktop renderer
- **THEN** its user-visible behavior SHALL match the web application
- **AND** the desktop fork SHALL retain the upstream regression tests

#### Scenario: Shared feature needs a desktop platform adapter

- **GIVEN** a web feature depends on Service Worker, Cache Storage, browser download, or browser file input semantics
- **WHEN** it runs in the desktop renderer
- **THEN** the desktop application SHALL route the operation through a documented desktop adapter or safe no-op
- **AND** SHALL NOT silently report success when required work was skipped

### Requirement: Desktop Task Recovery Must Not Duplicate Submissions

The desktop renderer SHALL preserve request identity and task execution ownership when recovering interrupted image or media tasks.

#### Scenario: Submitted image request becomes indeterminate

- **GIVEN** an image request was submitted with a persisted request ID
- **AND** the response connection becomes indeterminate or the application restarts
- **WHEN** desktop recovery runs
- **THEN** it SHALL use the persisted request ID for read-only recovery where supported
- **AND** SHALL NOT submit the non-idempotent generation request a second time

#### Scenario: Old execution completes after replacement

- **GIVEN** a task was cancelled, retried, deleted, or replaced
- **WHEN** an older execution later returns a result
- **THEN** execution ownership checks SHALL prevent it from overwriting the replacement task or media

### Requirement: Desktop Cache Clearing Must Preserve Durable Media By Default

Desktop cache and local-data clearing SHALL distinguish browser metadata and cache entries from user-owned native media files.

#### Scenario: User clears cache on desktop

- **WHEN** the user selects the cache-only clearing action
- **THEN** browser cache entries and object URLs SHALL be released
- **AND** native generated and imported media files SHALL remain intact

#### Scenario: User requests native media deletion

- **WHEN** an operation will delete files from the desktop media root
- **THEN** the UI SHALL identify the native file deletion scope explicitly
- **AND** deletion SHALL require user intent under the desktop file-access boundary

### Requirement: Desktop Upgrade Must Preserve Existing Data

The synchronized desktop application SHALL continue to read existing boards, settings, tasks, cached metadata, and legacy media directory layouts.

#### Scenario: Existing installation starts after upgrade

- **GIVEN** an installation contains data created by the previous desktop release
- **WHEN** the synchronized application starts
- **THEN** existing boards, provider settings, and media metadata SHALL remain readable
- **AND** legacy localized media directories SHALL remain discoverable
- **AND** the upgrade SHALL NOT require destructive reset

### Requirement: Desktop Release Must Identify Product And Web Versions Separately

Desktop release metadata SHALL use one consistent product semantic version while recording the integrated web version separately.

#### Scenario: Desktop package is built

- **WHEN** the production desktop package is assembled
- **THEN** root package, desktop package, Tauri, and Cargo product versions SHALL agree
- **AND** the recorded web baseline SHALL NOT override product version ordering
