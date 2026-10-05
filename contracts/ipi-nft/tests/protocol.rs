use cosmwasm_std::{testing::MockApi, Api, HexBinary};
use ipi_nft::proof::{binding_hash, canonical_signature, mint_nonce, proof_hash};
use serde_json::Value;

#[test]
fn shared_sdk_vector_matches_rust_and_host_crypto() {
    let v: Value = serde_json::from_str(include_str!("../../../protocol/vectors.json")).unwrap();
    let b = &v["binding"];
    let s = |value: &Value| value.as_str().unwrap().to_owned();
    let bytes = |value: &Value| HexBinary::from_hex(&s(value)).unwrap();
    let binding = binding_hash(
        &s(&b["chainId"]),
        &s(&b["collection"]),
        &s(&b["tokenId"]),
        &s(&b["tokenUri"]),
        &bytes(&b["metadataSha256"]),
    );
    assert_eq!(HexBinary::from(binding), bytes(&v["bindingSha256"]));
    let nonce = mint_nonce(&s(&v["issuer"]), &s(&v["owner"]));
    assert_eq!(HexBinary::from(nonce), bytes(&v["mintNonce"]));
    let digest = proof_hash(&binding, &nonce);
    assert_eq!(HexBinary::from(digest), bytes(&v["messageSha256"]));
    let signature = bytes(&v["signatureCompact"]);
    assert!(canonical_signature(&signature));
    assert!(MockApi::default()
        .secp256k1_verify(&digest, &signature, &bytes(&v["publicKey"]))
        .unwrap());
    let mut high_s = signature.to_vec();
    high_s[32..].fill(0xff);
    assert!(!canonical_signature(&high_s));
    for invalid in [vec![], vec![0; 64], vec![1; 63], vec![1; 65]] {
        assert!(!canonical_signature(&invalid));
    }
}
