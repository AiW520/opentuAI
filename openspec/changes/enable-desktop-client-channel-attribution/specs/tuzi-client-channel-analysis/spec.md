## ADDED Requirements

### Requirement: Capture single desktop channel
Tuzi MUST accept ch=3 in existing request/log/async snapshot/fact dimensions. Incoming unsupported ch=4, malformed or repeated values MUST normalize to 0. All ch query keys MUST be removed before upstream routing.

#### Scenario: Desktop model request
- **WHEN** an authenticated eligible model request contains exactly one ch=3
- **THEN** existing attribution storage records 3 without changing billing

### Requirement: Default registered product aggregate
The analysis selector MUST offer all (default/reset), web production 1, web testing 2 and desktop 3. All MUST include only 1/2/3 consistently across summaries, distinct users, trends and channel/model rows. It MUST NOT expose unattributed or desktop testing choices. Explicit API ch=0 MUST remain available; analysis ch=4 MUST be rejected.

#### Scenario: Default or reset
- **WHEN** an administrator opens or resets channel analysis
- **THEN** all is selected and only registered OpenTu products are aggregated

#### Scenario: Preserve history
- **WHEN** new code is deployed
- **THEN** raw timestamps, historical ch=4 records, activation boundary, billing, schema and closed-day schedule remain unchanged
