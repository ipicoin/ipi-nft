import { randomBytes } from "node:crypto";
import { secp256k1 } from "@noble/curves/secp256k1.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { base32, bech32 } from "@scure/base";

export const PROTOCOL = "ipi-nft-chip-v1";
export const CONTRACT_NAME = "crates.io:ipi-nft";
export const CONTRACT_VERSION = "0.1.0";
const utf8 = (value: string) => Buffer.from(value, "utf8");
export const hashHex = (bytes: Uint8Array): string => Buffer.from(sha256(bytes)).toString("hex");

export function record(value: unknown, label = "object"): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) throw new Error(`Invalid ${label}`);
  return value as Record<string, unknown>;
}
export function text(value: unknown, label: string, max: number): string {
  if (typeof value !== "string" || !value.trim() || Buffer.byteLength(value) > max || /\p{Cc}/u.test(value)) throw new Error(`Invalid ${label}`);
  return value;
}
export function hexBytes(value: unknown, size: number, label = "hex value"): Uint8Array {
  if (typeof value !== "string" || value.length !== size * 2 || !/^[0-9a-f]+$/i.test(value)) throw new Error(`Invalid ${label}`);
  return Buffer.from(value, "hex");
}
export function base64Bytes(value: unknown, size: number, label: string): Uint8Array {
  if (typeof value !== "string" || value.length > size * 2) throw new Error(`Invalid ${label}`);
  const bytes = Buffer.from(value, "base64");
  if (bytes.length !== size || bytes.toString("base64") !== value) throw new Error(`Invalid ${label}`);
  return bytes;
}
export function address(value: unknown, label = "IPI address", contract = false): string {
  if (typeof value !== "string" || value !== value.toLowerCase()) throw new Error(`Invalid ${label}`);
  try {
    const decoded = bech32.decode(value as `${string}1${string}`, 90);
    const length = bech32.fromWords(decoded.words).length;
    if (decoded.prefix !== "ipi" || (contract ? length !== 32 : length !== 20 && length !== 32)) throw new Error("invalid");
    return value;
  } catch { throw new Error(`Invalid ${label}`); }
}
export function tokenId(value: unknown): string {
  if (typeof value !== "string" || !/^[A-Za-z0-9._:-]{1,128}$/.test(value)) throw new Error("Invalid token ID");
  return value;
}
export function tokenUri(value: unknown): string {
  const uri = text(value, "token URI", 512);
  if (/[^\x21-\x7e]/.test(uri) || !(uri.startsWith("ipfs://") && uri.length > 7 || uri.startsWith("https://") && uri.length > 8)) throw new Error("Invalid token URI");
  return uri;
}
function field(value: string): Buffer {
  const bytes = utf8(value);
  if (bytes.length > 512) throw new Error("Protocol field exceeds 512 bytes");
  const length = Buffer.alloc(2);
  length.writeUInt16BE(bytes.length);
  return Buffer.concat([length, bytes]);
}
export type Binding = { chainId: string; collection: string; tokenId: string; tokenUri: string; metadataSha256: string };
export function validateBinding(input: Binding): Binding {
  return {
    chainId: text(input.chainId, "chain ID", 128), collection: address(input.collection, "collection", true),
    tokenId: tokenId(input.tokenId), tokenUri: tokenUri(input.tokenUri),
    metadataSha256: Buffer.from(hexBytes(input.metadataSha256, 32, "metadata SHA-256")).toString("hex"),
  };
}
export function bindingHash(input: Binding): Uint8Array {
  const b = validateBinding(input);
  return sha256(Buffer.concat([utf8("IPI_NFT_BINDING_V1\0"), ...[b.chainId, b.collection, b.tokenId, b.tokenUri].map(field), hexBytes(b.metadataSha256, 32)]));
}
export function mintNonce(issuer: string, owner: string): Uint8Array {
  return sha256(Buffer.concat([utf8("IPI_NFT_MINT_V1\0"), field(address(issuer, "issuer")), field(address(owner, "owner"))]));
}
/** Feed this complete message to Java Card ALG_ECDSA_SHA_256 (one SHA-256). */
export function proofMessage(binding: Uint8Array, nonce: Uint8Array): Uint8Array {
  if (binding.length !== 32 || nonce.length !== 32) throw new Error("Binding and nonce must be 32 bytes");
  return Buffer.concat([utf8("IPI_NFT_PROOF_V1\0"), binding, nonce]);
}
export function compressedPublicKey(bytes: Uint8Array): Uint8Array {
  if (![33, 65].includes(bytes.length)) throw new Error("Invalid secp256k1 public key length");
  return secp256k1.Point.fromBytes(bytes).toBytes(true);
}
/** Convert the card's ASN.1 DER signature to the chain's compact low-S format. */
export function compactSignature(bytes: Uint8Array, format: "der" | "compact" = "der"): Uint8Array {
  const signature = secp256k1.Signature.fromBytes(bytes, format);
  const normalized = signature.hasHighS() ? new secp256k1.Signature(signature.r, secp256k1.Point.Fn.ORDER - signature.s) : signature;
  return normalized.toBytes("compact");
}
export function verifyChipSignature(publicKey: Uint8Array, binding: Uint8Array, nonce: Uint8Array, signature: Uint8Array): boolean {
  try {
    return secp256k1.verify(signature, sha256(proofMessage(binding, nonce)), compressedPublicKey(publicKey), { prehash: false, lowS: true, format: "compact" });
  } catch { return false; }
}
/** Reader-generated, expiring, one-attempt challenge. Never trust a chip-selected nonce. */
export class ChipChallenge {
  readonly #nonce = randomBytes(32);
  readonly #binding: Uint8Array;
  readonly #publicKey: Uint8Array;
  readonly #deadline: number;
  #used = false;
  constructor(binding: Binding, publicKey: Uint8Array, ttlMs = 30_000) {
    if (!Number.isInteger(ttlMs) || ttlMs < 1 || ttlMs > 60_000) throw new Error("Invalid challenge lifetime");
    this.#binding = bindingHash(binding);
    this.#publicKey = compressedPublicKey(publicKey);
    this.#deadline = performance.now() + ttlMs;
  }
  get nonce(): Uint8Array { return Uint8Array.from(this.#nonce); }
  get message(): Uint8Array { return proofMessage(this.#binding, this.#nonce); }
  verify(signature: Uint8Array): boolean {
    if (this.#used) return false;
    this.#used = true;
    return performance.now() <= this.#deadline && verifyChipSignature(this.#publicKey, this.#binding, this.#nonce, signature);
  }
}
export type MintInput = Binding & { issuer: string; owner: string; publicKey: Uint8Array; signature: Uint8Array };
export function mintMessage(input: MintInput) {
  const b = validateBinding(input);
  const publicKey = compressedPublicKey(input.publicKey);
  const signature = compactSignature(input.signature, "compact");
  const owner = address(input.owner, "owner");
  if (!verifyChipSignature(publicKey, bindingHash(b), mintNonce(input.issuer, owner), signature)) throw new Error("Chip proof does not match this mint");
  return { mint: {
    token_id: b.tokenId, owner, token_uri: b.tokenUri, metadata_sha256: b.metadataSha256,
    chip_public_key: Buffer.from(publicKey).toString("base64"), chip_proof: Buffer.from(signature).toString("base64"),
  } };
}
/** CIDv1, raw codec, SHA2-256. A single raw block; no UnixFS wrapping. */
export function rawCid(bytes: Uint8Array): string {
  return `b${base32.encode(Buffer.concat([Buffer.from([1, 0x55, 0x12, 0x20]), sha256(bytes)])).toLowerCase().replace(/=+$/, "")}`;
}
export type Attribute = { trait_type: string; value: string };
export function metadata(input: { name: string; description: string; image: Uint8Array; attributes?: Attribute[] }) {
  text(input.name, "name", 128);
  if (typeof input.description !== "string" || Buffer.byteLength(input.description) > 4096 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(input.description)) throw new Error("Invalid description");
  if (input.image.length < 12 || input.image.length > 1024 * 1024) throw new Error("Image must be between 12 bytes and 1 MiB");
  const image = Buffer.from(input.image);
  const mime = image.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) ? "image/png"
    : image.subarray(0, 3).equals(Buffer.from("ffd8ff", "hex")) ? "image/jpeg"
    : image.subarray(0, 4).toString() === "RIFF" && image.subarray(8, 12).toString() === "WEBP" ? "image/webp" : null;
  if (!mime) throw new Error("Only PNG, JPEG and WebP images are supported");
  const attributes = input.attributes ?? [];
  if (!Array.isArray(attributes) || attributes.length > 32) throw new Error("At most 32 attributes are supported");
  const value = {
    schema: "ipi-nft-metadata-v1", name: input.name, description: input.description,
    image: `ipfs://${rawCid(image)}`, image_sha256: hashHex(image), image_mime_type: mime,
    attributes: attributes.map((a) => ({ trait_type: text(a.trait_type, "trait type", 64), value: text(a.value, "trait value", 256) })),
  };
  const bytes = utf8(`${JSON.stringify(value)}\n`);
  return { value, bytes, metadataSha256: hashHex(bytes), tokenUri: `ipfs://${rawCid(bytes)}` };
}
export function verifyMetadata(bytes: Uint8Array, expectedHash: string): unknown {
  if (bytes.length > 64 * 1024) throw new Error("Metadata exceeds 64 KiB");
  const expected = Buffer.from(hexBytes(expectedHash, 32, "metadata hash")).toString("hex");
  if (hashHex(bytes) !== expected) throw new Error("Metadata hash mismatch");
  return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
}
