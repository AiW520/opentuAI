## ADDED Requirements

### Requirement: Desktop Batch Workbook Round Trip
The desktop batch-image tool SHALL import embedded reference images from XLSX and export selected or all rows with embedded reference and completed result images through the native save path.

#### Scenario: Import a workbook with reference pictures
- **WHEN** a user imports XLSX containing reference URLs and embedded pictures
- **THEN** pictures SHALL be associated with their task row in reference-column order.

#### Scenario: Save a workbook in a native WebView
- **WHEN** a user exports a workbook or downloads the template
- **THEN** the existing desktop save dialog and binary writer SHALL be used, and unavailable createImageBitmap SHALL not discard the real image aspect ratio.

### Requirement: Explicit Batch Canvas Insertion
New batch-image tasks SHALL remain in task history and preview until a user explicitly inserts selected completed results into the canvas.

#### Scenario: Insert selected results
- **WHEN** a user requests insertion of selected completed batch images
- **THEN** the insertion service SHALL preserve image dimensions and generation metadata and prevent writes to a different canvas after an asynchronous board switch.
