# Design
## Context
See proposal.md. Upstream k1 and operator transfer rules are superseded by the approved object profile.
## Goals / Non-Goals
Enforce both authorizations in the contract. Chain account authentication retains k1/r1. No recovery, physical applet, public deployment or currency policy changes.
## Decisions
Use v2 domains and version 0.2.0 instead of redefining v1 bytes. Use P256 host verification and low-S signatures for chips. Preserve historical v1 vectors separately.
Query NFT owner_of as authority; guard transfer, send and burn before CW721 execution. Approval storage remains interoperable but operators cannot change ownership. Contract owners still require chip proofs.
Use Uint64 JSON strings and a persistent sequence starting at zero, with checked increment. Transaction failure rolls back sequence and NFT state. Expiry is exclusive at the specified height and within 1000 blocks; it does not promise wall-clock expiry during a halt.
Separate action domain binds recipient and callback hash. Reader proofs never authorize transfer. No secondary ownership registry.
## Risks / Trade-offs
Lost chip prevents transfer/burn: approved first-version limitation, no privileged bypass.
Old immutable deployments cannot upgrade: use a new collection and reader pins.
Software fixtures do not prove hardware custody: physical qualification remains separate.
## Migration Plan
Build and test a new artifact for isolated integration. Keep v1 deployment records historical and incompatible with v2. No live reader repinning or production deployment in this task.
