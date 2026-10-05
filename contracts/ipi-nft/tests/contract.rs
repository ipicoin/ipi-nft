use cosmwasm_std::{testing::MockApi, to_json_binary, Addr, Binary, Empty};
use cw_multi_test::{App, AppBuilder, ContractWrapper, Executor};
use ipi_nft::{
    contract::{execute, instantiate, query},
    msg::{ExecuteMsg, InstantiateMsg},
    proof::{binding_hash, mint_nonce, proof_hash},
    state::Issuance,
};
use k256::ecdsa::{signature::hazmat::PrehashSigner, Signature, SigningKey};
use serde_json::{json, Value};

struct Fixture {
    app: App,
    collection: Addr,
    issuer: Addr,
    owner: Addr,
    other: Addr,
}
impl Fixture {
    fn new() -> Self {
        let mut app = AppBuilder::new()
            .with_api(MockApi::default().with_prefix("ipi"))
            .build(|_, _, _| {});
        app.update_block(|b| b.chain_id = "ipi-testnet-1".into());
        let issuer = app.api().addr_make("issuer");
        let owner = app.api().addr_make("owner");
        let other = app.api().addr_make("other");
        let code = app.store_code(Box::new(ContractWrapper::new(execute, instantiate, query)));
        let collection = app
            .instantiate_contract(
                code,
                issuer.clone(),
                &InstantiateMsg {
                    name: "IPI Objects".into(),
                    symbol: "ITEM".into(),
                    minter: issuer.to_string(),
                    expected_chain_id: "ipi-testnet-1".into(),
                },
                &[],
                "IPI",
                None,
            )
            .unwrap();
        Self {
            app,
            collection,
            issuer,
            owner,
            other,
        }
    }
    fn mint_msg(&self, id: &str, seed: u8) -> ExecuteMsg {
        let key = SigningKey::from_slice(&[seed; 32]).unwrap();
        let hash = binding_hash(
            "ipi-testnet-1",
            self.collection.as_str(),
            id,
            "ipfs://example",
            &[3; 32],
        );
        let signature: Signature = key
            .sign_prehash(&proof_hash(
                &hash,
                &mint_nonce(self.issuer.as_str(), self.owner.as_str()),
            ))
            .unwrap();
        ExecuteMsg::Mint {
            token_id: id.into(),
            owner: self.owner.to_string(),
            token_uri: "ipfs://example".into(),
            metadata_sha256: vec![3; 32].into(),
            chip_public_key: key.verifying_key().to_encoded_point(true).as_bytes().into(),
            chip_proof: signature.to_bytes().to_vec().into(),
        }
    }
    fn mint(&mut self, id: &str, seed: u8) {
        self.app
            .execute_contract(
                self.issuer.clone(),
                self.collection.clone(),
                &self.mint_msg(id, seed),
                &[],
            )
            .unwrap();
    }
    fn query(&self, msg: Value) -> Value {
        self.app
            .wrap()
            .query_wasm_smart(&self.collection, &msg)
            .unwrap()
    }
    fn owner(&self, id: &str) -> String {
        self.query(json!({"owner_of":{"token_id":id}}))["owner"]
            .as_str()
            .unwrap()
            .into()
    }
}

