import assert from "node:assert/strict";
import { test } from "node:test";
import { CONTRACT_NAME, CONTRACT_VERSION, hashHex, PROTOCOL } from "../sdk/core.js";
import { endpoint, fetchJson, IpiNftClient, validateDeployment, type Deployment } from "../sdk/client.js";
import { vector as v, bytes, sign } from "./helpers.js";

const wasm = Buffer.from("0061736d01000000", "hex");
const deployment: Deployment = { chainId: v.binding.chainId, rest: "https://rest.example", collection: v.binding.collection, codeId: "9007199254740993", wasmSha256: hashHex(wasm) };
function fixture(wasmBytes = wasm) {
  const configured = { ...deployment, wasmSha256: hashHex(wasmBytes) };
  const state = {
    node: { default_node_info: { network: deployment.chainId } },
    contract: { address: deployment.collection, contract_info: { code_id: deployment.codeId, admin: "" } },
    code: { code_info: { code_id: deployment.codeId, data_hash: configured.wasmSha256 }, data: wasmBytes.toString("base64") },
    protocol: { contract: CONTRACT_NAME, version: CONTRACT_VERSION, chain_id: deployment.chainId, proof_protocol: PROTOCOL },
    issuance: { token_id: v.binding.tokenId, token_uri: v.binding.tokenUri, burned: false, issuer: v.issuer, initial_owner: v.owner, minted_height: 1,
      extension: { protocol: PROTOCOL, binding_sha256: v.bindingSha256, metadata_sha256: v.binding.metadataSha256, chip_public_key: bytes(v.publicKey).toString("base64") } },
    owner: v.owner,
  };
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async (url, options) => {
    assert.equal(options?.redirect, "error"); assert.ok(options?.signal);
    const path = new URL(String(url)).pathname; calls.push(path);
    let value: unknown;
    if (path.endsWith("/node_info")) value = state.node;
    else if (path.endsWith(`/contract/${deployment.collection}`)) value = state.contract;
    else if (path.endsWith(`/code/${deployment.codeId}`)) value = state.code;
    else if (path.includes("/smart/")) {
      const msg = JSON.parse(Buffer.from(decodeURIComponent(path.split("/smart/")[1]!), "base64").toString());
      value = { data: "protocol" in msg ? state.protocol : "issuance" in msg ? state.issuance : { owner: state.owner } };
    } else throw new Error(`Unexpected request: ${path}`);
    return Response.json(value);
  };
  return { state, calls, client: new IpiNftClient(configured, fetchImpl) };
}

test("deployment pins chain, exact address, uint64 code ID, checksum and immutable admin state", async () => {
  const f = fixture(); await f.client.checkDeployment();
  assert.equal((await f.client.getToken(v.binding.tokenId)).owner, v.owner);
  f.state.code.code_info.data_hash = Buffer.from(deployment.wasmSha256, "hex").toString("base64");
  await f.client.checkDeployment();
  assert.ok(f.calls.length > 0);
  assert.equal(Object.isFrozen(f.client.deployment), true);
});

const changes: [string, (f: ReturnType<typeof fixture>) => void][] = [
  ["chain", f => { f.state.node.default_node_info.network = "wrong-chain"; }],
  ["collection", f => { f.state.contract.address = v.owner; }],
  ["code ID", f => { f.state.contract.contract_info.code_id = "1"; }],
  ["numeric code ID", f => { Object.assign(f.state.contract.contract_info, { code_id: Number(deployment.codeId) }); }],
  ["code response ID", f => { f.state.code.code_info.code_id = "1"; }],
  ["checksum", f => { f.state.code.code_info.data_hash = "00".repeat(32); }],
  ["downloaded bytecode", f => { f.state.code.data = Buffer.alloc(20).toString("base64"); }],
  ["administrator", f => { f.state.contract.contract_info.admin = v.issuer; }],
  ["version", f => { f.state.protocol.version = "99"; }],
  ["protocol", f => { f.state.protocol.proof_protocol = "unknown"; }],
];
for (const [name, mutate] of changes) test(`rejects mismatched ${name} before authenticating a chip`, async () => {
  const f = fixture(); mutate(f); let contacted = false;
  await assert.rejects(f.client.authenticateChip(v.binding.tokenId, async () => { contacted = true; return Buffer.alloc(64); }));
  assert.equal(contacted, false);
});

test("reader authenticates a fresh chip proof and returns the current on-chain owner", async () => {
  const f = fixture();
  const token = await f.client.authenticateChip(v.binding.tokenId, async ({ message }) => { f.state.owner = v.issuer; return sign(message); });
  assert.equal(token.owner, v.issuer);
});

test("burn before or during chip authentication is rejected", async () => {
  const f = fixture(); f.state.issuance.burned = true;
  assert.equal((await f.client.getToken(v.binding.tokenId)).owner, null);
  await assert.rejects(f.client.authenticateChip(v.binding.tokenId, async () => { throw new Error("must not contact card"); }), /burned/);
  f.state.issuance.burned = false;
  await assert.rejects(f.client.authenticateChip(v.binding.tokenId, async ({ message }) => { f.state.issuance.burned = true; return sign(message); }), /changed/);
});

test("corrupt chain metadata and copied mint proof fail authentication", async () => {
  const f = fixture();
  await assert.rejects(f.client.authenticateChip(v.binding.tokenId, async () => bytes(v.signatureCompact)), /authentication failed/);
  f.state.issuance.extension.metadata_sha256 = "00".repeat(32);
  await assert.rejects(f.client.getToken(v.binding.tokenId), /binding mismatch/);
});

test("unconfigured deployments and unsafe endpoints fail closed", () => {
  for (const codeId of [null, 1, "0", "18446744073709551616", "01"]) assert.throws(() => validateDeployment({ ...deployment, codeId }));
  for (const rest of ["http://public.example", "file:///etc/passwd", "https://user:pass@example.com", "https://example.com?a=1", "https://example.com/#a"]) assert.throws(() => endpoint(rest));
  assert.equal(endpoint("http://127.0.0.1:1317/"), "http://127.0.0.1:1317");
});

test("REST failures and oversized bodies are bounded and rejected", async () => {
  const mock = (response: Response): typeof fetch => async () => response;
  await assert.rejects(fetchJson("https://example.com", mock(new Response("", { status: 403 }))), /403/);
  await assert.rejects(fetchJson("https://example.com", mock(new Response("{}", { headers: { "content-length": "1048577" } }))), /1 MiB/);
  await assert.rejects(fetchJson("https://example.com", mock(new Response("x".repeat(1048577)))), /1 MiB/);
  await assert.rejects(fetchJson("https://example.com", mock(Response.json([]))), /Invalid/);
});

test("code download accepts release-sized bytecode but still bounds its base64 response", async () => {
  const f = fixture(Buffer.alloc(900_000)); // >1 MiB once base64/JSON encoded.
  await f.client.checkDeployment();
  f.state.code.data = "A".repeat(4 * 1024 * 1024);
  await assert.rejects(f.client.checkDeployment(), /4 MiB/);
});
