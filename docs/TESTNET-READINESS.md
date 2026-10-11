# Testnet readiness observation

Read-only checks performed on **2026-10-05**, around block **1,197,497**, whose reported timestamp was `2026-10-05T18:05:14.202573148Z`. This is a dated observation, not a deployment record or ongoing availability guarantee.

| Check | Observed result |
| --- | --- |
| REST node network | `ipi-testnet-1` |
| RPC synchronization | `catching_up: false` |
| Cosmos SDK | `v0.53.6` |
| wasmd dependency | `v0.60.8` |
| wasmvm dependency | `v2.3.4` |
| Code upload permission | `Everybody` |
| Default instantiate permission | `Everybody` |
| Node minimum gas price | `1000000000.000000000000000000aipi` |
| Wasm limits configuration response | `{}` (no explicit overrides reported) |
| Node.js SDK HTTP path | Successfully read the expected chain ID |

Sources queried directly:

- [REST node info](https://rest-testnet.ipi.io/cosmos/base/tendermint/v1beta1/node_info)
- [RPC status](https://rpc-testnet.ipi.io/status)
- [Wasm parameters](https://rest-testnet.ipi.io/cosmwasm/wasm/v1/codes/params)
- [Node configuration](https://rest-testnet.ipi.io/cosmos/base/node/v1beta1/config)
- [Wasm limits](https://rest-testnet.ipi.io/cosmwasm/wasm/v1/wasm-limits-config)

A read of existing code ID `2` confirmed the standard REST response shape (`code_info` plus base64 `data`) and matching advertised/downloaded SHA-256. **That code is unrelated to this NFT release and must not be used as its code ID.** The SDK validates both advertised code identity and the actual downloaded bytes. Its code-response bound is 4 MiB to accommodate base64 expansion of the release artifact; ordinary JSON responses remain bounded to 1 MiB.

The local optimized contract was accepted and exercised by CosmWasm VM **2.3.4**, the same version reported by the node. This establishes a useful compatibility baseline. At the time of these checks, successful upload/instantiate transactions and a subsequent approved deployment record were still required to establish a deployed NFT collection.

No funds were spent, no transaction was signed/broadcast and no card was provisioned during these checks. `deployments/ipi-testnet-1.template.json` remains deliberately unconfigured. Recheck permissions, gas policy, runtime version and node synchronization immediately before deployment.

Follow-up on **2026-10-11**: the public collection and code ID in [the deployment record](../deployments/ipi-testnet-1.json) were checked against the live REST node. The advertised and downloaded Wasm hashes matched the release artifact; both deployment transactions were confirmed successful, and the minter matched the [release note](../deployments/ipi-testnet-1.release.md). This does not certify hardware or guarantee future node availability.
