#!/usr/bin/env node
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, join } from "node:path";
import { parseArgs } from "node:util";
import {
  address, bindingHash, compactSignature, compressedPublicKey, hexBytes, metadata, mintMessage,
  mintNonce, proofMessage, record, text, tokenId, validateBinding, verifyMetadata, type Binding,
} from "./core.js";
import { fetchJson, IpiNftClient, validateDeployment, endpoint } from "./client.js";

function file(path: string, limit: number): Buffer {
  if (!statSync(path).isFile() || statSync(path).size > limit) throw new Error(`Input file must be regular and <= ${limit} bytes`);
  const bytes = readFileSync(path);
  if (bytes.length > limit) throw new Error("Input grew beyond its limit");
  return bytes;
}
const jsonFile = (path: string) => record(JSON.parse(file(path, 64 * 1024).toString("utf8")));
function output(value: unknown, path?: string) {
  const bytes = `${JSON.stringify(value, null, 2)}\n`;
  if (path) writeFileSync(path, bytes, { flag: "wx", mode: 0o600 });
  else process.stdout.write(bytes);
}
const HELP = `IPI NFT — contract messages, metadata and verification (no private keys)

npm run nft -- <command> [options]
  metadata             --image FILE --name NAME [--description TEXT] --out NEW_DIRECTORY
  collection-message   --name NAME --symbol SYMBOL --issuer IPI_ADDRESS [--chain-id ID] [--out FILE]
  mint-request         --binding FILE --issuer IPI_ADDRESS --owner IPI_ADDRESS --out FILE
  mint-message         --request FILE --public-key HEX --signature HEX [--format der|compact] --out FILE
  transfer-message     --token-id ID --recipient IPI_ADDRESS [--out FILE]
  burn-message         --token-id ID [--out FILE]
  verify-deployment    --deployment FILE
  token                --deployment FILE --token-id ID
  verify-metadata      --metadata FILE --sha256 HEX
  transaction          --rest URL --chain-id ID --tx-hash HEX

Files are never overwritten. Messages are unsigned JSON for the native IPI node
CLI/keyring. See docs/DEPLOYMENT.md. No command in this CLI broadcasts a transaction.
`;
const specs: Record<string, string[]> = {
  metadata: ["image", "name", "description", "out"],
  "collection-message": ["name", "symbol", "issuer", "chain-id", "out"],
  "mint-request": ["binding", "issuer", "owner", "out"],
  "mint-message": ["request", "public-key", "signature", "format", "out"],
  "transfer-message": ["token-id", "recipient", "out"], "burn-message": ["token-id", "out"],
  "verify-deployment": ["deployment"], token: ["deployment", "token-id"],
  "verify-metadata": ["metadata", "sha256"], transaction: ["rest", "chain-id", "tx-hash"],
};

