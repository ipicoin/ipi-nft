use cosmwasm_std::{from_json, Addr, Binary, Empty, HexBinary, MessageInfo, Response};
use cosmwasm_vm::internals::{check_wasm, Logger};
use cosmwasm_vm::testing::{
    execute, instantiate, mock_env, query, MockApi, MockQuerier, MockStorage,
};
use cosmwasm_vm::{capabilities_from_csv, Backend, Instance, InstanceOptions, WasmLimits};
use serde_json::{json, Value};

#[test]
fn optimized_wasm_accepts_sdk_vector_and_enforces_lifecycle() {
    let wasm =
        std::fs::read("../../artifacts/ipi_nft.wasm").expect("build the optimized contract first");
    check_wasm(&wasm, &capabilities_from_csv("iterator,cosmwasm_1_1,cosmwasm_1_2,cosmwasm_1_3,cosmwasm_1_4,cosmwasm_2_0,cosmwasm_2_1,cosmwasm_2_2"), &WasmLimits::default(), Logger::Off).unwrap();
    let backend = Backend {
        api: MockApi::default().with_prefix("ipi"),
        storage: MockStorage::default(),
        querier: MockQuerier::<Empty>::new(&[]),
    };
    let mut instance = Instance::from_code(
        &wasm,
        backend,
        InstanceOptions {
            gas_limit: 10_000_000_000,
        },
        None,
    )
    .unwrap();
    let v: Value = serde_json::from_str(include_str!("../../../protocol/vectors.json")).unwrap();
    let b = &v["binding"];
    let s = |v: &Value| v.as_str().unwrap().to_owned();
    let mut env = mock_env();
    env.block.chain_id = s(&b["chainId"]);
    env.contract.address = Addr::unchecked(s(&b["collection"]));
    let issuer = MessageInfo {
        sender: Addr::unchecked(s(&v["issuer"])),
        funds: vec![],
    };
    let owner = MessageInfo {
        sender: Addr::unchecked(s(&v["owner"])),
        funds: vec![],
    };
    let _: Response<Empty> = instantiate(&mut instance, env.clone(), issuer.clone(), json!({"name":"IPI Objects","symbol":"IPINFT","minter":v["issuer"],"expected_chain_id":b["chainId"]})).unwrap();
    let mint = json!({"mint":{
        "token_id":b["tokenId"], "token_uri":b["tokenUri"], "owner":v["owner"],
        "metadata_sha256":b["metadataSha256"],
        "chip_public_key":Binary::from(HexBinary::from_hex(&s(&v["publicKey"])).unwrap()),
        "chip_proof":Binary::from(HexBinary::from_hex(&s(&v["signatureCompact"])).unwrap()),
    }});
    let _: Response<Empty> =
        execute(&mut instance, env.clone(), issuer.clone(), mint.clone()).unwrap();
    let issuance: Value = from_json(
        query(
            &mut instance,
            env.clone(),
            json!({"issuance":{"token_id":b["tokenId"]}}),
        )
        .unwrap(),
    )
    .unwrap();
    assert_eq!(issuance["extension"]["binding_sha256"], v["bindingSha256"]);
    let proof = json!({"verify_chip":{"token_id":b["tokenId"],"nonce":v["mintNonce"],"signature":Binary::from(HexBinary::from_hex(&s(&v["signatureCompact"])).unwrap())}});
    let verified: Value =
        from_json(query(&mut instance, env.clone(), proof.clone()).unwrap()).unwrap();
    assert_eq!(verified["valid"], true);
    let _: Response<Empty> = execute(
        &mut instance,
        env.clone(),
        owner,
        json!({"transfer_nft":{"token_id":b["tokenId"],"recipient":v["issuer"]}}),
    )
    .unwrap();
    let _: Response<Empty> = execute(
        &mut instance,
        env.clone(),
        issuer.clone(),
        json!({"burn":{"token_id":b["tokenId"]}}),
    )
    .unwrap();
    let burned: Value = from_json(query(&mut instance, env.clone(), proof).unwrap()).unwrap();
    assert_eq!(burned, json!({"valid":false,"burned":true}));
    assert!(execute::<_, _, _, _, Empty>(&mut instance, env, issuer, mint).is_err());
}
