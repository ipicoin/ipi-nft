# Deploy and issue on IPI

Run commands in the repository root using **Bash**. This guide uses **`ipi-testnet-1`** for the v2 deployment examples. The [historical v1 collection](../deployments/ipi-testnet-1.release.md) serves the Java Card profile. Pokédex uses a separate P-256 v2 collection for NTAG X DNA.

The native IPI node executable and keyring must handle signing. The prototype account adapter supports Cosmos SDK secp256k1 and secp256r1 with SIGN_MODE_DIRECT. Select the account type and address derivation actually configured on the target chain; the historical testnet wallet instructions are not evidence of compatibility with a different account profile. The NFT chip key is a separate identity key and must never be used as the issuer's account key.

## 1. Prepare a release and the operator environment

```sh
npm ci --ignore-scripts
npm test
npm run test:contract
npm run schema
npm run build:contract
sha256sum artifacts/ipi_nft.wasm
cat artifacts/release.json
```

The contract uses CosmWasm 2.x, CW721 0.20 and secp256r1 (P256) verification. The build validates the module and executes it in CosmWasm VM 2.3.4. The public testnet node reported wasmd 0.60.8 and wasmvm 2.3.4 during the [readiness check](TESTNET-READINESS.md). Recheck live configuration and upload/instantiate permissions before deploying; the node can be upgraded independently of this repository.

The Pokédex NTAG X DNA profile pins the Wasm tested by Tokenomy with Cosmos SDK k1 and r1 accounts. Its SHA-256 is `31c5713031532e33e5718107d03c2e44264058c98c9f2fd455464dcbe97d1d77`. Verify that the optimized artifact has this checksum before uploading.

For a tagged release, build from the committed checkout and archive `ipi_nft.wasm`, `checksums.txt` and `release.json` together. The manifest records the actual Wasm hash, pinned optimizer digest, source hashes, Git revision and dirty state. Never reuse another project's code ID, including a Card Vault code ID.

Set the following for your installation. No gas price or executable name is guessed by this repository:

```sh
export IPI_CHAIN_ID=ipi-testnet-1
export IPI_RPC=https://rpc-testnet.ipi.io
export IPI_REST=https://rest-testnet.ipi.io

# Supply these values for your node installation and funded testnet account:
# export IPI_NODE_BIN=/absolute/path/to/the/native/ipi-node-binary
# export IPI_KEY=your-testnet-key-name
# export IPI_KEYRING_BACKEND=os
# export IPI_GAS_PRICES=...aipi

: "${IPI_NODE_BIN:?Set the native IPI node binary path}"
: "${IPI_KEY:?Set a funded testnet key name}"
: "${IPI_KEYRING_BACKEND:?Set the keyring backend used by your node}"
: "${IPI_GAS_PRICES:?Set the current testnet gas price in aipi}"

IPI_ISSUER=$("$IPI_NODE_BIN" keys show "$IPI_KEY" --address --keyring-backend "$IPI_KEYRING_BACKEND")
export IPI_ISSUER
IPI_TX_ARGS=(
  --from "$IPI_KEY" --keyring-backend "$IPI_KEYRING_BACKEND"
  --chain-id "$IPI_CHAIN_ID" --node "$IPI_RPC"
  --gas auto --gas-adjustment 1.4 --gas-prices "$IPI_GAS_PRICES"
  --broadcast-mode sync --output json
)

curl --fail --silent --show-error "$IPI_REST/cosmos/base/tendermint/v1beta1/node_info"
"$IPI_NODE_BIN" query wasm params --node "$IPI_RPC" --output json
```

Verify that REST and RPC report the expected chain ID, the node is synchronized and the latest block height advances between checks. `aipi` is the configured atomic denomination (18 decimal places per IPI). Check the live node's minimum gas policy at `/cosmos/base/node/v1beta1/config` and account for any dynamic base price before setting fees.

## 2. Upload and instantiate

Query `wasm list-code` and compare the code hashes with the release manifest. If the hash already exists, inspect its instances with `wasm list-contract-by-code`. Reuse an existing collection only after the Pokédex export below verifies its identity and minter.

Create an unsigned collection message:

```sh
mkdir -p data
npm run nft -- collection-message \
  --name "IPI Objects" --symbol IPINFT \
  --issuer "$IPI_ISSUER" --chain-id "$IPI_CHAIN_ID" \
  --out data/instantiate.json
cat data/instantiate.json
```

Upload the **exact verified artifact** through your native node CLI. These are standard `x/wasm` commands; confirm the flags with your node's `tx wasm --help` if its command surface differs.

```sh
"$IPI_NODE_BIN" tx wasm store artifacts/ipi_nft.wasm "${IPI_TX_ARGS[@]}"
```

