## ADDED Requirements

### Requirement: Desktop GPT Image requests support v1.1.24 advanced controls

The desktop image adapter SHALL preserve size, resolution, output format, quality, moderation, user, and transparent-background values when the selected GPT Image model supports them, and SHALL omit unsupported fields.

#### Scenario: Advanced GPT Image request

- **WHEN** the user enables supported advanced controls
- **THEN** the request payload contains the selected values and the generated result remains compatible with native media storage

#### Scenario: Unsupported advanced control

- **WHEN** a model does not support a selected control
- **THEN** the desktop UI hides or disables that control and the adapter does not send it

### Requirement: Desktop image generation recovers interrupted requests

The desktop image task SHALL persist request identity and recover a completed result through polling after a transient interruption.

#### Scenario: Renderer reload during image generation

- **WHEN** the renderer restarts after request submission
- **THEN** the task is restored and polls the provider using the saved request identity before marking the task failed
