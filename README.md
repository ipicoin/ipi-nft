<p align="center">
  <img src="docs/assets/ipi-nft-banner.png" alt="IPI NFT — Open-source contract. Physical objects. Cryptographic identity." width="100%" />
</p>

<p align="center">
  <strong>Your object. Its cryptographic identity. On IPI.</strong><br />
  Open-source CW721 contract · Java Card proof protocol · TypeScript SDK · Command-line tools
</p>

<p align="center">
  <a href="#built-for-ipi-secure-elements">IPI secure elements</a> ·
  <a href="docs/DEPLOYMENT.md">Deploy on IPI</a> ·
  <a href="docs/CHIP-PROTOCOL.md">Chip protocol</a> ·
  <a href="docs/REVIEW.md">Repository review</a> ·
  <a href="SECURITY.md">Security model</a>
</p>

---

## What is IPI NFT?

IPI NFT connects a physical item to a standard, transferable NFT on the IPI Cosmos blockchain. Each item contains an asymmetric secure chip. During provisioning, the chip generates its own secp256k1 key pair. The private key stays inside the chip; the public key becomes part of the NFT's permanent identity.

A reader authenticates an item by sending a fresh random challenge. The chip signs a message containing that challenge and its locked NFT binding. The reader checks the signature against the public key recorded on IPI. Copying the public key, NFC data or image is insufficient to answer a new challenge.

The contract implements CW721 ownership, transfers, approvals, receiver callbacks, enumeration and burning. No separate web application is required.

> **Release status:** v0.1.0 has a [verified testnet deployment](deployments/ipi-testnet-1.release.md) on `ipi-testnet-1`. The contract, Wasm, SDK and CLI are available, but the release has not been independently audited. Java Card applet provisioning and the **NFT Station** tab in `ipi-pokedex` are the next integration phase; they are not implemented here.

## Built for IPI secure elements

<p align="center">
  <img src="docs/assets/secure-element.png" alt="IPI secure element — a blue chip carrying the IPI emblem" width="160" />
  <br />
  <strong>Open source on-chain. A private key inside your object.</strong>
</p>

**IPI secure elements will be available to buy soon.** This [MIT-licensed](LICENSE) smart contract is designed for full compatibility with the upcoming IPI secure elements through the [IPI NFT chip protocol](docs/CHIP-PROTOCOL.md). The planned integration covers on-chip key generation, permanent NFT binding, signed mint proofs and fresh authenticity checks. The contract and SDK implement the verification side today; the hardware applet, provisioning tools and real-device qualification are the next step.

The goal is simple: give a collectible, artwork or physical product an identity that can prove itself. Its public key is recorded on IPI. Its private key is generated and retained inside the secure element. A scan asks the chip for a new cryptographic proof, while the open-source contract lets anyone inspect how issuance, identity and ownership are enforced.

