import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, renameSync } from "node:fs";
import { relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";
const root = resolve(import.meta.dirname, "..");
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");
const inputs = ["Cargo.toml", "Cargo.lock", ".cargo/config.toml", "toolchain.lock.json",
  "scripts/build-contract.sh", "scripts/test-wasm.sh", "scripts/release-manifest.mjs",
  "tools/wasm-tests/Cargo.toml", "tools/wasm-tests/Cargo.lock", "tools/wasm-tests/tests/wasm.rs", "protocol/vectors.json"];
function walk(path) {
  for (const item of readdirSync(resolve(root, path), { withFileTypes: true })) {
    const name = `${path}/${item.name}`;
    if (item.isDirectory()) walk(name); else if (item.isFile()) inputs.push(name); else throw new Error("Unexpected source symlink");
  }
}
walk("contracts");
const sourceFiles = Object.fromEntries(inputs.sort().map((name) => [name, hash(readFileSync(resolve(root, name)))]));
const sourceDigest = hash(Buffer.from(JSON.stringify(sourceFiles)));
if (process.argv[2] === "--source-digest") { console.log(sourceDigest); process.exit(0); }
if (process.argv[2] !== "--expect-source-digest" || process.argv[3] !== sourceDigest) throw new Error("Build inputs changed or no build snapshot supplied; run build:contract again");
const wasm = readFileSync(resolve(root, "artifacts/ipi_nft.wasm"));
if (!wasm.subarray(0, 8).equals(Buffer.from("0061736d01000000", "hex"))) throw new Error("Invalid Wasm artifact");
const manifest = {
  schemaVersion: 1, contract: "crates.io:ipi-nft", version: "0.1.0",
  optimizer: "cosmwasm/optimizer@sha256:7e0b9229c1a4118d0c9a2af2e7f5d95a91f264c26a2ce5681c779926e74d7f85",
  platform: "linux/amd64", artifact: "ipi_nft.wasm", wasmSha256: hash(wasm), bytes: wasm.length,
  gitRevision: execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim(),
  dirty: execFileSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).trim().length > 0,
  sourceDigest, sourceFiles,
};
writeFileSync(resolve(root, "artifacts/release.json.tmp"), `${JSON.stringify(manifest, null, 2)}\n`);
renameSync(resolve(root, "artifacts/release.json.tmp"), resolve(root, "artifacts/release.json"));
console.log(`${relative(root, resolve(root, "artifacts/ipi_nft.wasm"))}: ${manifest.wasmSha256}`);
