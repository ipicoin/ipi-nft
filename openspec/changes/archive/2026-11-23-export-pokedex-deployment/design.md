## Context

The contract source matches the Tokenomy revision. The pinned optimizer reproduces the Wasm required by the Pokédex NTAG X DNA profile. A chip binding includes the collection address, so selecting the live deployment before writing a card is part of issuance.

## Goals

Export the five fields consumed by the station after verifying the selected collection and issuer against the trusted IPI REST node.

## Decisions

- Use a dedicated CLI command with the checksum accepted by the NTAG profile. Keep generic deployment verification available for other v2 artifacts.
- Reuse the SDK checks for network, collection address, code ID, downloaded Wasm, contract version, proof protocol and absent administrator. Query `minter` and require the expected IPI address.
- Write the manifest using the existing exclusive-output helper. The native IPI CLI handles signing and fees, and the operator uses Pokédex to write the first chip.

## Validation

Compare the optimized build and schema with Tokenomy evidence. Check the export with the Pokédex loader and a fixture serving the verified Wasm bytes. Recheck the live collection independently when deployment is available. These checks exercise software and deployment identity.
