## ADDED Requirements

### Requirement: Maintain upstream parity without removing desktop canvases
The desktop application SHALL incorporate applicable capabilities from pinned
OpenTu and Infinite Canvas upstream revisions while preserving both canvases,
existing project data and desktop-specific integration behavior.

#### Scenario: Upstream removes a canvas that desktop retains
- **WHEN** an upstream change removes the independently integrated canvas
- **THEN** the desktop retains that canvas and records the divergence and applicable adaptations.

#### Scenario: New upstream fields affect saved data
- **WHEN** synchronized behavior introduces persistent fields
- **THEN** existing data remains readable and defaults or migrations are tested before release.

### Requirement: Track synchronization and verification
Each synchronization SHALL record upstream revisions, applicable features,
adaptations, exclusions and acceptance evidence.

#### Scenario: Native release checks are incomplete
- **WHEN** native workflows or signed update installation have not been verified
- **THEN** the synchronization report identifies the missing checks and does not claim release readiness.
