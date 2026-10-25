# Proposal

## Why

IPI NFT has a working contract, SDK and CLI, but no shared OpenSpec baseline or tracked agent entry point. Future contributors need requirements grounded in the code, a clear hardware boundary and a reproducible way to validate changes.

## What Changes

- Initialize the standard `spec-driven` workflow and keep the generated shared agent skills in Git.
- Capture existing runtime behavior in six capability specs, plus the new agent collaboration workflow.
- Add project context, agent entry points, a contributor guide and a source/test evidence map.
- Pin OpenSpec as a development dependency and validate specs and archived task completion in CI.
- Archive this adoption change after its implementation and verification, establishing the initial baseline.

## Capabilities

### New Capabilities

The first six entries document existing behavior and integration constraints; they introduce no runtime changes.

- `nft-contract`: Proof-bound minting, CW721 permissions, permanent issuance identity and restricted execution.
- `chip-proof-protocol`: Canonical v1 bytes, secp256k1 signature encoding and shared interoperability vectors.
- `reader-authentication`: Approved deployments, bounded trusted-node access and fresh one-attempt proofs.
- `metadata-cli`: Deterministic content commitments, unsigned messages, file protection and confirmed-transaction checks.
- `build-release`: Pinned builds, generated ABI, optimized-Wasm execution and deployment provenance.
- `hardware-boundary`: Required chip profile, pending integration and limits of physical authenticity claims.
- `ai-workflow`: Discoverable instructions, tracked OpenSpec artifacts and validation during collaboration.

### Modified Capabilities

None; this repository has no previous OpenSpec baseline.

## Impact

Adds `openspec/`, shared skills, agent instructions and contributor documentation. Updates `.gitignore`, README, npm development dependencies/lockfile and CI. Contract code, SDK behavior, protocol bytes, deployment records and artwork remain unchanged.
