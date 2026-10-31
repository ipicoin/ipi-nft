use crate::error::ContractError;
use sha2::{Digest, Sha256};

pub const PROTOCOL: &str = "ipi-nft-chip-v2";
pub const BINDING_DOMAIN: &[u8] = b"IPI_NFT_BINDING_V2\0";
pub const PROOF_DOMAIN: &[u8] = b"IPI_NFT_PROOF_V2\0";
pub const MINT_DOMAIN: &[u8] = b"IPI_NFT_MINT_V2\0";

pub fn canonical_signature(signature: &[u8]) -> bool {
    const HALF_ORDER: [u8; 32] = [
        127, 255, 255, 255, 128, 0, 0, 0, 127, 255, 255, 255, 255, 255, 255, 255, 222, 115, 125,
        86, 211, 139, 207, 66, 121, 220, 229, 97, 126, 49, 146, 168,
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
        return Err(ContractError::Invalid("compressed secp256r1 key"));
    }
    // Curve membership is checked by secp256r1_verify at mint.
    Ok(())
}

/// Separate from reader/mint proofs. Payload is hashed even when empty.
pub fn action_hash(
    binding: &[u8],
    action: &str,
    owner: &str,
    target: &str,
    payload: &[u8],
    sequence: u64,
    expires_height: u64,
) -> [u8; 32] {
    let mut hash = Sha256::new();
    hash.update(b"IPI_NFT_ACTION_V2\0");
    hash.update(binding);
    for value in [action, owner, target] {
        field(&mut hash, value);
    }
    hash.update(Sha256::digest(payload));
    hash.update(sequence.to_be_bytes());
    hash.update(expires_height.to_be_bytes());
    hash.finalize().into()
}
