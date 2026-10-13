## ADDED Requirements

### Requirement: Inspect and reveal desktop media
The desktop app SHALL display file counts and bytes grouped by media type in storage settings, provide filters and bounded file pages, and open the active media folder or reveal an inventoried file using the OS file manager.

#### Scenario: Inspect current and legacy media folders
- **WHEN** the user opens storage cleanup
- **THEN** regular files from the active media type directories and legacy names are inventoried without traversing symlinks or unrelated directories
- **AND** incomplete scans show errors rather than implying a complete inventory.

### Requirement: Protect referenced and unknown originals
The system SHALL allow permanent deletion only for confirmed application-owned originals with complete reference inspection and no business-data references. Library and cache owner records SHALL be distinguishable from project/history references. Unknown references or failed reads SHALL block deletion.

#### Scenario: Shared project media
- **WHEN** a file is referenced by any persisted or current board or task
- **THEN** it is protected and the UI displays its reference locations with a file reveal action.

#### Scenario: Incomplete inspection
- **WHEN** local databases cannot be enumerated or read
- **THEN** permanent deletion is disabled and the inspection failure is reported.

#### Scenario: Aborted legacy database creation on WebKit
- **WHEN** an enumerated database opens with oldVersion zero because no database was persisted
- **THEN** inspection aborts creation and skips the absent database
- **AND** errors opening persisted databases still disable permanent deletion.

### Requirement: Keep inspection responsive
The system SHALL read database records in batches of at most 200, yield between batches, cap total inspected records and strings, and debounce file search. A root-matched inventory up to 30 seconds old MAY be shown immediately, but it SHALL remain non-deletable until a fresh scan completes.

#### Scenario: Refresh a cached inventory
- **WHEN** the user opens cleanup again or requests refresh
- **THEN** a matching recent inventory can remain visible during inspection
- **AND** stale rows and rows under active inspection cannot be selected for deletion.

#### Scenario: Bound desktop cache writes
- **WHEN** original cache media is queued for native persistence
- **THEN** at most two writes run concurrently, writes sharing a destination run in order, pending updates of the same URL are coalesced to the latest update, and cleanup waits for the queue to drain.

### Requirement: Confirm and revalidate permanent deletion
The system SHALL show selected file count and bytes, require explicit permanent-deletion confirmation, recheck references and file identities, refuse concurrent business activity, delete only exact authorized regular files, and report successes, released bytes and failures separately.

#### Scenario: File changes after inspection
- **WHEN** a selected file changes or the active root changes before deletion
- **THEN** the stale selection is refused without deleting the changed file.

#### Scenario: Partially failed cleanup
- **WHEN** some files cannot be deleted
- **THEN** successful files have their matching library/cache indexes removed and failed files retain their records with actionable errors
- **AND** the result does not claim that all files were deleted.

### Requirement: Clear derived preview caches separately
The system SHALL offer derived preview-cache clearing separately from original deletion, preserve persistent source blobs and native originals, and retain project data, preferences and credentials.

#### Scenario: Clear preview caches
- **WHEN** the user confirms preview-cache clearing
- **THEN** derived thumbnails and preview entries are cleared without clearing source media records, boards or native files.
