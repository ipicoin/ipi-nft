import {
  address, base64Bytes, bindingHash, ChipChallenge, compressedPublicKey, CONTRACT_NAME,
  CONTRACT_VERSION, hashHex, hexBytes, PROTOCOL, record, text, tokenId, validateBinding, type Binding,
} from "./core.js";

export type Deployment = {
  chainId: string; rest: string; collection: string; codeId: string; wasmSha256: string;
};
type FetchLike = typeof fetch;
const MAX_RESPONSE = 1024 * 1024;
// QueryCode includes base64 bytecode: the optimized release exceeds 1 MiB as JSON.
const MAX_CODE_RESPONSE = 4 * 1024 * 1024;

function codeId(value: unknown): string {
  // Protobuf uint64 values must remain decimal strings, including above 2^53.
  if (typeof value !== "string" || !/^[1-9][0-9]{0,19}$/.test(value) || BigInt(value) > 18446744073709551615n) throw new Error("Deployment needs a verified code ID string");
  return value;
}

export function endpoint(raw: unknown): string {
  const url = new URL(text(raw, "REST endpoint", 512));
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(url.protocol === "http:" && loopback)) || url.username || url.password || url.search || url.hash) throw new Error("REST endpoint must use HTTPS (HTTP allowed only on loopback), without credentials, query or fragment");
  return url.toString().replace(/\/+$/, "");
}
export function validateDeployment(raw: unknown): Deployment {
  const d = record(raw, "deployment");
  return {
    chainId: text(d.chainId, "chain ID", 128), rest: endpoint(d.rest), collection: address(d.collection, "collection", true), codeId: codeId(d.codeId),
    wasmSha256: Buffer.from(hexBytes(d.wasmSha256, 32, "Wasm SHA-256")).toString("hex"),
  };
}
export async function fetchJson(url: string, fetchImpl: FetchLike = fetch, maxBytes = MAX_RESPONSE): Promise<Record<string, unknown>> {
  const response = await fetchImpl(url, { redirect: "error", signal: AbortSignal.timeout(15_000), headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`IPI REST returned HTTP ${response.status}`);
  if (Number(response.headers.get("content-length") ?? 0) > maxBytes) throw new Error(`REST response exceeds ${maxBytes / 1024 / 1024} MiB`);
  if (!response.body) throw new Error("Empty REST response");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      length += chunk.value.length;
      if (length > maxBytes) throw new Error(`REST response exceeds ${maxBytes / 1024 / 1024} MiB`);
      chunks.push(chunk.value);
    }
  } finally { await reader.cancel(); }
  return record(JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks))), "REST response");
}
export type Token = Binding & { publicKey: Uint8Array; burned: boolean; owner: string | null; issuer: string; initialOwner: string };