[Explore the chip protocol](docs/CHIP-PROTOCOL.md) · [See the security design](#infinite-security-uniquely-yours)

## The system at a glance

```mermaid
flowchart LR
    A[Physical item / secure chip] -->|Public key + signed mint proof| B[Provisioning station]
    B -->|Authorized mint transaction| C[CW721 collection on IPI]
    D[Reader] -->|Fresh random challenge| A
    A -->|Signature| D
    C -->|Public key, binding, status and owner| D
    E[IPFS / HTTPS] -->|Hash-verified metadata| D
```

| Component | Responsibility |
| --- | --- |
| **Chip** | Generates and retains its private key; signs proofs for its permanently locked binding. |
| **Contract** | Records the NFT, chip public key, metadata commitment and owner; enforces CW721 permissions. |
| **SDK** | Constructs canonical messages, normalizes Java Card signatures, checks the deployment and authenticates fresh proofs. |
| **CLI** | Prepares metadata and unsigned transaction messages; verifies deployments, transaction results and metadata. |
| **IPI native node CLI** | Signs and broadcasts with IPI's own account/keyring implementation. |
| **Pokédex, next phase** | Installs the NFT applet, provisions chips and coordinates issuance. |

**Ownership and authenticity are separate.** The owner's IPI account controls transfers. The chip proves possession of the key assigned to the item. Passing an item to another person does not automatically transfer its on-chain NFT, and transferring the NFT does not prove physical delivery.

## Guarantees enforced by the contract

- Only the configured minter can issue new NFTs. Minter rotation uses a two-step ownership handover.
- Minting requires a valid chip signature bound to the **chain, collection, token ID, metadata URI, metadata hash, issuer and initial owner**.
- The chip key, metadata URI and metadata hash are immutable after minting.
- A token ID and a compressed chip public key can each be used once per collection. Burning preserves an issuance tombstone and never releases either identity.
- Standard CW721 transfers and approvals remain available. A chip signature does not grant permission to move an NFT or spend funds.
- The supported deployment has **no upgrade administrator**. The SDK verifies this together with the chain ID, collection address, code ID, Wasm checksum and protocol version.

Cryptography proves control of a key. Establishing that the key was generated inside approved, non-exportable hardware also requires trusted provisioning and a qualified applet. See the [security model](SECURITY.md).

## Quick start

Requirements: **Node.js 24**, npm, Docker with Linux container support. Docker uses the pinned CosmWasm optimizer image and Rust 1.86.0; a host Rust installation is optional. On ARM hosts, Docker must support `linux/amd64` emulation. First builds download the toolchain dependencies and take longer.

```sh
npm ci --ignore-scripts
npm test
npm run test:contract
npm run schema
npm run build:contract
```

The build produces:

```text
artifacts/
├── ipi_nft.wasm     # Optimized contract for MsgStoreCode
├── checksums.txt    # SHA-256 checksum
└── release.json     # Toolchain, source hashes, Git revision and artifact identity
```

`build:contract` also validates and runs the **actual optimized Wasm** in CosmWasm VM: instantiate → signed mint → proof verification → transfer → burn → rejected reissue. A failed build or VM test exits with an error. Only a fully successful run writes the release manifest.

`release.json` records whether the checkout was dirty. Build again after committing when producing a release tied to an exact Git revision. Build artifacts are intentionally excluded from source control; distribute them with their manifest through your release process.

## Prepare an item

Create deterministic metadata from a PNG, JPEG or WebP image, up to 1 MiB:

```sh
npm run nft -- metadata \
  --image ./my-item.png \
  --name "IPI Object #1" \
  --description "The first physical object in the collection." \
  --out ./data/item-1
```

This creates the image copy, `metadata.json` and a manifest with content hashes and IPFS URIs. It **does not publish** the files. The generated URIs use **CIDv1 raw blocks**, not UnixFS wrapping. Publish and pin the exact image and metadata bytes before minting; the [deployment guide](docs/DEPLOYMENT.md#3-publish-the-item-metadata) provides matching Kubo commands.

After a collection is deployed, the issuance flow is:

1. Freeze and publish the metadata; select the token ID and initial owner.
2. Create a mint request for that exact collection and item.
3. Provision the chip: generate its key internally, lock the binding, read the public key and obtain the mint proof.
4. Convert the card's DER signature into the canonical chain message.
5. Have the authorized issuer sign and broadcast through the native IPI CLI.
6. Confirm successful execution and read the issuance back from the chain.

Complete commands, recovery rules and deployment configuration are in [DEPLOYMENT.md](docs/DEPLOYMENT.md). The CLI never accepts a chip private key.

## Integrate a reader

```ts
import { IpiNftClient, compactSignature } from "./dist/sdk/index.js";

const client = new IpiNftClient(verifiedDeployment);
const token = await client.authenticateChip("item-1", async ({ nonce, bindingHash, signal }) => {
  // Your qualified applet checks the binding and signs:
  // IPI_NFT_PROOF_V1\0 || storedBindingHash || nonce
  const der = await card.prove({ nonce, bindingHash, signal });
  return compactSignature(der, "der");
});

console.log(token.owner); // Owner observed on IPI after authentication
```

`verifiedDeployment` is an operator-approved record containing `chainId`, `rest`, `collection`, `codeId` and `wasmSha256`. `card.prove` is the transport adapter supplied by the future hardware integration, not a function included in this SDK. The adapter must check the chip's locked binding against the supplied hash and honor the abort signal.

The reader generates a random 32-byte nonce, permits one verification attempt and expires the challenge after 30 seconds. It checks chain status again after the card responds. REST queries rely on the configured trusted node; this SDK is not a light client.

## Contract interface

| Category | Messages |
| --- | --- |
| Issuance | `mint`, `update_minter_ownership` |
| CW721 execution | `transfer_nft`, `send_nft`, `approve`, `revoke`, `approve_all`, `revoke_all`, `burn` |
| CW721 queries | `owner_of`, `nft_info`, `all_nft_info`, `num_tokens`, `tokens`, `all_tokens`, approvals and ownership queries |
| IPI queries | `protocol`, `issuance`, `token_by_chip`, `verify_chip` |

JSON schemas are checked into [`schema/`](schema/). Public keys and signatures use base64 in contract messages; SHA-256 digests and nonces use hexadecimal. Token IDs and code IDs remain strings in the SDK. `verify_chip` is a mathematical signature check; callers must supply and track a fresh nonce to establish live possession.

The contract exposes no metadata update, arbitrary extension execution, fund withdrawal or migration entry point. Do not attach funds to NFT executions. The IPI deployment must use `--no-admin` to prevent replacement with another contract.

## Repository map

```text
contracts/ipi-nft/  CosmWasm CW721 contract and integration tests
sdk/               TypeScript protocol, trusted-node client and CLI
tests/             SDK, reader and CLI tests
protocol/          Shared Rust/TypeScript proof vector (test key only)
schema/            Generated contract JSON schemas
deployments/       Verified testnet record, release note and unconfigured template
tools/wasm-tests/  Tests that execute the optimized artifact in CosmWasm VM
scripts/           Pinned builds, Rust checks and release manifest
docs/              Deployment, hardware protocol, readiness and review
docs/assets/       README banner, secure-element icon and security artwork
```

## Development

```sh
npm run check           # Strict TypeScript check
npm test                # SDK and CLI tests
npm run test:contract   # Rust formatting, Clippy and contract tests in Docker
npm run format:rust     # Format Rust using the pinned toolchain
npm run schema          # Regenerate the contract ABI
npm run build:contract  # Optimize, validate, execute Wasm and write its manifest
npm run nft -- help
```

Test coverage includes permission failures, modified mint commitments, cross-chain and cross-collection replay, canonical signatures, burn tombstones, CW721 approvals and receiver behavior, challenge replay/expiry, deployment mismatch, metadata tampering and CLI file protection. Hardware qualification remains a separate integration check; the recorded testnet deployment is not a mainnet certification.

## Infinite security. Uniquely yours.

<p align="center">
  <img src="docs/assets/secure-element-dog.png" alt="IPI security guardian — a fierce dog in a neon-lit server room wearing an IPI secure element" width="560" />
</p>

<p align="center">
  <strong>Built to resist counterfeiting. Built to resist hacking. Built to resist cloning.</strong><br />
  <strong>Your object. Your identity. Uniquely yours.</strong>
</p>

An authentic item should be able to answer for itself. The IPI design gives each provisioned secure element its own signing key, locked to an NFT identity. Copying the artwork, reading the NFC data or recording an earlier signature does not provide the private key needed to answer the reader's next random challenge.

### Asymmetric by design

IPI NFT uses **ECDSA on secp256k1**, the 256-bit elliptic curve defined in [SEC 2](https://www.secg.org/sec2-v2.pdf). Its equation is `y² = x³ + 7` over a finite field. A private key is a secret scalar; the public key is a curve point derived by multiplying the generator point by that scalar. Security relies on the difficulty of reversing that operation to recover the secret.

This asymmetry makes public verification possible: anyone can check a signature using the public key without receiving the private key. Readers do not need a shared collection-wide signing secret. Under the required hardware profile, the private key is generated inside the chip, cannot be exported or imported, and cannot be reset or rebound to another NFT. The applet signs only the defined NFT proof using its stored binding.

### A fresh proof on every scan

| Protection | How the IPI design provides it |
| --- | --- |
| **Resistance to counterfeiting** | A valid signature must match the chip public key and NFT binding recorded by the contract. |
| **Resistance to key theft and cloning** | The required secure-element profile keeps the private key inside the chip; copying public data does not copy its signing ability. |
| **Resistance to replay** | The reader generates a fresh 32-byte random challenge, allows one attempt and expires it after 30 seconds. |
| **Permanent identity within a collection** | The contract fixes the chip key and metadata commitment at mint; burning never releases the key or token ID for reuse. |
| **Ownership you control** | CW721 permissions govern transfers; an authenticity proof alone cannot move your NFT or spend funds. |

**Infinite security is the ambition.** Protection depends on qualified hardware, the applet, trusted provisioning, the reader and physical integration. Fresh signatures alone cannot prevent a relay to a genuine remote chip or moving a genuine chip into another object. The [security model](SECURITY.md) explains these boundaries and the remaining qualification work.

## License and provenance

[MIT](LICENSE). The repository originally contained an upstream Stargaze demo; that application has been replaced with the IPI contract and tooling. Original attribution and historical release notes remain in [UPSTREAM.md](UPSTREAM.md) and [docs/history/](docs/history/). CW721 behavior builds on the [public-awesome/cw-nfts](https://github.com/public-awesome/cw-nfts) implementation.
