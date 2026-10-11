## ADDED Requirements

### Requirement: Unclipped Desktop Prompt Popover
The prompt-history popover SHALL render outside the input scroll container, adjust its position to the viewport, and support click, Escape, and outside-click dismissal.

#### Scenario: Open near the viewport edge
- **WHEN** a user opens prompt history near the top or side of the viewport
- **THEN** the panel SHALL flip or shift and constrain its dimensions so it remains accessible.