#[test]
fn mint_exposes_standard_cw721_metadata_and_enumeration() {
    let mut f = Fixture::new();
    f.mint("item-9007199254740993", 7);
    assert_eq!(f.owner("item-9007199254740993"), f.owner.as_str());
    let info = f.query(json!({"nft_info":{"token_id":"item-9007199254740993"}}));
    assert_eq!(info["extension"]["protocol"], "ipi-nft-chip-v1");
    assert_eq!(info["token_uri"], "ipfs://example");
    assert_eq!(f.query(json!({"num_tokens":{}}))["count"], 1);
    assert_eq!(
        f.query(json!({"tokens":{"owner":f.owner}}))["tokens"][0],
        "item-9007199254740993"
    );
    assert_eq!(f.query(json!({"contract_info":{}}))["name"], "IPI Objects");
    assert_eq!(
        f.query(json!({"all_nft_info":{"token_id":"item-9007199254740993"}}))["access"]["owner"],
        f.owner.as_str()
    );
}
#[test]
fn mint_rejects_unauthorized_sender_and_every_changed_commitment() {
    let mut f = Fixture::new();
    let good = f.mint_msg("item-1", 7);
    assert!(f
        .app
        .execute_contract(f.other.clone(), f.collection.clone(), &good, &[])
        .is_err());
    for field in [
        "token_id",
        "owner",
        "token_uri",
        "metadata_sha256",
        "chip_public_key",
        "chip_proof",
    ] {
        let mut bad: Value = serde_json::from_slice(&to_json_binary(&good).unwrap()).unwrap();
        bad["mint"][field] = match field {
            "token_id" => json!("item-2"),
            "owner" => json!(f.other),
            "token_uri" => json!("ipfs://changed"),
            "metadata_sha256" => json!("04".repeat(32)),
            "chip_public_key" => json!(Binary::from(
                SigningKey::from_slice(&[8; 32])
                    .unwrap()
                    .verifying_key()
                    .to_encoded_point(true)
                    .as_bytes()
            )),
            _ => json!(Binary::from(vec![0; 64])),
        };
        assert!(
            f.app
                .execute_contract(f.issuer.clone(), f.collection.clone(), &bad, &[])
                .is_err(),
            "accepted {field}"
        );
        assert_eq!(f.query(json!({"num_tokens":{}}))["count"], 0);
    }
    f.app
        .execute_contract(f.issuer.clone(), f.collection.clone(), &good, &[])
        .unwrap();
}
#[test]
fn proof_cannot_move_to_another_chain_or_contract() {
    let mut f = Fixture::new();
    let msg = f.mint_msg("item-1", 7);
    let code = f
        .app
        .store_code(Box::new(ContractWrapper::new(execute, instantiate, query)));
    let second = f
        .app
        .instantiate_contract(
            code,
            f.issuer.clone(),
            &InstantiateMsg {
                name: "Second".into(),
                symbol: "S".into(),
                minter: f.issuer.to_string(),
                expected_chain_id: "ipi-testnet-1".into(),
            },
            &[],
            "second",
            None,
        )
        .unwrap();
    assert!(f
        .app
        .execute_contract(f.issuer.clone(), second, &msg, &[])
        .is_err());
    f.app.update_block(|b| b.chain_id = "another-chain".into());
    assert!(f
        .app
        .execute_contract(f.issuer.clone(), f.collection.clone(), &msg, &[])
        .is_err());
}
#[test]
fn token_and_chip_identities_survive_burn_and_cannot_be_reissued() {
    let mut f = Fixture::new();
    f.mint("item-1", 7);
    assert!(f
        .app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &f.mint_msg("item-1", 8),
            &[]
        )
        .is_err());
    assert!(f
        .app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &f.mint_msg("item-2", 7),
            &[]
        )
        .is_err());
    assert!(f
        .app
        .execute_contract(
            f.other.clone(),
            f.collection.clone(),
            &ExecuteMsg::Burn {
                token_id: "item-1".into()
            },
            &[]
        )
        .is_err());
    f.app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::Burn {
                token_id: "item-1".into(),
            },
            &[],
        )
        .unwrap();
    assert_eq!(
        f.query(json!({"issuance":{"token_id":"item-1"}}))["burned"],
        true
    );
    let key = SigningKey::from_slice(&[7; 32])
        .unwrap()
        .verifying_key()
        .to_encoded_point(true);
    assert_eq!(
        f.query(json!({"token_by_chip":{"chip_public_key":Binary::from(key.as_bytes())}}))
            ["burned"],
        true
    );
    assert_eq!(f.query(json!({"num_tokens":{}}))["count"], 0);
    assert!(f
        .app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &f.mint_msg("item-1", 8),
            &[]
        )
        .is_err());
    assert!(f
        .app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &f.mint_msg("item-2", 7),
            &[]
        )
        .is_err());
}
#[test]
fn approvals_transfer_and_revocation_follow_cw721() {
    let mut f = Fixture::new();
    f.mint("item-1", 7);
    let transfer = ExecuteMsg::TransferNft {
        token_id: "item-1".into(),
        recipient: f.other.to_string(),
    };
    assert!(f
        .app
        .execute_contract(f.other.clone(), f.collection.clone(), &transfer, &[])
        .is_err());
    let approve = ExecuteMsg::Approve {
        spender: f.other.to_string(),
        token_id: "item-1".into(),
        expires: None,
    };
    f.app
        .execute_contract(f.owner.clone(), f.collection.clone(), &approve, &[])
        .unwrap();
    f.app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::Revoke {
                spender: f.other.to_string(),
                token_id: "item-1".into(),
            },
            &[],
        )
        .unwrap();
    assert!(f
        .app
        .execute_contract(f.other.clone(), f.collection.clone(), &transfer, &[])
        .is_err());
    f.app
        .execute_contract(f.owner.clone(), f.collection.clone(), &approve, &[])
        .unwrap();
    let before = f.query(json!({"nft_info":{"token_id":"item-1"}}));
    f.app
        .execute_contract(f.other.clone(), f.collection.clone(), &transfer, &[])
        .unwrap();
    assert_eq!(f.owner("item-1"), f.other.as_str());
    assert_eq!(
        f.query(json!({"owner_of":{"token_id":"item-1"}}))["approvals"],
        json!([])
    );
    assert_eq!(f.query(json!({"nft_info":{"token_id":"item-1"}})), before);
}
#[test]
fn expired_approvals_and_revoked_operators_cannot_transfer() {
    let mut f = Fixture::new();
    f.mint("item-1", 7);
    let height = f.app.block_info().height + 1;
    f.app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::Approve {
                spender: f.other.to_string(),
                token_id: "item-1".into(),
                expires: Some(cw_utils::Expiration::AtHeight(height)),
            },
            &[],
        )
        .unwrap();
    f.app.update_block(|b| b.height = height);
    let transfer = ExecuteMsg::TransferNft {
        token_id: "item-1".into(),
        recipient: f.other.to_string(),
    };
    assert!(f
        .app
        .execute_contract(f.other.clone(), f.collection.clone(), &transfer, &[])
        .is_err());
    f.app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::ApproveAll {
                operator: f.other.to_string(),
                expires: None,
            },
            &[],
        )
        .unwrap();
    f.app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::RevokeAll {
                operator: f.other.to_string(),
            },
            &[],
        )
        .unwrap();
    assert!(f
        .app
        .execute_contract(f.other.clone(), f.collection.clone(), &transfer, &[])
        .is_err());
}
#[test]
fn chip_verification_rejects_changed_nonce_and_burned_tokens() {
    let mut f = Fixture::new();
    f.mint("item-1", 7);
    let issuance: Issuance =
        serde_json::from_value(f.query(json!({"issuance":{"token_id":"item-1"}}))).unwrap();
    let key = SigningKey::from_slice(&[7; 32]).unwrap();
    let sig: Signature = key
        .sign_prehash(&proof_hash(
            issuance.extension.binding_sha256.as_slice(),
            &[9; 32],
        ))
        .unwrap();
    let request = json!({"verify_chip":{"token_id":"item-1","nonce":"09".repeat(32),"signature":Binary::from(sig.to_bytes().to_vec())}});
    assert_eq!(f.query(request.clone())["valid"], true);
    let mut bad = request.clone();
    bad["verify_chip"]["nonce"] = json!("08".repeat(32));
    assert_eq!(f.query(bad)["valid"], false);
    f.app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::Burn {
                token_id: "item-1".into(),
            },
            &[],
        )
        .unwrap();
    assert_eq!(f.query(request)["valid"], false);
}
#[test]
fn immutable_metadata_has_no_update_backdoor() {
    for value in [
        json!({"update_nft_info":{"token_id":"item-1","token_uri":"https://evil.example","extension":null}}),
        json!({"update_extension":{"msg":{}}}),
        json!({"update_collection_info":{"collection_info":{}}}),
    ] {
        assert!(cosmwasm_std::from_json::<ExecuteMsg>(to_json_binary(&value).unwrap()).is_err());
    }
}
#[test]
fn minter_rotation_requires_acceptance_and_can_be_renounced() {
    let mut f = Fixture::new();
    f.app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &ExecuteMsg::UpdateMinterOwnership(cw_ownable::Action::TransferOwnership {
                new_owner: f.other.to_string(),
                expiry: None,
            }),
            &[],
        )
        .unwrap();
    assert!(f
        .app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::UpdateMinterOwnership(cw_ownable::Action::AcceptOwnership),
            &[]
        )
        .is_err());
    f.app
        .execute_contract(
            f.other.clone(),
            f.collection.clone(),
            &ExecuteMsg::UpdateMinterOwnership(cw_ownable::Action::AcceptOwnership),
            &[],
        )
        .unwrap();
    assert!(f
        .app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &f.mint_msg("item-1", 7),
            &[]
        )
        .is_err());
    f.issuer = f.other.clone();
    f.mint("item-1", 7);
    f.app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &ExecuteMsg::UpdateMinterOwnership(cw_ownable::Action::RenounceOwnership),
            &[],
        )
        .unwrap();
    assert!(f
        .app
        .execute_contract(
            f.issuer.clone(),
            f.collection.clone(),
            &f.mint_msg("item-2", 8),
            &[]
        )
        .is_err());
}
#[test]
fn wrong_chain_instantiation_and_funds_are_rejected() {
    let mut f = Fixture::new();
    let code = f
        .app
        .store_code(Box::new(ContractWrapper::new(execute, instantiate, query)));
    assert!(f
        .app
        .instantiate_contract(
            code,
            f.issuer.clone(),
            &InstantiateMsg {
                name: "bad".into(),
                symbol: "B".into(),
                minter: f.issuer.to_string(),
                expected_chain_id: "wrong".into()
            },
            &[],
            "bad",
            None
        )
        .is_err());
    let mut deps = cosmwasm_std::testing::mock_dependencies();
    let info = cosmwasm_std::testing::message_info(&f.issuer, &[cosmwasm_std::coin(1, "aipi")]);
    assert!(execute(
        deps.as_mut(),
        cosmwasm_std::testing::mock_env(),
        info,
        ExecuteMsg::Burn {
            token_id: "x".into()
        }
    )
    .unwrap_err()
    .to_string()
    .contains("funds"));
}
#[test]
fn receiver_failure_rolls_back_send() {
    let mut f = Fixture::new();
    f.mint("item-1", 7);
    let receiver = ContractWrapper::new(
        |_d: cosmwasm_std::DepsMut,
         _e: cosmwasm_std::Env,
         _i: cosmwasm_std::MessageInfo,
         _m: Value|
         -> Result<cosmwasm_std::Response, cosmwasm_std::StdError> {
            Err(cosmwasm_std::StdError::generic_err("receiver rejects"))
        },
        |_d: cosmwasm_std::DepsMut,
         _e: cosmwasm_std::Env,
         _i: cosmwasm_std::MessageInfo,
         _m: Empty|
         -> Result<cosmwasm_std::Response, cosmwasm_std::StdError> {
            Ok(cosmwasm_std::Response::new())
        },
        |_d: cosmwasm_std::Deps,
         _e: cosmwasm_std::Env,
         _m: Empty|
         -> Result<Binary, cosmwasm_std::StdError> { to_json_binary(&Empty {}) },
    );
    let code = f.app.store_code(Box::new(receiver));
    let target = f
        .app
        .instantiate_contract(code, f.owner.clone(), &Empty {}, &[], "receiver", None)
        .unwrap();
    assert!(f
        .app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::SendNft {
                contract: target.to_string(),
                token_id: "item-1".into(),
                msg: Binary::default()
            },
            &[]
        )
        .is_err());
    assert_eq!(f.owner("item-1"), f.owner.as_str());
}

