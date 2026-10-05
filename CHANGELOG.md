# Changelog

## 0.1.0 — IPI NFT foundation

- Replace the inherited Stargaze web demo with an IPI CosmWasm CW721 contract, SDK and CLI.
- Require chip proof of key possession at mint and permanently bind the key and metadata to the token.
- Preserve ID/key tombstones after burn; retain standard transfers, approvals, receiver callbacks and enumeration.
- Add Java Card DER normalization, fresh challenge verification and explicit deployment checks.
- Add deterministic metadata generation, unsigned transaction messages and confirmed-transaction verification.
- Pin the Wasm toolchain; add native and optimized-VM tests, JSON schemas and release provenance.
- Document testnet deployment, the hardware protocol, trust boundaries and the repository review.

This is a deployment candidate. No live collection or qualified hardware applet is bundled. Pokédex NFT Station follows in a separate phase.

Historical upstream notes are preserved in [docs/history/stargaze-changelog.md](docs/history/stargaze-changelog.md).
