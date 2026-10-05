use crate::error::ContractError;
use sha2::{Digest, Sha256};

pub const PROTOCOL: &str = "ipi-nft-chip-v1";
pub const BINDING_DOMAIN: &[u8] = b"IPI_NFT_BINDING_V1\0";
pub const PROOF_DOMAIN: &[u8] = b"IPI_NFT_PROOF_V1\0";
pub const MINT_DOMAIN: &[u8] = b"IPI_NFT_MINT_V1\0";

pub fn canonical_signature(signature: &[u8]) -> bool {
    const HALF_ORDER: [u8; 32] = [
        0x7f, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff,
        0xff, 0x5d, 0x57, 0x6e, 0x73, 0x57, 0xa4, 0x50, 0x1d, 0xdf, 0xe9, 0x2f, 0x46, 0x68, 0x1b,
        0x20, 0xa0,
    ];
    signature.len() == 64
        && signature[32..] <= HALF_ORDER[..]
        && signature[..32].iter().any(|b| *b != 0)
        && signature[32..].iter().any(|b| *b != 0)
}

fn field(hash: &mut Sha256, value: &str) {
    // All caller inputs are bounded to <= 512 UTF-8 bytes.
    hash.update((value.len() as u16).to_be_bytes());
    hash.update(value.as_bytes());
}

pub fn binding_hash(
    chain: &str,
    contract: &str,
    token: &str,
    uri: &str,
    metadata: &[u8],
) -> [u8; 32] {
    let mut hash = Sha256::new();
    hash.update(BINDING_DOMAIN);
    for value in [chain, contract, token, uri] {
        field(&mut hash, value);
    }
    hash.update(metadata);
    hash.finalize().into()
}

pub fn mint_nonce(issuer: &str, owner: &str) -> [u8; 32] {
    let mut hash = Sha256::new();
    hash.update(MINT_DOMAIN);
    field(&mut hash, issuer);
    field(&mut hash, owner);
    hash.finalize().into()
}

pub fn proof_hash(binding: &[u8], nonce: &[u8]) -> [u8; 32] {
    let mut hash = Sha256::new();
    hash.update(PROOF_DOMAIN);
    hash.update(binding);
    hash.update(nonce);
    hash.finalize().into()
}

pub fn validate_token(value: &str) -> Result<(), ContractError> {
    if value.is_empty()
        || value.len() > 128
        || !value
            .bytes()
            .all(|b| b.is_ascii_alphanumeric() || b"._:-".contains(&b))
    {
        return Err(ContractError::Invalid("token ID"));
    }
    Ok(())
}

pub fn validate_uri(value: &str) -> Result<(), ContractError> {
    // The digest is authoritative; support IPFS paths and HTTPS resources.
    // Readers verify bytes before parsing and never execute metadata content.
    if value.len() > 512
        || value.bytes().any(|b| b <= 32 || b >= 127)
        || !(value.starts_with("ipfs://") && value.len() > 7
            || value.starts_with("https://") && value.len() > 8)
    {
        return Err(ContractError::Invalid("token URI"));
    }
    Ok(())
}

pub fn validate_key(key: &[u8]) -> Result<(), ContractError> {
    if key.len() != 33 || !matches!(key[0], 2 | 3) {
        return Err(ContractError::Invalid("compressed secp256k1 key"));
    }
    // Curve membership is checked by secp256k1_verify at mint.
    Ok(())
}
