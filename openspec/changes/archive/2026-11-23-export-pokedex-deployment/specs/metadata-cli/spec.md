## ADDED Requirements

### Requirement: Export a verified deployment for the Pokédex NTAG profile

The CLI SHALL export a Pokédex manifest containing the chain ID, trusted REST URL, collection address, decimal code ID and Wasm SHA-256. Before writing it, the CLI SHALL verify the NTAG-compatible chain ID, live deployment, no-admin policy, Tokenomy v2 artifact and expected minter through the configured node.

#### Scenario: The intended NTAG collection is live

- **WHEN** the selected immutable collection reports the expected issuer, contract version and proof protocol and its downloaded Wasm matches the Pokédex pin
- **THEN** the CLI writes a manifest that the Pokédex NTAG profile can load

#### Scenario: The collection or node does not match

- **WHEN** the chain ID, artifact, deployment or minter differs or verification fails
- **THEN** the CLI fails before creating the output file