On the Tokenomy prototype, the qualified upload used a declared limit of `5900000` gas within a `6000000` transaction-phase budget that reserves `100000` for policy lookup. If this is your chain's policy, use `--gas 5900000` in place of `--gas auto --gas-adjustment 1.4` for the store transaction and check the applicable base price before each submission.

The CLI's normal transaction confirmation remains active. Save the resulting transaction hash. A `sync` response with `code: 0` only means the node accepted the transaction for processing. It is **not** proof of successful inclusion.

```sh
# export IPI_STORE_TX_HASH=...  # Hash returned by the preceding command
npm run nft -- transaction \
  --rest "$IPI_REST" --chain-id "$IPI_CHAIN_ID" --tx-hash "$IPI_STORE_TX_HASH"
```

Retry this **read-only query** until inclusion is known. It succeeds only when the returned hash matches, height is positive and execution code is zero. A timeout, HTTP failure or transaction-not-found response is an unknown outcome: investigate the existing hash before submitting another transaction.

Read the new `code_id` from the confirmed `store_code` event and verify its checksum:

```sh
# export IPI_NFT_CODE_ID=...  # Exact decimal string from the confirmed event
"$IPI_NODE_BIN" query wasm code-info "$IPI_NFT_CODE_ID" --node "$IPI_RPC" --output json
```

The on-chain `data_hash` must equal the SHA-256 in `artifacts/release.json`. REST may encode this hash as base64; the SDK accepts canonical base64 or hexadecimal. Reusing a code ID is acceptable only after independently checking the exact checksum and intended network.

Instantiate with **no administrator**:

```sh
"$IPI_NODE_BIN" tx wasm instantiate "$IPI_NFT_CODE_ID" "$(cat data/instantiate.json)" \
  --label "IPI Objects v2" --no-admin "${IPI_TX_ARGS[@]}"
```

Confirm the transaction by hash and extract the collection address from the instantiate event. Export the verified deployment for Pokédex once the collection is live.

```sh
# export IPI_NFT_COLLECTION=ipi1...  # Address from the confirmed instantiate event
npm run nft -- pokedex-deployment \
  --chain-id "$IPI_CHAIN_ID" --rest "$IPI_REST" \
  --collection "$IPI_NFT_COLLECTION" --code-id "$IPI_NFT_CODE_ID" \
  --issuer "$IPI_ISSUER" --out data/deployment.json
```

The command verifies the chain, collection address, code ID, advertised checksum and downloaded Wasm, absence of an upgrade administrator, contract name and version, proof protocol and expected minter. Keep the successful store and instantiate transaction hashes and the Wasm release provenance with the public v2 deployment record.

### Hand off to Pokédex

Distribute `data/deployment.json` through a trusted operator channel. Select **NXP NTAG X DNA · P-256 · v2** and load the file with **Choose v2 collection**. For the Pokédex CLI, set `IPI_NFT_NTAG_DEPLOYMENT` to its absolute path or save it to `protocol/ntag-deployment.local.json` in the Pokédex checkout.

Use **Write NFT** in Pokédex to prepare and publish the metadata, and then write the chip with its application credential. Run the exported `mint.json` with the collection issuer's native IPI keyring, confirm the transaction and use **Verify blockchain mint** with the chip present. Sections 3–5 also describe the equivalent manual metadata and transaction-message workflow.

## 3. Publish the item metadata

```sh
npm run nft -- metadata \
  --image ./my-item.png --name "IPI Object #1" \
  --description "The first physical item." --out data/item-1
cat data/item-1/manifest.json
```

The command writes a new directory exclusively. It rejects an existing output path. It creates a content commitment, not an upload. PNG, JPEG and WebP magic bytes are accepted; this is not a full image decoder or malware scanner. Validate source artwork with your normal image tooling.

