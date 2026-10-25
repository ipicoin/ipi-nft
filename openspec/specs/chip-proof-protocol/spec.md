# chip-proof-protocol Specification

## Purpose
Preserve byte-compatible `ipi-nft-chip-v1` proofs across the contract, SDK and future qualified applet.

Evidence: `docs/CHIP-PROTOCOL.md`, `contracts/ipi-nft/src/proof.rs`, `sdk/core.ts`, `protocol/vectors.json`, `tests/core.test.ts`, `contracts/ipi-nft/tests/protocol.rs`, `tools/wasm-tests/tests/wasm.rs`.

## Requirements

### Requirement: Permanent binding uses canonical domain-separated bytes
The binding SHALL be SHA-256 of `IPI_NFT_BINDING_V1\0`, the length-prefixed chain ID, collection address, token ID and token URI, then the 32-byte metadata hash. String lengths MUST be two-byte unsigned big-endian UTF-8 byte lengths, without normalization or implicit terminators.

#### Scenario: Shared binding vector
- **WHEN** Rust and TypeScript encode the binding in the shared protocol fixture
- **THEN** their hashes equal the fixture and each other

#### Scenario: Binding crosses deployments
- **WHEN** the chain or collection changes while the signature remains unchanged
- **THEN** proof verification fails

### Requirement: Mint proofs commit to issuer and initial owner
The mint nonce SHALL be SHA-256 of `IPI_NFT_MINT_V1\0` followed by the length-prefixed issuer and initial owner. This deterministic nonce MUST NOT be treated as a fresh reader challenge.

#### Scenario: Initial owner is changed
- **WHEN** a mint proof is reused with a different initial owner
- **THEN** its signature does not validate for that issuance

### Requirement: Proof messages are hashed exactly once
A proof SHALL sign the SHA-256 digest of `IPI_NFT_PROOF_V1\0 || bindingHash[32] || nonce[32]` using ECDSA on secp256k1. A hashing card API MUST receive the full 81-byte message; a prehashed API MUST receive its 32-byte digest.

#### Scenario: Hashing API receives the digest
- **WHEN** the digest is passed to an API that applies SHA-256 again
- **THEN** the resulting double-hashed signature fails protocol verification

### Requirement: Keys and signatures have canonical wire encodings
On-chain public keys SHALL use validated 33-byte compressed SEC1 secp256k1 points. On-chain signatures SHALL use 64-byte compact `r || s` encoding with nonzero scalars and low-S. SDK normalization SHALL accept valid uncompressed keys and DER or compact signatures while producing canonical chain values.

#### Scenario: Java Card returns a high-S DER signature
- **WHEN** the SDK normalizes a valid DER signature whose S value is high
- **THEN** it returns a valid compact low-S signature for the same proof

#### Scenario: Wrong curve or malformed signature
- **WHEN** a point is invalid on secp256k1 or signature encoding is malformed
- **THEN** it cannot be accepted as a valid protocol proof

### Requirement: Public message fields retain validated representations
Contract JSON SHALL encode keys and signatures as base64 and hashes/nonces as hexadecimal. The SDK and CLI SHALL retain token IDs and code IDs as strings and reject invalid IPI addresses, token IDs and token URIs. Protocol field limits MUST remain consistent with the v1 specification.

#### Scenario: Identifier exceeds JavaScript integer precision
- **WHEN** a valid numeric-looking token ID or uint64 code ID exceeds `2^53`
- **THEN** SDK and CLI handling preserves its exact string value

### Requirement: Public test keys cannot become production credentials
The shared fixture SHALL remain explicitly identified as test-only. Production provisioning instructions MUST NOT reuse its publicly known private key or generate production chip keys on the host.

#### Scenario: Fixture is used during interoperability testing
- **WHEN** a contributor reproduces the fixture signatures
- **THEN** those results demonstrate protocol compatibility and provide no production authenticity claim
