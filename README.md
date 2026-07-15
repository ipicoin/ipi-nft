# IPI NFT Research Interface

An experimental Cosmos NFT interface for studying wallet connection, mint,
sale, unlist, price-update, and burn flows.

> **Status: inherited prototype.** It is not an official marketplace, asset
> registry, or audited production application. Do not use it with assets of
> value or assume its metadata is authentic.

## Development

The codebase uses an older Create Cosmos App / Next.js stack. Review and update
its dependencies before exposing a deployment.

```sh
yarn
yarn dev
yarn build
```

The local application is served at `http://localhost:3000`. GraphQL and network
configuration lives under `config/` and must be verified against the intended
network and indexer.

## Contributing safely

Production-quality work would require explicit chain, collection, contract,
and token identity; transaction simulation; authorization and burn warnings;
untrusted metadata isolation; indexer consistency checks; deterministic tests;
and independent security review.

## Provenance and license

This repository derives from Hyperweb Create Cosmos App's `nft` example. See
[UPSTREAM.md](UPSTREAM.md) for provenance and migration context. Upstream and
IPI modifications are distributed under the [MIT License](LICENSE).
