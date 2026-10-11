## ADDED Requirements

### Requirement: Unified Desktop Target Controls
Image, video, audio, and text generation targets SHALL support the same follow/reference controls and optional click-to-center behavior while retaining existing preferences.

#### Scenario: Click a media control
- **WHEN** a user clicks a playback button, input, or slider
- **THEN** the canvas SHALL not recenter as a result of that control interaction.

#### Scenario: Center a single target
- **WHEN** click-to-center is enabled and a single supported target is clicked outside editing or dragging
- **THEN** the viewport SHALL center on the target without changing zoom.
