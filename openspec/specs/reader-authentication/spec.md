# reader-authentication Specification

## Purpose
Define how a reader authenticates a fresh chip response against an operator-approved IPI deployment and current issuance state.

Evidence: `sdk/client.ts`, `sdk/core.ts`, `tests/client.test.ts`, `tests/core.test.ts`, `SECURITY.md`.

## Requirements

### Requirement: Readers verify an approved deployment before trusting issuance
The reader SHALL validate its configured chain ID, collection address, code ID, Wasm checksum, downloaded code, protocol identity/version and absence of an upgrade administrator. It MUST reject mismatches before authenticating an item.

#### Scenario: Deployment has an administrator or changed code
- **WHEN** the queried deployment has an administrator or its downloaded bytecode does not match the approved checksum
- **THEN** authentication fails

### Requirement: Issuance is checked against its permanent binding
The reader SHALL validate the issuance identity, chip public key and recomputed binding hash. It SHALL distinguish current NFT ownership from physical authenticity and reject burned issuance during authentication.

#### Scenario: On-chain metadata commitment is inconsistent
- **WHEN** issuance fields do not reproduce the recorded binding hash
- **THEN** the reader rejects the issuance

### Requirement: Challenges are random expiring and single-attempt
The reader SHALL generate an independent cryptographically random 32-byte nonce for each authentication attempt. Challenges SHALL default to a 30-second lifetime, allow configured integer lifetimes from 1 to 60000 milliseconds, and be consumed by the first verification attempt, including failure. Exposed bytes MUST NOT permit mutation of the stored challenge.

#### Scenario: Proof or challenge is replayed
- **WHEN** a signature from another nonce is supplied or verification is attempted twice
- **THEN** the challenge cannot authenticate the chip

#### Scenario: Caller mutates returned challenge bytes
- **WHEN** a caller modifies an exposed nonce, message or original binding input
- **THEN** the stored challenge retains its original nonce and binding

### Requirement: Exchanges are bounded and state is rechecked
Authentication SHALL time out a stalled exchange, notify the adapter through an abort signal and reject invalid or expired proofs. After a valid response, it SHALL reload the deployment and issuance, reject burned or changed identity, and return the current observed owner.

#### Scenario: Card exchange stalls
- **WHEN** the adapter has not returned a signature before the configured deadline
- **THEN** authentication rejects and its abort signal requests cancellation of physical I/O

#### Scenario: NFT burns during the exchange
- **WHEN** a chip signs correctly but the NFT is burned before the post-proof state check
- **THEN** authentication fails

### Requirement: Trusted-node access is constrained and explicit
REST access SHALL use HTTPS except on loopback, reject embedded credentials, query strings and fragments, refuse redirects, and apply request timeouts and streamed response limits. Ordinary JSON responses SHALL be bounded to 1 MiB and code-download responses to 4 MiB. The client MUST be documented as relying on a trusted node rather than independently verifying consensus.

#### Scenario: Server streams an oversized response
- **WHEN** response bytes exceed the applicable limit regardless of the advertised content length
- **THEN** the request fails and its response stream is cancelled

#### Scenario: Chip supplies its own collection configuration
- **WHEN** a chip advertises an address outside the operator-approved deployment
- **THEN** that advertisement does not establish a trusted collection for authentication
