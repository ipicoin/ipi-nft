# IPI Objects v2 on the finance network

The immutable v2 collection was deployed on 23 November 2026 to the live `ipi-r1-finance-37905100-1` network through `ipi-validator-shadowblade`. The deployed Wasm matches the Tokenomy and Pokédex NTAG X DNA checksum. The deployment identity and confirmed transaction hashes are recorded in the companion file. [Deployment record](ipi-r1-finance-37905100-1.json)

| Operation | Height | Gas used | Gas limit | Fee in IPI |
| --- | --- | --- | --- | --- |
| Store code 1 | 1380603 | 5599450 | 5900000 | 0.0059 |
| Instantiate | 1380618 | 206700 | 1000000 | 0.001 |

The existing `operator` account is the collection minter. Its balance after deployment was 0.9911 IPI. Both transactions returned execution code zero. The collection reported zero issued NFTs at handoff.

## Start the station

On the operator workstation, run the launcher.

```sh
/work/ipi/start-nft-pokedex.sh
```

It connects the local REST port `11317` and RPC port `26687` to Shadowblade, starts the existing Kubo user service, verifies the selected collection and opens Pokédex. SSH prompts for the encrypted key when another authenticated tunnel is needed. The station manifest is `/work/ipi/ipi-nft-pokedex/protocol/ntag-deployment.local.json`.

The desktop was opened and visually checked with the NTAG profile selected, the finance-network collection verified, and an unassigned NTAG X DNA connected through ACS ACR1281U. The operator must select the chip's application credential, choose the artwork and initial owner, publish the metadata, and use **Write NFT to card**. The station then exports `mint.json`.

## Submit the first mint manually

Copy the prepared job's export directory to the server. Set `JOB` to the UUID displayed by Pokédex.

```sh
scp -i /work/serwery_baremetal/shadowblade.space/.ssh/shadow -r \
  "/work/ipi/ipi-nft-pokedex/data/nft/exports/$JOB" \
  root@shadowblade.space:/opt/ipi-nft/current/data/
ssh -i /work/serwery_baremetal/shadowblade.space/.ssh/shadow root@shadowblade.space
```

Use Bash on the server. Set `JOB` again to the same UUID and inspect its manifest and mint message.

```bash
bash
source /opt/ipi-nft/current/data/operator.env
cd "/opt/ipi-nft/current/data/$JOB"
cat manifest.json mint.json
node /opt/ipi-nft/current/dist/sdk/cli.js verify-deployment \
  --deployment /opt/ipi-nft/current/data/deployment.json
export IPI_GAS_PRICES="$("$IPI_BINARY" query feemarket base-fee \
  --node "$IPI_RPC" -o json | jq -r '.base_fee + "aipi"')"
"$IPI_BINARY" tx wasm execute "$IPI_NFT_COLLECTION" "$(cat mint.json)" \
  --from "$IPI_ISSUER_KEY" --chain-id "$IPI_CHAIN_ID" --node "$IPI_RPC" \
  --gas auto --gas-adjustment 1.5 --gas-prices "$IPI_GAS_PRICES" \
  --broadcast-mode sync --output json --yes > mint-broadcast.json
cat mint-broadcast.json
```

The native helper at `/opt/ipi-nft/current/bin/ipi-node` invokes the running chain binary with its existing operator keyring. Its password is supplied locally from the server's existing protected credential file.

Confirm the returned transaction hash before repeating any submission.

```bash
node /opt/ipi-nft/current/dist/sdk/cli.js transaction \
  --rest "$IPI_REST" --chain-id "$IPI_CHAIN_ID" \
  --tx-hash "$(jq -r .txhash mint-broadcast.json)"
```

Return to Pokédex and use **Verify blockchain mint** with the same chip present.

## Service configuration and verification

The release and SDK are installed at `/opt/ipi-nft/current`. Node.js 24.22.2 is isolated under `/opt/ipi-nft/runtime`. The REST API is enabled on `ipi-validator-shadowblade2` and published on server loopback `127.0.0.1:1317`. Its systemd override is `95-nft-rest.conf`, with prior configuration backed up under `/opt/ipi-nft/backups/2026-11-23`. The secondary validator resumed synchronized operation after its restart.

Both the server SDK and the workstation Pokédex verified chain identity, code ID, actual Wasm bytes, protocol, version, absent administrator and minter. The missing-token REST response matched the station's preparation checks. Kubo and PC/SC were available. The physical write and first mint are the operator's next actions.
