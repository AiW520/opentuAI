## ADDED Requirements

### Requirement: Real Release Downloads
The page SHALL resolve download URLs, versions, sizes and checksum links from published assets in `tuziapi/opentu`.

#### Scenario: Matching asset exists
- **WHEN** a visitor selects an operating system and architecture with a published installer
- **THEN** the page offers that actual installer and its checksum, with the release channel label.

#### Scenario: Asset is unavailable
- **WHEN** the selected asset is absent or release metadata cannot be loaded
- **THEN** the page disables direct downloading and offers release browsing or retry without inventing an installer URL.

### Requirement: Responsive Product Presentation
The page SHALL present OpenTu's desktop identity, real product imagery and rounded platform controls at desktop and mobile sizes.

#### Scenario: Mobile visitor
- **WHEN** the page is viewed at a narrow viewport
- **THEN** headings, platform controls and download information remain readable without horizontal overflow.

### Requirement: Distinct Delivery Channels
Official desktop releases SHALL retain signing and notarization gates. Preview releases SHALL clearly disclose unsigned status and SHALL NOT update the stable updater channel.

#### Scenario: Preview is selected
- **WHEN** the user authorizes preview delivery
- **THEN** installers are built as a GitHub prerelease, labelled unsigned, and no stable updater manifest is changed.

#### Scenario: Official delivery is selected
- **WHEN** signing configuration is incomplete
- **THEN** source/page work can be delivered while official installer publication remains gated by the existing workflow.