#[test]
fn malformed_or_oversized_mint_fields_are_rejected_before_storage() {
    let mut f = Fixture::new();
    let original: Value = serde_json::to_value(f.mint_msg("item-1", 7)).unwrap();
    for (field, value) in [
        ("token_id", json!("")),
        ("token_id", json!("x".repeat(129))),
        ("token_id", json!("x/y")),
        ("token_uri", json!("javascript:alert(1)")),
        ("token_uri", json!("ipfs://")),
        ("token_uri", json!(format!("https://{}", "x".repeat(505)))),
        ("metadata_sha256", json!("03".repeat(31))),
        ("chip_public_key", json!(Binary::from(vec![2; 32]))),
        ("chip_public_key", json!(Binary::from(vec![4; 33]))),
        ("chip_proof", json!(Binary::from(vec![1; 63]))),
        ("chip_proof", json!(Binary::from(vec![0xff; 64]))),
        ("owner", json!("invalid")),
    ] {
        let mut bad = original.clone();
        bad["mint"][field] = value;
        assert!(
            f.app
                .execute_contract(f.issuer.clone(), f.collection.clone(), &bad, &[])
                .is_err(),
            "accepted {field}"
        );
    }
    assert_eq!(f.query(json!({"num_tokens":{}}))["count"], 0);
    f.mint("item-1", 7); // Rejected messages did not reserve the ID or key.
}

