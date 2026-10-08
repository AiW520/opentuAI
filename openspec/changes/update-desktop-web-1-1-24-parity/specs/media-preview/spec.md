## ADDED Requirements

### Requirement: Generated media details remain inspectable on desktop

The desktop canvas and preview surfaces SHALL expose generation model, dimensions, parameters, and media status without replacing the native cache or download path.

#### Scenario: Inspect a generated image

- **WHEN** the user opens image details from the canvas
- **THEN** the details show the stored dimensions and generation metadata and the image remains downloadable

#### Scenario: Inspect a generated video

- **WHEN** a Seedance 2.5 or MiniMax-H3 result is inserted
- **THEN** the preview uses the native media URL and shows the recorded duration, ratio, and generation status
