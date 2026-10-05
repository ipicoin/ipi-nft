# Security model

IPI NFT v0.1.0 is a tested deployment candidate, not an independently audited release. Its guarantees depend on the contract, approved deployment, provisioning process and reader together.

## Trust boundaries

| Boundary | What is trusted | What is verified |
| --- | --- | --- |
| Issuer account | Operator custody and authority to issue genuine items | On-chain minter ownership and chip mint proof |
| Chip and applet | Qualified hardware, RNG, reviewed applet and provisioning | Live key possession; locked public state through the transport |
| Blockchain | IPI consensus and the configured node | Chain, collection, code ID/hash, absent admin, protocol, issuance and owner |
| Metadata storage | Availability of content providers | Exact metadata SHA-256; artwork commitment inside those metadata |
| Host/reader | Its OS, software distribution and approved deployment file | Cryptographic proof, fresh nonce, expiry and current burn state |

A compromised REST node can lie about chain state. `IpiNftClient` checks consistency against a trusted deployment but does not implement a CometBFT light client or independently authenticate consensus. Distribute deployment records through an authenticated operator channel. Do not auto-select a collection based on price, search results or chip-supplied configuration.

## Contract protections

The contract delegates standard NFT ownership behavior to CW721 0.20 and exposes an explicit execute allowlist. Only the minter can mint; owner/approval/operator permissions control transfers and burning. Minter ownership changes require a proposed recipient to accept. Renouncing that role prevents future minting.

Mint signatures bind the network, contract, ID, URI, metadata hash, issuer and initial owner. Compressed public keys are canonical; compact signatures must be low-S. Inputs are bounded. There are no metadata/key replacement routes. ID/key tombstones survive burns. Identity uniqueness is **within a collection**, not across every contract deployed on IPI or another chain.

Deploy with no Wasm administrator. An administrator could migrate to replacement code that ignores the original contract's rules, even though this contract provides no migration entry point. The SDK rejects collections with an administrator and verifies the pinned code hash. Future contract versions require a separate deployment and explicit reader support.

Executions reject attached funds. Direct bank sends to the contract cannot be prevented and there is no withdrawal route; never use the collection as a payment address. Chain gas fees are separate from attached contract funds.

## Hardware guarantees require hardware

The contract can prove that a signature corresponds to a public key. It cannot distinguish a secure-element key from a software key or prove where generation happened. Non-exportability is enforced by the card OS, applet and provisioning policy, not by a JSON flag or blockchain assertion.

Production provisioning must generate the key inside the chip, permanently lock the binding and disallow export, import, reset/rebind and unrestricted signing. GlobalPlatform management keys must be managed independently of NFT keys. A reused wallet profile is insufficient unless its exact capabilities have been reviewed for this purpose. The [chip protocol](docs/CHIP-PROTOCOL.md) defines the required lifecycle and qualification checks.

All software signing keys in this repository appear only in test code. The shared vector uses a publicly known key consisting of 32 bytes of `07`. It is deliberately unsuitable for production, regardless of whether its signatures pass the contract.

## Reader and content protections

A static public key, UID or earlier signature is not proof of current possession. Readers generate independent 32-byte random challenges, bind proofs to the expected NFT, allow one attempt and enforce a timeout. The SDK rechecks state after the exchange and rejects burned NFTs. A query result is an observation of state, not a perpetual guarantee that ownership cannot change immediately afterward.

The challenge-response protocol does not defeat relaying to a real remote chip. It does not detect removal of a genuine chip from its original enclosure. Tamper-resistant physical integration and any proximity/anti-relay requirements need separate engineering.

Metadata and images remain untrusted content after their hashes match: hashing establishes identity, not harmlessness. The SDK does not automatically fetch arbitrary metadata URLs or execute content. The local metadata CLI accepts bounded PNG/JPEG/WebP headers, not SVG/HTML, and does not fully decode the artwork. Readers should use bounded downloads, safe image decoders and separate content from privileged UI contexts.

## Build and transaction discipline

Dependencies are locked; the release optimizer is pinned by digest and architecture. Builds remove any prior release manifest, verify lock/source stability, execute the produced Wasm in a VM and record the artifact/source hashes only after success. CI checks schema drift, contract tests and SDK tests. Run-time native crypto belongs to CosmWasm/wasmvm; operators must track the chain's own security updates as well as this repository's dependencies.

The SDK/CLI does not hold account mnemonics or broadcast transactions. Signing is delegated to the native IPI binary because IPI account signing differs from standard Cosmos signing. Verify committed transaction height and successful execution code. An accepted mempool transaction, timeout or network error is not a completed mint. Preserve the issuance journal and reconcile unknown outcomes before resubmission.

## Reporting

For a suspected vulnerability, contact the IPI maintainers through the repository host's private vulnerability-reporting channel if enabled, or an established private maintainer contact. Include the affected revision/deployment, reproducible steps and impact. Never include chip private keys, account seeds or GlobalPlatform secrets. No dedicated security email address is configured by this repository.