#[test]
fn send_delivers_receiver_callback_and_transfers_ownership() {
    let mut f = Fixture::new();
    f.mint("item-1", 7);
    let receiver = ContractWrapper::new(
        |d: cosmwasm_std::DepsMut,
         _e: cosmwasm_std::Env,
         info: cosmwasm_std::MessageInfo,
         msg: Value|
         -> Result<cosmwasm_std::Response, cosmwasm_std::StdError> {
            let expected = cw_storage_plus::Item::<Value>::new("expected").load(d.storage)?;
            assert_eq!(
                info.sender.as_str(),
                expected["collection"].as_str().unwrap()
            );
            assert_eq!(msg["receive_nft"]["sender"], expected["sender"]);
            assert_eq!(msg["receive_nft"]["token_id"], "item-1");
            assert_eq!(
                msg["receive_nft"]["msg"],
                Binary::from(b"payload".as_slice()).to_base64()
            );
            Ok(cosmwasm_std::Response::new())
        },
        |d: cosmwasm_std::DepsMut,
         _e: cosmwasm_std::Env,
         _i: cosmwasm_std::MessageInfo,
         m: Value|
         -> Result<cosmwasm_std::Response, cosmwasm_std::StdError> {
            cw_storage_plus::Item::<Value>::new("expected").save(d.storage, &m)?;
            Ok(cosmwasm_std::Response::new())
        },
        |_d: cosmwasm_std::Deps,
         _e: cosmwasm_std::Env,
         _m: Empty|
         -> Result<Binary, cosmwasm_std::StdError> { to_json_binary(&Empty {}) },
    );
    let code = f.app.store_code(Box::new(receiver));
    let target = f
        .app
        .instantiate_contract(
            code,
            f.owner.clone(),
            &json!({"collection":f.collection,"sender":f.owner}),
            &[],
            "receiver",
            None,
        )
        .unwrap();
    f.app
        .execute_contract(
            f.owner.clone(),
            f.collection.clone(),
            &ExecuteMsg::SendNft {
                contract: target.to_string(),
                token_id: "item-1".into(),
                msg: Binary::from(b"payload".as_slice()),
            },
            &[],
        )
        .unwrap();
    assert_eq!(f.owner("item-1"), target.as_str());
    assert_eq!(
        f.query(json!({"issuance":{"token_id":"item-1"}}))["initial_owner"],
        f.owner.as_str()
    );
}