For an installed, running [Kubo node](https://docs.ipfs.tech/reference/kubo/cli/#ipfs-block-put), publish **both** raw blocks:

```sh
ipfs block put --cid-codec=raw --mhtype=sha2-256 --pin data/item-1/image.png
ipfs block put --cid-codec=raw --mhtype=sha2-256 --pin data/item-1/metadata.json
```

Use `image.jpg` or `image.webp` when applicable. Each returned CID must exactly match its `imageUri` or `tokenUri`, without the `ipfs://` prefix. These are single raw blocks; `ipfs add` may produce different CIDs because it can wrap/chunk files into UnixFS. JSON links inside a raw metadata block are not traversed by recursive pinning, so pin the image separately.

Verify retrieval from your intended gateway or another node, compare the image SHA-256 and run:

```sh
npm run nft -- verify-metadata \
  --metadata data/item-1/metadata.json \
  --sha256 "$(node -p 'JSON.parse(require("node:fs").readFileSync("data/item-1/manifest.json", "utf8")).metadataSha256')"
```

Retain a durable pinning/backup arrangement for both files. Minting commits the hashes permanently, so finish publication and validate the bytes first. The `published: false` value records the CLI's local preparation state; the CLI does not change it or claim network availability after external publication.

## 4. Prepare the chip binding and mint request

Choose an ID and initial owner. IDs are case-sensitive strings of 1–128 ASCII letters, digits or `._:-`; an ID cannot be reused after burning.

```sh
export IPI_TOKEN_ID=item-1
export IPI_INITIAL_OWNER="$IPI_ISSUER"
node --input-type=module <<'JS'
import { readFileSync, writeFileSync } from 'node:fs';
import { validateBinding } from './dist/sdk/index.js';
const deployment = JSON.parse(readFileSync('data/deployment.json', 'utf8'));
const metadata = JSON.parse(readFileSync('data/item-1/manifest.json', 'utf8'));
const binding = validateBinding({
  chainId: deployment.chainId, collection: deployment.collection,
  tokenId: process.env.IPI_TOKEN_ID, tokenUri: metadata.tokenUri,
  metadataSha256: metadata.metadataSha256,
});
writeFileSync('data/item-1/binding.json', JSON.stringify(binding, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
JS
npm run nft -- mint-request \
  --binding data/item-1/binding.json --issuer "$IPI_ISSUER" \
  --owner "$IPI_INITIAL_OWNER" --out data/item-1/request.json
```

The request contains `bindingSha256`, deterministic mint `nonce` and complete `messageHex`. It contains **no private key**. Read the [chip protocol](CHIP-PROTOCOL.md) before implementing a card adapter.

The future qualified applet must generate a new key internally, permanently commit the binding, export only its public key and sign the request using ECDSA/secp256r1/SHA-256. Provisioning must complete and be read back successfully before minting. There is no production software-key fallback or simulated-card mint command in this repository.

Supply the real card response:

```sh
# export IPI_CHIP_PUBLIC_KEY=...  # SEC1 public key, 33 or 65 bytes, hexadecimal
# export IPI_CHIP_SIGNATURE=...  # Java Card DER ECDSA signature, hexadecimal
npm run nft -- mint-message \
  --request data/item-1/request.json \
  --public-key "$IPI_CHIP_PUBLIC_KEY" --signature "$IPI_CHIP_SIGNATURE" \
  --format der --out data/item-1/mint.json
cat data/item-1/mint.json
```

The CLI checks the request commitments, normalizes the key/signature, verifies the proof and writes the unsigned execute message. The wire signature is 64-byte compact `r || s` with low-S normalization. Do not pre-hash `messageHex` before using Java Card `ALG_ECDSA_SHA_256`; that API hashes the message itself.

## 5. Mint and confirm

Recheck the deployment and minter, then broadcast as the authorized issuer:

```sh
npm run nft -- verify-deployment --deployment data/deployment.json
"$IPI_NODE_BIN" tx wasm execute "$IPI_NFT_COLLECTION" "$(cat data/item-1/mint.json)" \
  "${IPI_TX_ARGS[@]}"
```

Do not attach `--amount`. Confirm successful inclusion using the transaction command, then inspect the NFT:

```sh
npm run nft -- token --deployment data/deployment.json --token-id "$IPI_TOKEN_ID"
```

Compare token ID, initial owner, public key, URI, metadata hash and binding with the provisioning journal. Complete a **fresh** hardware challenge using `authenticateChip`; replaying the public mint signature does not establish that the card is present now. Record the issuance as completed only after all checks pass.

## Recovery and operator changes

| Situation | Action |
| --- | --- |
| Broadcast timed out or response is missing | Query the known hash and issuance. Check account sequence/node logs if the hash is unknown. Do not blindly resubmit. |
| Card is locked but mint has not succeeded | Keep the same key and binding. Reconcile chain state; obtain another proof for the same binding when needed. |
| Issuer or initial owner changes before mint | Rebuild the mint nonce/request and obtain a new signature. The immutable binding stays the same. |
| Metadata, chain, collection or token ID must change after card lock | The locked chip cannot be reassigned. Start a separate issuance with a new chip; retain the abandoned journal. |
| Token was burned | Its ID and key stay reserved. Retire the physical identity; do not present it as an active NFT. |
| Chip is lost or damaged | There is no key-reset or rebind backdoor. Follow your explicit physical replacement policy using a new identity. |

Rotate the minter through `update_minter_ownership` with `transfer_ownership`, then have the proposed new account call `accept_ownership`. An optional expiry is supported by CW Ownable. `renounce_ownership` permanently ends new issuance. Existing owners retain normal CW721 rights. Consult the generated execute schema before signing an administrative change.

For transfer, send or burn, follow [owner and chip action preparation](OWNER-CHIP-ACTIONS.md) with `action-request` and `action-message`, then execute as the current NFT owner. An operator cannot substitute for the owner. A burn is permanent; it also causes chip authentication through this SDK to fail. Selling or handing over the physical object is a separate process from the on-chain transfer.