async function main() {
  const [command, ...args] = process.argv.slice(2);
  if (!command || command === "help" || command === "--help") { process.stdout.write(HELP); return; }
  const supported = specs[command];
  if (!supported) throw new Error(`Unknown command: ${command}`);
  const { values } = parseArgs({ args, strict: true, options: Object.fromEntries(supported.map((key) => [key, { type: "string" as const }])) });
  const required = (key: string) => text(values[key], `--${key}`, 4096);
  const optional = (key: string) => values[key] as string | undefined;
  if (command === "metadata") {
    const image = file(required("image"), 1024 * 1024);
    const result = metadata({ image, name: required("name"), description: optional("description") ?? "" });
    const out = resolve(required("out"));
    mkdirSync(out, { mode: 0o700 });
    const extension = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" }[result.value.image_mime_type]!;
    writeFileSync(join(out, `image.${extension}`), image, { flag: "wx", mode: 0o600 });
    writeFileSync(join(out, "metadata.json"), result.bytes, { flag: "wx", mode: 0o600 });
    output({ tokenUri: result.tokenUri, metadataSha256: result.metadataSha256, imageUri: result.value.image, imageSha256: result.value.image_sha256, published: false }, join(out, "manifest.json"));
    output({ directory: out, tokenUri: result.tokenUri, metadataSha256: result.metadataSha256, published: false });
  } else if (command === "collection-message") {
    output({ name: text(required("name"), "name", 128), symbol: text(required("symbol"), "symbol", 32), minter: address(required("issuer")), expected_chain_id: text(optional("chain-id") ?? "ipi-testnet-1", "chain ID", 128) }, optional("out"));
  } else if (command === "mint-request") {
    const binding = validateBinding(jsonFile(required("binding")) as Binding);
    const issuer = address(required("issuer")); const owner = address(required("owner"));
    const hash = bindingHash(binding); const nonce = mintNonce(issuer, owner);
    output({ ...binding, issuer, owner, bindingSha256: Buffer.from(hash).toString("hex"), nonce: Buffer.from(nonce).toString("hex"), messageHex: Buffer.from(proofMessage(hash, nonce)).toString("hex") }, required("out"));
  } else if (command === "mint-message") {
    const request = jsonFile(required("request"));
    const binding = validateBinding(request as Binding);
    const issuer = address(request.issuer); const owner = address(request.owner);
    const expected = proofMessage(bindingHash(binding), mintNonce(issuer, owner));
    if (request.bindingSha256 !== Buffer.from(bindingHash(binding)).toString("hex") || request.nonce !== Buffer.from(mintNonce(issuer, owner)).toString("hex") || request.messageHex !== Buffer.from(expected).toString("hex")) throw new Error("Issuance request was altered");
    const format = optional("format") ?? "der";
    if (format !== "der" && format !== "compact") throw new Error("Signature format must be der or compact");
    const keyText = required("public-key");
    const sigText = required("signature");
    if (sigText.length > 144 || sigText.length < 16 || sigText.length % 2) throw new Error("Invalid signature length");
    const publicKey = compressedPublicKey(hexBytes(keyText, keyText.length === 66 ? 33 : 65, "public key"));
    const signature = compactSignature(hexBytes(sigText, sigText.length / 2, "signature"), format);
    output(mintMessage({ ...binding, issuer, owner, publicKey, signature }), required("out"));
  } else if (command === "transfer-message") {
    output({ transfer_nft: { token_id: tokenId(required("token-id")), recipient: address(required("recipient")) } }, optional("out"));
  } else if (command === "burn-message") {
    output({ burn: { token_id: tokenId(required("token-id")) } }, optional("out"));
  } else if (command === "verify-deployment" || command === "token") {
    const client = new IpiNftClient(validateDeployment(jsonFile(required("deployment"))));
    if (command === "verify-deployment") { await client.checkDeployment(); output({ verified: true, ...client.deployment }); }
    else { const token = await client.getToken(required("token-id")); output({ ...token, publicKey: Buffer.from(token.publicKey).toString("hex") }); }
  } else if (command === "verify-metadata") {
    output({ verified: true, metadata: verifyMetadata(file(required("metadata"), 64 * 1024), required("sha256")) });
  } else if (command === "transaction") {
    const rest = endpoint(required("rest")); const chain = required("chain-id");
    const node = await fetchJson(`${rest}/cosmos/base/tendermint/v1beta1/node_info`);
    if (record(node.default_node_info).network !== chain) throw new Error("Node chain ID mismatch");
    const hash = Buffer.from(hexBytes(required("tx-hash"), 32, "transaction hash")).toString("hex").toUpperCase();
    const result = await fetchJson(`${rest}/cosmos/tx/v1beta1/txs/${hash}`);
    const tx = record(result.tx_response);
    if (typeof tx.txhash !== "string" || tx.txhash.toUpperCase() !== hash || typeof tx.height !== "string" || !/^[1-9][0-9]{0,19}$/.test(tx.height) || BigInt(tx.height) > 18446744073709551615n) throw new Error("Transaction is not confirmed");
    if (tx.code !== 0 && tx.code !== "0") throw new Error(`Transaction failed with code ${String(tx.code)}`);
    output({ confirmed: true, txHash: hash, height: String(tx.height), events: tx.events });
  }
}
main().catch((error: unknown) => { process.stderr.write(`${error instanceof Error ? error.message : "IPI NFT failed"}\n`); process.exitCode = 1; });
