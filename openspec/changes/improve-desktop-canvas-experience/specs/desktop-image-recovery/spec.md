## ADDED Requirements

### Requirement: Both canvases retrieve uncertain Tuzi image results without regeneration
Both desktop canvases SHALL support read-only `GET /log/get-request?id=...` using the original trusted provider and API-key identity. New trusted submissions SHALL persist a unique visible ASCII Request ID of at most 128 characters before POST. Recovery SHALL reuse current task ownership and SHALL NOT trigger another generation POST.

#### Scenario: Original response is lost
- **WHEN** a submitted image response is uncertain or the app restores a recoverable attempt
- **THEN** one bounded recovery lifecycle SHALL query the original request identity
- **AND** a changed/unavailable original credential SHALL pause lookup with a clear message rather than using another key

#### Scenario: Result status
- **WHEN** lookup returns `succeeded`, `failed` or `processing_or_not_found`
- **THEN** the app SHALL respectively validate/display returned URLs, show the sanitized provider error, or retain an uncertain state
- **AND** automatic lookup SHALL retain the original task deadline and existing concurrency/backoff bounds

### Requirement: Recovered images retain correct placement and history
Recovered media SHALL use normal caching and target insertion, preserve validated remote URLs if local cache fails, and reject stale attempts/project ownership. Manual lookup SHALL preserve original task history and require explicit insertion when no current target is known.

#### Scenario: Late result after replacement
- **WHEN** a task is cancelled, deleted, retried or replaced while lookup is in flight
- **THEN** its late result SHALL NOT overwrite or insert into the replacement task/project
- **AND** it SHALL NOT issue a fresh generation request

#### Scenario: Cache failure or expired automatic recovery
- **WHEN** valid media cannot be cached, or the original automatic deadline has passed
- **THEN** a valid returned remote image SHALL remain usable with the existing download warning, or a manual read-only lookup SHALL be offered as appropriate
- **AND** manual recovery SHALL NOT silently reverse a cancelled/deleted task or rewrite its original terminal history
