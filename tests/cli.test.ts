import assert from "node:assert/strict";
import { test } from "node:test";
import { execFile, execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createServer } from "node:http";
import { promisify } from "node:util";
import { bytes, png, vector as v } from "./helpers.js";
const cli = resolve("dist/sdk/cli.js");
const run = (...args: string[]) => execFileSync(process.execPath, [cli, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });

test("transaction verification requires the correct chain/hash, committed height and successful execution", async () => {
  const hash = "AA".repeat(32);
  let network = v.binding.chainId;
  let response: Record<string, unknown> = { txhash: hash, height: "9007199254740993", code: 0, events: [] };
  const server = createServer((req, res) => {
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify(req.url?.endsWith("/node_info") ? { default_node_info: { network } } : { tx_response: response }));
  });
  await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
  const location = server.address();
  assert.ok(location && typeof location !== "string");
  const args = [cli, "transaction", "--rest", `http://127.0.0.1:${location.port}`, "--chain-id", v.binding.chainId, "--tx-hash", hash];
  try {
    const result = await promisify(execFile)(process.execPath, args);
    assert.equal(JSON.parse(result.stdout).height, "9007199254740993");
    const good = { ...response };
    for (const patch of [{ code: 5 }, { height: "0" }, { height: 42 }, { txhash: "BB".repeat(32) }]) {
      response = { ...good, ...patch };
      await assert.rejects(promisify(execFile)(process.execPath, args));
    }
    response = good; network = "wrong-chain";
    await assert.rejects(promisify(execFile)(process.execPath, args), /chain ID mismatch/);
  } finally { await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

test("CLI creates metadata, verifies bytes, constructs proof-bound mint JSON and never overwrites files", () => {
  const dir = mkdtempSync(join(tmpdir(), "ipi-nft-test-"));
  try {
    const image = join(dir, "image.png"), out = join(dir, "metadata"); writeFileSync(image, png);
    const summary = JSON.parse(run("metadata", "--image", image, "--name", "My item", "--out", out));
    assert.equal(summary.published, false);
    const checked = JSON.parse(run("verify-metadata", "--metadata", join(out, "metadata.json"), "--sha256", summary.metadataSha256));
    assert.equal(checked.verified, true);
    assert.throws(() => run("metadata", "--image", image, "--name", "My item", "--out", out));
    const binding = join(dir, "binding.json"), request = join(dir, "request.json"), mint = join(dir, "mint.json");
    writeFileSync(binding, JSON.stringify(v.binding));
    run("mint-request", "--binding", binding, "--issuer", v.issuer, "--owner", v.owner, "--out", request);
    const r = JSON.parse(readFileSync(request, "utf8")); assert.equal(r.messageHex, v.messageHex);
    run("mint-message", "--request", request, "--public-key", v.publicKey, "--signature", v.signatureDer, "--out", mint);
    assert.equal(JSON.parse(readFileSync(mint, "utf8")).mint.chip_proof, bytes(v.signatureCompact).toString("base64"));
    assert.throws(() => run("mint-message", "--request", request, "--public-key", v.publicKey, "--signature", v.signatureDer, "--out", mint));
    r.owner = v.issuer; writeFileSync(request, JSON.stringify(r));
    assert.throws(() => run("mint-message", "--request", request, "--public-key", v.publicKey, "--signature", v.signatureDer, "--out", join(dir, "bad.json")), /request was altered/);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("CLI retains large IDs and refuses unknown options or pretend broadcasting", () => {
  assert.equal(JSON.parse(run("transfer-message", "--token-id", "9007199254740993", "--recipient", v.owner)).transfer_nft.token_id, "9007199254740993");
  assert.equal(JSON.parse(run("collection-message", "--name", "IPI", "--symbol", "IPI", "--issuer", v.issuer)).expected_chain_id, "ipi-testnet-1");
  for (const args of [["deploy"], ["burn-message", "--token-id", "1", "--broadcast", "true"], ["mint-message", "--private-key", "bad"]]) assert.notEqual(spawnSync(process.execPath, [cli, ...args]).status, 0);
});
