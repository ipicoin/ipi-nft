# Working on IPI NFT

IPI NFT connects physical objects to immutable chip identities in a CosmWasm CW721 collection on IPI. This repository contains the contract, TypeScript SDK, unsigned-message CLI and tests. It does not contain a qualified NFT applet, card transport, provisioning implementation or Pokédex NFT Station.

## Start here

1. Read [the OpenSpec guide](openspec/README.md) and the specs relevant to the requested change.
2. Inspect `git status --short`, then `npx --no-install openspec list --json` for active work. Preserve unrelated user changes.
3. Read the implementation and tests named by the capability's evidence map before editing.
4. Use [SECURITY.md](SECURITY.md) and [the chip protocol](docs/CHIP-PROTOCOL.md) for trust boundaries and wire compatibility.

The user's requested scope controls whether work is planning-only or includes implementation. Record assumptions and keep authorized work moving; do not invent additional approval steps merely because a local plan was written. Surface unresolved decisions that actually change the requested behavior.

## Project map

| Area | Source and evidence | OpenSpec capability |
| --- | --- | --- |
| Issuance, transfers, burning, queries | `contracts/ipi-nft/`, `schema/`, contract integration tests | [nft-contract](openspec/specs/nft-contract/spec.md) |
| Encoding and cryptography | `sdk/core.ts`, `contracts/ipi-nft/src/proof.rs`, `protocol/vectors.json` | [chip-proof-protocol](openspec/specs/chip-proof-protocol/spec.md) |
| Trusted-node reader | `sdk/client.ts`, `tests/client.test.ts` | [reader-authentication](openspec/specs/reader-authentication/spec.md) |
| Metadata and unsigned messages | `sdk/cli.ts`, `sdk/core.ts`, `tests/cli.test.ts` | [metadata-cli](openspec/specs/metadata-cli/spec.md) |
| ABI, builds, release provenance | `scripts/`, `tools/wasm-tests/`, `deployments/`, CI | [build-release](openspec/specs/build-release/spec.md) |
| Future hardware and limits | `docs/CHIP-PROTOCOL.md`, `SECURITY.md` | [hardware-boundary](openspec/specs/hardware-boundary/spec.md) |
| Agent collaboration | `openspec/`, `.agents/skills/`, this file | [ai-workflow](openspec/specs/ai-workflow/spec.md) |

## Change workflow

- Main specs in `openspec/specs/` describe the agreed system; active changes in `openspec/changes/` describe proposed deltas. The archive is a record of completed work.
- For behavioral changes, record proposal, affected capability deltas, applicable design and checkbox tasks before implementation. Use the CLI's schema instructions rather than inventing templates.
- For documentation, presentation or refactoring with no requirement change, an OpenSpec change can set `skip_specs: true` in its generated `.openspec.yaml`.
- Use the checked-in `.agents/skills/openspec-*/SKILL.md` workflows when applicable. Read the relevant skill before using it. Keep generated skills unedited; put project-specific instructions in `openspec/config.yaml` or this guide.
- Mark tasks complete after the work and its relevant checks succeed. Record validation limits. Synchronize deltas and archive completed work through the CLI.
- When source and specs disagree, investigate and report the difference; do not silently weaken a requirement or claim unfinished behavior is implemented.
- Keep specifications and contributor documentation in English. Respond to the user in their chosen language.

## Critical invariants

- Preserve `ipi-nft-chip-v1` canonical bytes across Rust, TypeScript, fixtures and Java Card. Use secp256k1, SHA-256 once, compressed public keys and low-S compact chain signatures. Card DER signatures are normalized in the SDK.
- Chip proofs bind the chain, collection, token, metadata, issuer and initial owner. A chip proof never authorizes a transfer or spending funds.
- Keys, metadata commitments and token IDs cannot be replaced or reused within a collection, even after burning. CW721 owner/approval rules govern ownership changes.
- The supported collection has no upgrade administrator. Readers must pin and verify deployment identity; REST state still depends on a trusted node.
- Readers generate fresh one-attempt nonces, enforce expiry and recheck state after the card exchange. Physical adapters must honor cancellation.
- Production chip keys are generated inside qualified hardware and remain non-exportable. The public fixture key is test-only. The CLI never accepts chip private keys or account seeds, and never signs or broadcasts.
- Maintain the distinction between key possession, qualified hardware provenance, physical proximity and legal/on-chain ownership. Describe “Infinite security” as an ambition with the documented limits.

## Verification

Use Node.js 24 and `npm ci --ignore-scripts`. OpenSpec 1.15.0 is locked as a development dependency; npm scripts use that local CLI. Docker supplies the pinned Rust/build toolchain and requires `linux/amd64` support. See `toolchain.lock.json` for exact pins.

| Change | Relevant checks |
| --- | --- |
| Specs, instructions, contributor docs | `npm run check:specs`; check local links and inspect affected documentation |
| SDK/CLI | `npm run check` and `npm test` |
| Contract | `npm run test:contract` |
| Contract ABI | `npm run schema`; inspect and commit generated `schema/` changes |
| Proof protocol | SDK tests, contract tests, shared vectors and `npm run build:contract` |
| Build/release | `npm run build:contract`, which executes the optimized Wasm and writes provenance only after success |
| README artwork | Render the actual asset referenced in README and inspect the result at desktop and narrow widths |

Run checks appropriate to the changed paths and report actual results. A green software test is not real-card qualification, a new chain deployment or an independent audit. Generated `dist/`, `target/`, `artifacts/`, `node_modules/`, local data and secrets stay untracked.

Deployment procedures are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). Recorded testnet identity is in `deployments/`; historical reviews and readiness notes are dated observations, not a live network status check.
