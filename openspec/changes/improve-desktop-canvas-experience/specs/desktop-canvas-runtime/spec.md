## ADDED Requirements

### Requirement: Desktop enters the user's canvas directly
The desktop app SHALL restore the last valid free/infinite canvas and project, default to free canvas on first use, and omit featured-home entry and return navigation. It SHALL preserve project selection, settings, tasks and switching between both canvases without changing the web homepage.

#### Scenario: Returning user
- **WHEN** desktop starts with a valid saved canvas/project preference
- **THEN** it SHALL open that canvas/project directly after the necessary storage hydration
- **AND** SHALL NOT render or preload featured home as a prerequisite

#### Scenario: First run or missing project
- **WHEN** no valid preference exists
- **THEN** first use SHALL open free canvas, and a missing project SHALL fall back safely without deleting documents

### Requirement: Desktop loading optimizations preserve durable data
The desktop app SHALL prioritize active-canvas loading, deduplicate pending module/media work, allow retry after load failure, and avoid loading originals for inactive views unless required. Performance changes SHALL be evaluated against same-build-identity fixtures before and after modification.

#### Scenario: Canvas switching
- **WHEN** the user switches canvas twice
- **THEN** code loading SHALL reuse completed work
- **AND** inactive runtimes SHALL NOT gain duplicate timers, requests or media decoding solely from preloading

#### Scenario: Save and cache pressure
- **WHEN** cache reads or replaceable autosaves are optimized
- **THEN** task submission identity, accepted remote IDs, terminal results and explicit saves SHALL remain durable
- **AND** the app SHALL NOT delete user originals or change storage formats as a shortcut
