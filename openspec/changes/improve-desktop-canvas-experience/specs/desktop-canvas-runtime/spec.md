## ADDED Requirements

### Requirement: Desktop free canvas uses the approved warm-white dot background
The desktop default/colorful free-canvas theme SHALL use the approved warm-white fine-dot design (#fcfaf6 background, #d8cebf dots, 24 world-unit spacing). The pattern SHALL track viewport pan/zoom as an HTML-only presentation layer, preserve explicit alternative themes and web styling, and SHALL NOT alter document elements, exports, the existing toolbar/input layout, or the existing batch image generation tool.

#### Scenario: Pan, zoom and export
- **WHEN** the user pans or zooms the desktop free canvas
- **THEN** the dot grid SHALL remain anchored to canvas coordinates
- **AND** exporting or saving canvas content SHALL NOT include the decorative dots

#### Scenario: Existing generation workflow
- **WHEN** the user opens batch image generation
- **THEN** the existing tool, task queue, imports and exports SHALL be reused without a replacement side panel

### Requirement: Desktop omits redundant download promotion
The desktop resource menu SHALL omit the desktop-download card and automatic first-run promotional popup while keeping the remaining resources manually accessible. The web download promotion SHALL remain available.

#### Scenario: Desktop resource menu
- **WHEN** a desktop canvas opens and the user later opens its resources manually
- **THEN** no download promotion SHALL be shown and the author resource link SHALL remain available

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
