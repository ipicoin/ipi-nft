# NFT contract

## Purpose

Define the existing on-chain issuance and ownership guarantees of an IPI NFT collection.

Evidence: `contracts/ipi-nft/src/{contract,msg,state}.rs`, `contracts/ipi-nft/tests/contract.rs`, `schema/ipi-nft.json`.

## ADDED Requirements

### Requirement: Collection initialization is bound to the expected chain
The contract SHALL reject initialization on a chain other than the configured expected chain and SHALL reject execution when the stored chain ID differs from the executing chain. Collection fields and the minter address MUST pass validation before initialization succeeds.

#### Scenario: Unexpected chain
- **WHEN** a collection is instantiated with an expected chain ID different from the environment
- **THEN** initialization fails without creating a usable collection

### Requirement: Minting requires issuer authority and a bound chip proof
The contract SHALL mint only for its current authorized minter with a valid canonical chip signature bound to the chain, collection, token ID, metadata URI, metadata hash, issuer and initial owner.

#### Scenario: Authorized mint
- **WHEN** the minter submits valid fields and a matching chip proof for an unused identity
- **THEN** the NFT belongs to the specified initial owner and the issuance records its immutable binding

#### Scenario: Redirected or unauthorized mint
- **WHEN** another sender mints or any committed field differs from the signed proof
- **THEN** minting fails and creates no issuance

### Requirement: Identity and metadata commitments are permanent
The contract SHALL keep the chip key, token URI and metadata hash immutable after minting. Token IDs and compressed chip public keys MUST each be unique within the collection, including after burning.

#### Scenario: Burned identity is reused
- **WHEN** a caller attempts to mint with a previously issued token ID or chip key after its NFT was burned
- **THEN** minting fails and the original issuance tombstone remains queryable

#### Scenario: Metadata replacement is attempted
- **WHEN** a caller submits an execution message that would replace a token URI, metadata hash or chip key
- **THEN** the message is rejected by the contract interface

### Requirement: Ownership actions follow CW721 authorization
The contract SHALL support CW721 transfers, receiver callbacks, approvals, revocations, enumeration and burning with their standard ownership and expiration rules. A chip authenticity proof MUST NOT grant transfer authority.

#### Scenario: Receiver rejects a transfer
- **WHEN** an authorized sender invokes a receiver that rejects its NFT callback
- **THEN** the send transaction rolls back and ownership is preserved

#### Scenario: Expired approval is used
- **WHEN** an account attempts a transfer using an expired approval
- **THEN** the transfer fails

### Requirement: Minter changes require an ownership handover
Minter rotation SHALL use a proposed owner and recipient acceptance. Renouncing minter ownership SHALL disable further issuance.

#### Scenario: Proposed minter has not accepted
- **WHEN** a proposed recipient attempts to mint before accepting ownership
- **THEN** it has no minter authority

### Requirement: Execution exposes a restricted nonpayable interface
Initialization and execution SHALL reject attached funds. The execute interface MUST NOT expose metadata replacement, arbitrary extension execution or fund withdrawal, and the contract MUST NOT provide a migration entry point.

#### Scenario: Funds are attached
- **WHEN** an initialization or NFT execution includes coins
- **THEN** the call fails

### Requirement: Chip verification queries report mathematical validity
The contract SHALL expose protocol, issuance, chip lookup and signature-verification queries alongside CW721 queries. Signature verification SHALL reject malformed lengths and SHALL report a burned issuance as invalid. A verification query MUST NOT be represented as enforcing nonce freshness.

#### Scenario: Proof for a burned NFT
- **WHEN** a valid historical signature is queried after its NFT was burned
- **THEN** verification returns an invalid result with the burned state
