# Repository review and replacement

Review date: **2026-10-05**. Baseline: `0394deb90dc19f5dbabf8506f1e2c8da321a7790` in `ipi-nft`.

## Scope and method

The review covered the old application, chain configuration, collection discovery, transaction/signing paths, token handling, dependency/build setup and absence of contract/hardware functionality. Adjacent IPI wallet and Pokédex code was read to establish the intended account format and provisioning boundary. The implementation in this change is confined to `ipi-nft`; Pokédex UI/provisioning changes remain a later phase.

This is a source and behavior review, not a formal audit, hardware certification or live-chain deployment assessment. Findings below describe the old baseline; removed paths can be inspected with `git show <baseline>:<path>`.

## Findings in the original repository

| Priority | Evidence at the baseline | Consequence | Resolution |
| --- | --- | --- | --- |
| Blocking | No CosmWasm contract, Rust workspace or Java Card protocol | The repository could not deploy its own NFT implementation or bind a physical chip | New CW721 contract, schemas, tested Wasm build and specified proof protocol |
| Blocking | `config/defaults.ts`: `CHAIN_NAME = 'stargaze'`, `stars…` marketplace, mainnet Stargaze GraphQL, `ustars` | Renaming the UI would still operate against unrelated contracts and another network | Removed application and Stargaze configuration; explicit IPI deployment records |
| High | `hooks/mint/useCollectionAddress.ts` and collection query hooks discover an existing mintable Stargaze collection | Mint intent was not tied to an operator-approved IPI collection or known code | Reader pins chain, collection, code ID, code checksum and immutable deployment |
| High | No chip public key, challenge, proof verification or immutable physical binding | Copying displayed metadata could be mistaken for item authenticity | Domain-separated secp256k1 proof, internal-key provisioning requirements and fresh reader challenges |
| High | Browser wallet signing in `hooks/useTx.ts` assumed Stargaze/Cosmos account behavior | Incompatible with the local IPI Ethereum-style account/signing implementation | Native IPI keyring signs; this CLI only prepares unsigned messages |
| Medium | `hooks/useTx.ts` hardcoded zero transaction fees and fixed caller gas values | No reliable IPI fee/simulation strategy | Deployment uses operator-configured gas prices, simulation and confirmed execution checks |
| Medium | Stargaze marketplace/GraphQL hooks and long-lived query caches | Irrelevant dependencies and stale assumptions for direct IPI issuance | Removed marketplace, pricing, GraphQL and browser-wallet layers |
| Medium | Token IDs were mixed with UI numeric assumptions in the inherited sales paths | Large NFT identifiers risk precision loss | Token IDs and code IDs remain validated strings; tests cover values above 2^53 |
| Medium | Next.js 13, React, wallet adapters and mixed CosmJS versions; no contract/reader tests | Large unrelated dependency surface without validation of the intended behavior | Minimal Node SDK dependencies, exact locks, Rust/SDK/VM tests and CI |
| Documentation | README described an inherited demo; upstream release history was presented at repository root | The repository's actual role and provenance were unclear | New README, review, deployment/protocol/security documents; preserved historical attribution |

The original software did interact with existing Stargaze NFTs. The missing functionality was **IPI collection deployment and secure physical identity**, not the concept of NFTs in that external ecosystem.

## Integration findings

- The local IPI wallet identifies `ipi-testnet-1`, `aipi` and IPI Bech32 addresses, with `/cosmos.evm.crypto.v1.ethsecp256k1.PubKey` and Keccak-based account signing. This informed the native-CLI boundary; it did not establish the live network's present settings.
- The existing Pokédex provisioning flow installs wallet applets and manages GlobalPlatform/SCP03. Wallet key initialization and permanent NFT binding are different lifecycle steps. NFT Station needs an explicit profile, reviewed NFT applet and recoverable issuance journal.
- A local helper-JAR/policy hash discrepancy was observed during the adjacent Pokédex review. It is outside this repository's scope and must be resolved before trusting that provisioning path for NFT issuance.
- Existing Card Vault deployment information belongs to a different contract. Its code ID/address must not be reused as an NFT deployment.
- Initial Python-based testnet endpoint probes returned HTTP 403. Final curl and Node SDK probes succeeded: the node reports `ipi-testnet-1`, wasmd 0.60.8 and wasmvm 2.3.4, matching the local VM test version. Details are recorded in [TESTNET-READINESS.md](TESTNET-READINESS.md). No live NFT deployment or hardware qualification has been performed.

## Replacement architecture

The contract composes CW721 0.20 with a small explicit execute interface. It adds a permanent issuance index and key index, verifies proof-bound minting, and retains tombstones after burns. Standard permissions remain in the upstream implementation. Metadata/key update and arbitrary extension execution routes are not exposed.

The SDK defines one canonical byte protocol shared with Rust. It normalizes Java Card public keys/DER signatures, validates exact metadata bytes and supplies a reader-generated one-attempt challenge. An injectable trusted-node client allows failure testing without a live endpoint. It verifies code identity and rejects upgradeable collections before authenticating a card.

The CLI handles deterministic metadata, unsigned collection/mint/transfer/burn messages and read-only verification. It never generates a production chip key or assumes the role of an IPI account signer. The future applet must construct fixed-purpose proofs internally from its locked binding.

## Verification and remaining acceptance work

Automated local checks cover:

- Contract authorization, two-step minter rotation/renunciation, standard CW721 queries, transfers, approvals/expiry/revocation and both accepting/rejecting receiver callbacks.
- Unauthorized minting and changes to each committed field, cross-chain/collection replay, malformed/bounded fields, low-S signatures and permanent ID/key reservations after burn.
- A shared proof vector across TypeScript, native Rust crypto and the optimized Wasm's actual CosmWasm VM execution.
- Freshness, replay, expiration, public-key copying, deployment mismatches, corrupt metadata, REST response limits and exclusive CLI output files.
- Strict TypeScript, pinned Rust formatting/Clippy, schema generation and repeatable optimized builds.

The release still needs **operator deployment to an accessible IPI testnet node** and **real-card qualification**. Neither is simulated by a green unit test. No live transaction or card write is part of this repository rewrite. No commit or push is performed by the implementation workflow.

For the next phase, implement and qualify the NFT applet/profile, resolve Pokédex artifact provenance, add NFT Station and run interrupted-provisioning/recovery tests with a connected card. The deployed collection and verified Wasm hash become explicit inputs to that integration.
