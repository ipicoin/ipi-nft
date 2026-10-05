import { readFileSync } from "node:fs";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import type { Binding } from "../sdk/core.js";
export const vector = JSON.parse(readFileSync("protocol/vectors.json", "utf8")) as {
  binding: Binding; issuer: string; owner: string; publicKey: string; bindingSha256: string;
  mintNonce: string; messageHex: string; messageSha256: string; signatureCompact: string; signatureDer: string;
};
export const bytes = (s: string) => Buffer.from(s, "hex");
export const hex = (b: Uint8Array) => Buffer.from(b).toString("hex");
// Public, deliberately insecure fixture. Production SDK has no signing/key-generation API.
export const testKey = new Uint8Array(32).fill(7);
export const sign = (message: Uint8Array) => secp256k1.sign(message, testKey);
export const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aLmQAAAAASUVORK5CYII=", "base64");
