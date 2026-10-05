import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout } from "node:timers/promises";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base32 } from "@scure/base";
import {
  address, bindingHash, ChipChallenge, compactSignature, compressedPublicKey, hashHex, metadata,
  mintMessage, mintNonce, proofMessage, rawCid, tokenId, tokenUri, validateBinding, verifyChipSignature, verifyMetadata,
} from "../sdk/core.js";
import { vector as v, bytes, hex, png, sign, testKey } from "./helpers.js";

test("shared Rust/TypeScript vector fixes exact domain, lengths, hashes and DER encoding", () => {
  assert.equal(hex(bindingHash(v.binding)), v.bindingSha256);
  assert.equal(hex(mintNonce(v.issuer, v.owner)), v.mintNonce);
  assert.equal(hex(proofMessage(bytes(v.bindingSha256), bytes(v.mintNonce))), v.messageHex);
  assert.equal(hashHex(bytes(v.messageHex)), v.messageSha256);
  assert.equal(hex(compactSignature(bytes(v.signatureDer))), v.signatureCompact);
  assert.ok(verifyChipSignature(bytes(v.publicKey), bytes(v.bindingSha256), bytes(v.mintNonce), bytes(v.signatureCompact)));
});

test("mint proof binds every deployment, token, metadata, issuer and owner field", () => {
  const input = { ...v.binding, issuer: v.issuer, owner: v.owner, publicKey: bytes(v.publicKey), signature: bytes(v.signatureCompact) };
  assert.equal(mintMessage(input).mint.token_id, v.binding.tokenId);
  for (const patch of [
    { chainId: "ipi-testnet-2" }, { collection: address(v.binding.collection).replace(/^ipi/, "cosmos") },
    { tokenId: "another" }, { tokenUri: "ipfs://different" }, { metadataSha256: "00".repeat(32) },
    { issuer: v.owner }, { owner: v.issuer }, { publicKey: secp256k1.getPublicKey(new Uint8Array(32).fill(8)) },
  ]) assert.throws(() => mintMessage({ ...input, ...patch }));
});

test("Java Card uncompressed keys and high-S DER signatures normalize to canonical chain values", () => {
  const low = secp256k1.Signature.fromBytes(bytes(v.signatureCompact));
  const high = new secp256k1.Signature(low.r, secp256k1.Point.Fn.ORDER - low.s);
  assert.equal(hex(compactSignature(high.toBytes("der"))), v.signatureCompact);
  assert.equal(hex(compressedPublicKey(secp256k1.getPublicKey(testKey, false))), v.publicKey);
  assert.equal(verifyChipSignature(bytes(v.publicKey), bytes(v.bindingSha256), bytes(v.mintNonce), high.toBytes("compact")), false);
});

test("signing the digest with a hashing API again fails verification", () => {
  const doubleHashed = sign(sha256(bytes(v.messageHex)));
  assert.equal(verifyChipSignature(bytes(v.publicKey), bytes(v.bindingSha256), bytes(v.mintNonce), doubleHashed), false);
});

test("fresh challenges differ, snapshot inputs and accept a signature only once", () => {
  const binding = { ...v.binding }; const publicKey = bytes(v.publicKey);
  const a = new ChipChallenge(binding, publicKey); const b = new ChipChallenge(binding, publicKey);
  assert.notDeepEqual(a.nonce, b.nonce);
  binding.tokenId = "tampered"; publicKey.fill(0);
  const nonce = a.nonce; nonce.fill(0);
  assert.notDeepEqual(a.nonce, nonce);
  const signature = sign(a.message);
  assert.equal(a.verify(signature), true);
  assert.equal(a.verify(signature), false);
  assert.equal(b.verify(signature), false);
  assert.equal(b.verify(sign(b.message)), false); // Failed attempts also consume the challenge.
});

test("expired challenges fail", async () => {
  const challenge = new ChipChallenge(v.binding, bytes(v.publicKey), 1);
  const signature = sign(challenge.message);
  await setTimeout(5);
  assert.equal(challenge.verify(signature), false);
  for (const ttl of [0, -1, 60_001, Infinity, 1.5]) assert.throws(() => new ChipChallenge(v.binding, bytes(v.publicKey), ttl));
});

test("copied public keys and altered proofs cannot authenticate", () => {
  const binding = bytes(v.bindingSha256), nonce = bytes(v.mintNonce), signature = bytes(v.signatureCompact);
  for (const invalid of [Buffer.alloc(64), signature.subarray(1), bytes(v.publicKey)]) assert.equal(verifyChipSignature(bytes(v.publicKey), binding, nonce, invalid), false);
  nonce[0] = nonce[0]! ^ 1;
  assert.equal(verifyChipSignature(bytes(v.publicKey), binding, nonce, signature), false);
  assert.throws(() => compressedPublicKey(Buffer.alloc(33)));
  assert.throws(() => compactSignature(Buffer.from([0x30, 0])));
});

test("IDs remain strings; IPI address checksums, UTF-8 bounds and URI restrictions are enforced", () => {
  assert.equal(tokenId("9007199254740993"), "9007199254740993");
  for (const id of [1, "", "a b", "x".repeat(129), "żółw", "x/1"]) assert.throws(() => tokenId(id));
  for (const addr of [v.owner.toUpperCase(), v.owner.slice(0, -1) + "x", "stars1bad"]) assert.throws(() => address(addr));
  assert.throws(() => address(v.owner, "collection", true));
  for (const uri of ["javascript:alert(1)", "http://example.org", "ipfs://", "https://", "https://example/a b", "ipfs://żółw"]) assert.throws(() => tokenUri(uri));
  assert.throws(() => validateBinding({ ...v.binding, chainId: "💎".repeat(40) }));
  assert.throws(() => proofMessage(Buffer.alloc(31), Buffer.alloc(32)));
});

test("metadata uses exact bytes and raw CIDv1 hashes; modifications fail", () => {
  const m = metadata({ name: "IPI Object", description: "First\nobject", image: png, attributes: [{ trait_type: "Edition", value: "1" }] });
  assert.deepEqual(verifyMetadata(m.bytes, m.metadataSha256), m.value);
  assert.equal(m.value.image, `ipfs://${rawCid(png)}`);
  const encoded = rawCid(png).slice(1).toUpperCase();
  const decoded = base32.decode(encoded.padEnd(Math.ceil(encoded.length / 8) * 8, "="));
  assert.deepEqual([...decoded.slice(0, 4)], [1, 0x55, 0x12, 0x20]);
  assert.equal(hex(decoded.slice(4)), hashHex(png));
  assert.throws(() => verifyMetadata(Buffer.concat([m.bytes, Buffer.from(" ")]), m.metadataSha256), /hash mismatch/);
  assert.throws(() => metadata({ name: "bad", description: "", image: Buffer.from("<svg onload=alert(1)></svg>") }));
  assert.throws(() => metadata({ name: "big", description: "", image: Buffer.alloc(1024 * 1024 + 1) }));
  assert.throws(() => verifyMetadata(Buffer.alloc(64 * 1024 + 1), "00".repeat(32)), /64 KiB/);
  const invalid = Buffer.from([0xff]);
  assert.throws(() => verifyMetadata(invalid, hashHex(invalid)));
});
