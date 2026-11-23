## Artifact compatibility

- The pinned optimizer reproduced the Tokenomy artifact at SHA-256 `31c5713031532e33e5718107d03c2e44264058c98c9f2fd455464dcbe97d1d77`. The optimized CosmWasm VM lifecycle and all 17 Rust integration tests passed. Schema regeneration produced an identical ABI.
- The Tokenomy verifier checked 86 saved transactions for Cosmos SDK secp256k1 and secp256r1 accounts, repeat semantics, and the mint, read and transfer proofs against this checkout's SDK.

## Operator handoff

- All 34 SDK and CLI tests passed. The new regression check rejects a chain ID outside the NTAG profile and a different v2 artifact before creating a file.
- A loopback REST fixture served the optimized Wasm and a decimal code ID above JavaScript's safe integer range. The generated file loaded through the Pokédex `status` command. The exporter rejected an unexpected minter, an administrator, altered downloaded bytes and an existing output path.
- Pokédex type and lint checks, 52 TypeScript tests, six Python tests and the desktop build passed. Strict OpenSpec validation passed.
- The Java Card simulator passed 46 applet assertions and three SDK signature checks. The NFT helper passed 22 offline checks.

The loopback fixture exercises manifest compatibility. A live deployment record and physical issuance require their own verification.
