## ADDED Requirements

### Requirement: Explicit Upstream Baseline

The desktop project SHALL record web develop commit `647e378d8c3b0213e688f2878efefc0042d0b04b` (web 1.1.23) as the reviewed synchronization target.

#### Scenario: Review synchronization metadata

- **WHEN** a release reviewer inspects the desktop synchronization
- **THEN** the exact web commit and version are visible
- **AND** desktop product version metadata remains independent.

### Requirement: Preserve Desktop Runtime Boundaries

Shared upstream features SHALL preserve native media storage, standalone startup, no production Service Worker registration, and manual provider configuration.

#### Scenario: Start the desktop app standalone

- **WHEN** the app starts without an embedding parent page
- **THEN** local boards and manual providers remain available
- **AND** native media paths are not replaced with browser-only URLs.
