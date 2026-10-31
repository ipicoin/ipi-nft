# Proposal
## Why
Object chips must use NIST P-256 and ownership changes must require the owner and the chip. The project owner now assigns this implementation to this fork instead of waiting for upstream.
## What Changes
- **BREAKING**: version 0.2.0 uses ipi-nft-chip-v2 and P256 chip proofs, with new domain bytes.
- **BREAKING**: transfer, send and burn require an action-specific chip proof and current NFT owner sender. Approvals never bypass either requirement.
- Add monotonically increasing authorization sequence and block-height expiry, SDK unsigned action builders, fixtures and tests.
- Preserve wallet k1/r1 support, nonpayable execution, immutable identities, no recovery and no migration/admin.
## Capabilities
### New Capabilities
### Modified Capabilities
- `nft-contract`: dual authorization for every ownership route.
- `chip-proof-protocol`: versioned P256 proof encoding and action messages.
- `hardware-boundary`: qualified P256 chip profile and action command.
- `metadata-cli`: unsigned action request/proof verification.
## Impact
Rust contract, TypeScript SDK/CLI, schema, shared vectors, software tests and integration documentation. This requires a new collection; historical deployment records remain historical. No physical applet qualification or public deployment is implied.
