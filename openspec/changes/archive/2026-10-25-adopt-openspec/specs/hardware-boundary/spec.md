# Hardware integration boundary

## Purpose

Keep future secure-element integration requirements explicit while accurately describing the software and hardware evidence currently available.

Evidence: `SECURITY.md`, `docs/CHIP-PROTOCOL.md`, `README.md`, `docs/DEPLOYMENT.md`. Hardware requirements here are acceptance criteria for a future integration, not evidence that a qualified applet ships in this repository.

## ADDED Requirements

### Requirement: Shipped software and pending hardware are distinguished
Project documentation SHALL identify the contract, SDK and CLI as available and the NFT applet, card transport, provisioning implementation and Pokédex NFT Station as pending integration. Hardware availability, qualification and independent audit claims MUST require separate evidence.

#### Scenario: A future agent plans hardware integration
- **WHEN** it reads the project baseline
- **THEN** it can identify the missing hardware work and cannot treat a passing software test as completed real-card qualification

### Requirement: A production chip profile protects its own identity
A qualified NFT profile MUST generate its secp256k1 private key internally, permanently lock the NFT binding and build fixed-purpose proof messages from stored state. Its interface MUST prohibit private-key export/import, reset, rebinding and unrestricted signing with the NFT key.

#### Scenario: A generic wallet applet can reset or export its key
- **WHEN** it is considered for use as the NFT applet
- **THEN** it does not satisfy the required NFT profile without a separately qualified implementation

### Requirement: Provisioning and transport require real-device qualification
Hardware acceptance SHALL verify the exact silicon/OS/applet, key generation, curve/signature interoperability, persistent atomic binding, interrupted provisioning, management-key custody and reader cancellation. Production instructions MUST keep GlobalPlatform management credentials separate from NFT keys and omit secrets from logs.

#### Scenario: Power is interrupted while locking the binding
- **WHEN** the future hardware integration undergoes acceptance testing
- **THEN** qualification verifies that recovery cannot reset identity, expose a key or create a partially accepted issuance

### Requirement: Authenticity claims state their security boundary
Documentation SHALL explain that a valid signature proves key possession, while approved hardware provenance depends on trusted provisioning. It MUST describe relay and chip-transplant limits and distinguish physical authenticity from CW721 ownership. Marketing phrases such as “Infinite security” MUST NOT assert absolute immunity to hacking, cloning or counterfeiting.

#### Scenario: A genuine chip is relayed or moved to a counterfeit enclosure
- **WHEN** it answers a valid cryptographic challenge
- **THEN** the signature alone is not claimed to prove proximity or integrity of the original enclosure
