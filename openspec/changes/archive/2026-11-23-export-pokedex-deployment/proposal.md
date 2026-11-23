## Why

Pokédex needs the chain and collection identity of a live NTAG X DNA deployment. Its NTAG profile admits the exact v2 Wasm qualified by Tokenomy, so a deployment that passes the general SDK identity checks can still be incompatible with the station.

## What Changes

- Export a Pokédex manifest with the Tokenomy Wasm checksum and the verified live collection identity.
- Check the expected collection minter before handing off the manifest for first issuance.
- Document the operator handoff from the optimized Wasm to NTAG provisioning in Pokédex.

## Capabilities

### Modified Capabilities

- `metadata-cli` supports exporting a verified Pokédex deployment manifest.

## Impact

The CLI, deployment guide and verification tests gain an NTAG handoff. The existing artifact implements CW721 and the Tokenomy v2 protocol at the source revision shared by both projects.
