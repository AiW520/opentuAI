## ADDED Requirements

### Requirement: Tuzi provider synchronization is safe for desktop settings

The desktop provider layer SHALL refresh supported Tuzi models and preserve manually configured providers across refreshes and application restarts without requiring browser parent authentication.

#### Scenario: Refresh Tuzi models

- **WHEN** the user refreshes provider models
- **THEN** discovered models update the selector while existing manual provider entries remain available

#### Scenario: Restart with manual provider

- **WHEN** the desktop app restarts after a manual provider was configured
- **THEN** the provider remains visible with its saved endpoint and credential reference
