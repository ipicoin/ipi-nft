# IPI NFT testnet deployment — 2026-10-05

The `IPI Objects` collection (`IPINFT`, label `IPI Objects v1`) was deployed on
`ipi-testnet-1` using the native `ipid` CLI and the `validator-operator` file
keyring. Both transactions were confirmed at positive block heights with
execution code `0`. The contract has no upgrade administrator.

| Field | Value |
| --- | --- |
| Collection | `ipi1xsmqvl8lqr2uwl50aetu0572rss9hrza5kddpfj9ky3jq80fv2tsx04z2g` |
| Code ID | `4` |
| Wasm SHA-256 | `05e8fb6d8e5600daaba02c03b5f59d28f587b125176a2925db401f7ac38b1f05` |
| Wasm bytes | `801057` |
| Minter / transaction sender | `ipi1qujhma0nl02e98tj823r6c3vx5sxpx36relq27` |
| Upgrade administrator | None (`--no-admin`; on-chain admin is empty) |
| Contract | `crates.io:ipi-nft` version `0.1.0` |
| Proof protocol | `ipi-nft-chip-v1` |
| Source revision | `b7cfab63a6592d3ecd00ba83e1d9eb139c2f53ea` |
| Source state at build | Clean (`artifacts/release.json`: `dirty: false`) |

| Transaction | Hash | Height | UTC timestamp | Execution code |
| --- | --- | --- | --- | --- |
| `tx wasm store` | `C56DBD9DF68E1D1BEC5D050BF6B64A46765CA3CC79E18258EC7A25149E836CB9` | `1197767` | `2026-10-05T18:28:12Z` | `0` |
| `tx wasm instantiate` | `B6F1200745AD2C1D84160C2EA9A6B3A958B7E39455F2375A39424711AAF0D583` | `1197781` | `2026-10-05T18:29:23Z` | `0` |

Gas price was checked against the live node configuration and set to
`1000000000aipi`, with automatic estimation and adjustment `1.4`. Store used
`5508512` gas with limit `7683933` and fee `7683933000000000aipi`.
Instantiate used `205872` gas with limit `260304` and fee `260304000000000aipi`.
Total fees were `7944237000000000aipi` (`0.007944237 IPI`). No funds were attached
to the instantiate message.

The Wasm was built from this checkout with `npm run build:contract`, Rust
`1.86.0` and optimizer
`cosmwasm/optimizer@sha256:7e0b9229c1a4118d0c9a2af2e7f5d95a91f264c26a2ce5681c779926e74d7f85`
on `linux/amd64`. SDK commands ran under Node.js `24.21.0`.

Validation completed:

- `npm ci --ignore-scripts` and `npm test`: 29 SDK/CLI tests passed.
- `npm run test:contract`: formatting, Clippy and 14 Rust tests passed.
- `npm run schema`: generated schemas matched the committed files.
- The build's CosmWasm VM `2.3.4` test passed against the optimized Wasm.
- Public RPC and the local synchronized node agreed on a block hash before deployment.
- Native CLI code metadata, the REST checksum and downloaded Wasm bytes matched
  the release SHA-256 before instantiation.
- The repository's `transaction` command confirmed each transaction's chain,
  hash, positive height and successful execution.
- `npm run nft -- verify-deployment --deployment data/deployment.json` returned
  `verified: true`, including chain, collection, code, bytecode, administrator,
  contract version and protocol checks.
- `get_minter_ownership` returned the minter above, with `pending_owner: null`
  and `pending_expiry: null`.

The SDK-compatible public manifest is [ipi-testnet-1.json](ipi-testnet-1.json).
It also retains the minter, administrator, transaction hashes and source revision.
The operator copy is `data/deployment.json`; transaction responses and verification
evidence are in `data/deployment-evidence/`.

The local archive `artifacts/ipi-nft-ipi-testnet-1-code-4.tar.gz` contains the
Wasm, checksums, release manifest, deployment records, instantiate message and
verification evidence. Its SHA-256 is recorded beside it in
`artifacts/ipi-nft-ipi-testnet-1-code-4.tar.gz.sha256`.
