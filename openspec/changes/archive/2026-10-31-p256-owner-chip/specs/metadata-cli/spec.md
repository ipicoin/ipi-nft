## MODIFIED Requirements
### Requirement: Transaction tooling prepares unsigned messages
The CLI SHALL prepare collection, mint, transfer, send and burn JSON without accepting account seeds or production chip private keys. It MUST NOT sign or broadcast transactions. Mint and ownership-action preparation SHALL recheck request commitments and verify the supplied chip proof before emitting chain JSON. Ownership actions SHALL include sequence and expiry as uint64 strings.

#### Scenario: Mint request has been edited
- **WHEN** a saved request's binding hash, nonce or proof message differs from its recomputed value
- **THEN** mint-message generation fails

#### Scenario: Broadcasting or unknown flags are requested
- **WHEN** a user supplies an unsupported command or option
- **THEN** the CLI reports an error instead of pretending to submit a transaction

#### Scenario: Action request has been edited
- **WHEN** owner, target, callback, sequence or expiry differs from the signed action
- **THEN** action-message generation fails
