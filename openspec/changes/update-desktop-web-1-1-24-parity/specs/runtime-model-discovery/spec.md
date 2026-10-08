## ADDED Requirements

### Requirement: Desktop model catalog supports the selected v1.1.24 families

The desktop model catalog SHALL expose the selected Nano Banana 2.1, GPT Image 2.5, Seedream 5 Pro, Seedance 2.5, MiniMax-H3, and text model entries with capability metadata and safe defaults.

#### Scenario: User selects a newly supported image model

- **WHEN** the model is available from the configured provider
- **THEN** the desktop selector shows the model and only controls supported by its adapter

#### Scenario: Provider does not advertise a new model

- **WHEN** runtime discovery omits the model
- **THEN** the desktop selector does not submit a request for that unavailable model
