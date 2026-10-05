# Upstream provenance

The original repository imported the NFT example from [Hyperweb Create Cosmos App](https://github.com/hyperweb-io/create-cosmos-app), source path `examples/nft`, under the MIT license. The exact upstream revision used for that initial import was not recorded. Repository history and original copyright notices are preserved.

IPI NFT v0.1.0 replaces that Stargaze/Next.js application with a new CosmWasm contract and TypeScript protocol/CLI. Historical release notes are retained in [docs/history/stargaze-changelog.md](docs/history/stargaze-changelog.md); they do not describe the current implementation.

The contract uses the separately licensed [CW721 implementation](https://github.com/public-awesome/cw-nfts) as a Cargo dependency, rather than claiming its standard NFT logic as original IPI work. CosmWasm and the remaining dependencies retain their respective licenses. Exact resolved dependencies are recorded in the Cargo and npm lockfiles.
