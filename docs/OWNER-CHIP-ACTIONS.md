# Owner and chip actions (v0.2.0)

Object chips use secp256r1 = NIST P-256. Account wallets may use Cosmos secp256k1 or secp256r1; the chain authenticates those accounts independently. Brainpool is not P256. The NFT is the sole ownership record. No native bank authorization is inferred from holding this NFT.

Only chain gas is charged, to the sender or a chain-supported explicit fee sponsor. No registration, transfer or burn surcharge is introduced. Off-chain reads and signature exchanges are not transactions. NFT mint/burn does not mint/burn currency.

The CLI never signs account transactions, accepts private keys or broadcasts. The owner must submit the generated message through its account signer. Transfer/send/burn cannot use the old unsigned messages without a chip authorization.

1. Query the approved collection's issuance and current owner. Verify its deployment identity with the v2 SDK. Read `actionSequence` from `getToken()` and obtain the current chain height.
2. Create an intent JSON with the binding fields (`chainId`, `collection`, `tokenId`, `tokenUri`, `metadataSha256`), `owner`, `action`, `target`, `payloadHex`, `sequence` and `expiresHeight`. The last two fields are decimal strings. Choose expiry above the current height and no more than 1000 blocks ahead. Transfer uses the recipient and empty payload; burn uses empty target/payload; send commits the exact receiver callback payload.
3. Run `npm run nft -- action-request --intent intent.json --out request.json`.
4. Obtain the chip's P256 signature over `messageHex` using the protocol's action command. A hashing ECDSA API hashes the full message once. Do not substitute a reader/mint signature.
5. Run `npm run nft -- action-message --request request.json --public-key HEX --signature HEX --format der --out message.json` (or `--format compact`). This validates the chip signature against the intent; the contract independently validates the stored chip key, owner, sequence and expiry.
6. Have the current owner's account sign the chain transaction, then verify successful committed execution. Reconcile unknown outcomes before preparing another action. A stale sequence, expired proof or changed target is rejected.

SDK equivalents are `actionMessage(input)` and `ownershipMessage(input, publicKey, compactSignature)`. The first constructs bytes for hardware; the second verifies and emits unsigned JSON. Neither asserts that a supplied state snapshot is fresh; the contract enforces freshness and authorization when executed.

There is no recovery, privileged burn, key replacement or operator bypass. A contract receiving an item must support this protocol to move it later and must still obtain chip proof; ordinary CW721 custody code can strand it. Existing v1 no-admin collections cannot be migrated in place. Use a new deployment and binding, never relabel an old deployment as v2.

Software fixtures use public test keys. Physical applet implementation, transport and non-exportability qualification remain separate acceptance work.