/** Queries a trusted REST node; this is not a CometBFT light client. */
export class IpiNftClient {
  readonly deployment: Readonly<Deployment>;
  readonly #fetch: FetchLike;
  constructor(deployment: Deployment, fetchImpl: FetchLike = fetch) {
    this.deployment = Object.freeze(validateDeployment(deployment));
    this.#fetch = fetchImpl;
  }
  async #get(path: string, maxBytes = MAX_RESPONSE) { return fetchJson(`${this.deployment.rest}${path}`, this.#fetch, maxBytes); }
  async query(message: unknown): Promise<Record<string, unknown>> {
    const encoded = encodeURIComponent(Buffer.from(JSON.stringify(message)).toString("base64"));
    const payload = await this.#get(`/cosmwasm/wasm/v1/contract/${this.deployment.collection}/smart/${encoded}`);
    if (typeof payload.data === "string") return record(JSON.parse(Buffer.from(payload.data, "base64").toString("utf8")), "query result");
    return record(payload.data, "query result");
  }
  async checkDeployment(): Promise<void> {
    const d = this.deployment;
    const [node, contract, code, protocol] = await Promise.all([
      this.#get("/cosmos/base/tendermint/v1beta1/node_info"),
      this.#get(`/cosmwasm/wasm/v1/contract/${d.collection}`),
      this.#get(`/cosmwasm/wasm/v1/code/${d.codeId}`, MAX_CODE_RESPONSE),
      this.query({ protocol: {} }),
    ]);
    if (record(node.default_node_info).network !== d.chainId) throw new Error("Node chain ID mismatch");
    const info = record(contract.contract_info);
    if (contract.address !== d.collection || codeId(info.code_id) !== d.codeId) throw new Error("Collection/code ID mismatch");
    if (info.admin !== "" && info.admin !== null) throw new Error("Collection must have no upgrade administrator");
    const codeInfo = record(code.code_info);
    const rawHash = codeInfo.data_hash;
    const codeHash = typeof rawHash === "string" && /^[a-f0-9]{64}$/i.test(rawHash)
      ? rawHash.toLowerCase() : Buffer.from(base64Bytes(rawHash, 32, "code checksum")).toString("hex");
    if (codeId(codeInfo.code_id) !== d.codeId || codeHash !== d.wasmSha256) throw new Error("Wasm checksum mismatch");
    if (typeof code.data !== "string") throw new Error("Missing Wasm bytecode");
    const wasm = Buffer.from(code.data, "base64");
    if (wasm.toString("base64") !== code.data || hashHex(wasm) !== d.wasmSha256) throw new Error("Downloaded Wasm checksum mismatch");
    if (protocol.contract !== CONTRACT_NAME || protocol.version !== CONTRACT_VERSION || protocol.chain_id !== d.chainId || protocol.proof_protocol !== PROTOCOL) throw new Error("Unsupported NFT contract/protocol");
  }
  async getToken(id: string): Promise<Token> {
    tokenId(id);
    await this.checkDeployment();
    const issuance = await this.query({ issuance: { token_id: id } });
    const extension = record(issuance.extension);
    if (issuance.token_id !== id || typeof issuance.burned !== "boolean" || extension.protocol !== PROTOCOL) throw new Error("Malformed issuance");
    const binding = validateBinding({ chainId: this.deployment.chainId, collection: this.deployment.collection, tokenId: id,
      tokenUri: text(issuance.token_uri, "token URI", 512), metadataSha256: text(extension.metadata_sha256, "metadata hash", 64) });
    if (!Buffer.from(bindingHash(binding)).equals(Buffer.from(hexBytes(extension.binding_sha256, 32, "binding hash")))) throw new Error("On-chain binding mismatch");
    const publicKey = compressedPublicKey(base64Bytes(extension.chip_public_key, 33, "chip public key"));
    const owner = issuance.burned ? null : address((await this.query({ owner_of: { token_id: id } })).owner, "token owner");
    return { ...binding, publicKey, owner, burned: issuance.burned, issuer: address(issuance.issuer, "issuer"), initialOwner: address(issuance.initial_owner, "initial owner") };
  }
  async authenticateChip(id: string, exchange: (request: { nonce: Uint8Array; bindingHash: Uint8Array; message: Uint8Array }) => Promise<Uint8Array>): Promise<Token> {
    const token = await this.getToken(id);
    if (token.burned) throw new Error("NFT was burned");
    const challenge = new ChipChallenge(token, token.publicKey);
    const signature = await exchange({ nonce: challenge.nonce, bindingHash: bindingHash(token), message: challenge.message });
    if (!challenge.verify(signature)) throw new Error("Chip authentication failed or challenge expired");
    // A burn or deployment change during reader interaction must fail closed.
    const current = await this.getToken(id);
    if (current.burned || !Buffer.from(current.publicKey).equals(Buffer.from(token.publicKey)) || !Buffer.from(bindingHash(current)).equals(Buffer.from(bindingHash(token)))) throw new Error("NFT changed during authentication");
    return current;
  }
}
