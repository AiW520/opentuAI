## ADDED Requirements

### Requirement: One desktop analytics channel
Validated signed desktop packages MUST attach exactly one ch=3 to eligible Tuzi model requests. Both production and preview packaging profiles MUST use 3. Local/development/unsigned/missing or invalid profile builds MUST resolve to 0. Attribution MUST NOT be used as authenticated identity or billing authority.

#### Scenario: Signed desktop package
- **GIVEN** a valid signed production or preview packaging profile
- **WHEN** a supported model request targets a trusted/configured Tuzi endpoint
- **THEN** exactly one ch=3 is attached before any local proxy wrapper
- **AND** no desktop testing channel is emitted

#### Scenario: Invalid desktop proof
- **GIVEN** a desktop runtime without the exact proof `opentu-desktop-client-channel:3`
- **WHEN** the channel is resolved
- **THEN** it is 0 regardless of runtime origin

### Requirement: Preserve request boundaries
Attribution MUST preserve body, headers, credentials, abort behavior, other query bytes and fragments; replace all encoded/duplicate ch keys; and leave metadata, signed assets and third-party endpoints unchanged. Native metadata commands MUST remain outside billable attribution.

#### Scenario: Metadata or signed asset
- **WHEN** a metadata or signed asset URL is sent
- **THEN** its URL and request semantics remain unchanged
