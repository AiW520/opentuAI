## ADDED Requirements

### Requirement: Pinned Web 1.1.28 Capability Synchronization

The desktop application SHALL port approved capabilities from upstream develop
at `3d84bb7c3b24fe6215a2daa945b80227fbd72456` and retain desktop integrations.

#### Scenario: New upstream models and controls
- **WHEN** the user selects a supported model or opens canvas resources
- **THEN** the approved Flux 3, Suno v6, Gemini, Seedream, Veo and resource controls SHALL follow the pinned upstream contracts
- **AND** existing manually configured providers SHALL remain usable.

#### Scenario: Canvas media, failed tasks and export
- **WHEN** a saved project loads, a generation fails, or the user exports canvas media
- **THEN** imported lifecycle and placement behavior SHALL retain native image rendering, virtual media resolution and filesystem export
- **AND** the selected B generation-card appearance SHALL remain available.

#### Scenario: Desktop runtime compatibility
- **WHEN** the production Tauri application starts and opens local media
- **THEN** it SHALL preserve existing local data, updater and analytics behavior without registering a Service Worker
- **AND** upstream loopback credential import SHALL NOT be broadened to native schemes as part of this synchronization.

#### Scenario: Verification and upstream tracking
- **WHEN** the synchronization is recorded as complete
- **THEN** the upstream descriptor SHALL identify the verified revision
- **AND** evidence SHALL distinguish renderer checks, native-package checks and live external-service checks.
