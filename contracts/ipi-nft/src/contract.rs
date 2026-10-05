use crate::{
    error::ContractError,
    msg::{ExecuteMsg, InstantiateMsg, IpiQueryMsg, ProofResponse, ProtocolResponse, QueryMsg},
    proof::{
        binding_hash, canonical_signature, mint_nonce, proof_hash, validate_key, validate_token,
        validate_uri, PROTOCOL,
    },
    state::{Base, ChipExtension, Issuance, CHAIN_ID, CHIP_TOKENS, ISSUANCES},
};
use cosmwasm_std::{
    entry_point, to_json_binary, Binary, Deps, DepsMut, Env, MessageInfo, Response, StdResult,
};
use cw721::{
    msg::{Cw721ExecuteMsg, Cw721InstantiateMsg},
    state::MINTER,
    traits::{Cw721Execute, Cw721Query},
};

pub const CONTRACT_NAME: &str = "crates.io:ipi-nft";
pub const CONTRACT_VERSION: &str = env!("CARGO_PKG_VERSION");

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn instantiate(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: InstantiateMsg,
) -> Result<Response, ContractError> {
    if !info.funds.is_empty() {
        return Err(ContractError::Funds);
    }
    if msg.expected_chain_id != env.block.chain_id {
        return Err(ContractError::WrongChain);
    }
    for (value, max, label) in [
        (&msg.name, 128, "collection name"),
        (&msg.symbol, 32, "symbol"),
        (&msg.expected_chain_id, 128, "chain ID"),
    ] {
        if value.trim().is_empty() || value.len() > max || value.chars().any(char::is_control) {
            return Err(ContractError::Invalid(label));
        }
    }
    deps.api.addr_validate(&msg.minter)?;
    let response = Base::default().instantiate_with_version(
        deps.branch(),
        &env,
        &info,
        Cw721InstantiateMsg {
            name: msg.name,
            symbol: msg.symbol,
            minter: Some(msg.minter),
            creator: Some(info.sender.to_string()),
            collection_info_extension: None,
            withdraw_address: None,
        },
        CONTRACT_NAME,
        CONTRACT_VERSION,
    )?;
    CHAIN_ID.save(deps.storage, &env.block.chain_id)?;
    Ok(response.add_attribute("ipi_protocol", PROTOCOL))
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn execute(
    mut deps: DepsMut,
    env: Env,
    info: MessageInfo,
    msg: ExecuteMsg,
) -> Result<Response, ContractError> {
    if !info.funds.is_empty() {
        return Err(ContractError::Funds);
    }
    if CHAIN_ID.load(deps.storage)? != env.block.chain_id {
        return Err(ContractError::WrongChain);
    }
    let base = Base::default();
    let message = match msg {
        ExecuteMsg::Mint {
            token_id,
            owner,
            token_uri,
            metadata_sha256,
            chip_public_key,
            chip_proof,
        } => {
            MINTER.assert_owner(deps.storage, &info.sender)?;
            deps.api.addr_validate(&owner)?;
            validate_token(&token_id)?;
            validate_uri(&token_uri)?;
            validate_key(chip_public_key.as_slice())?;
            if metadata_sha256.len() != 32 {
                return Err(ContractError::Invalid("metadata SHA-256"));
            }
            if !canonical_signature(chip_proof.as_slice()) {
                return Err(ContractError::Invalid("compact low-S ECDSA signature"));
            }
            if ISSUANCES.has(deps.storage, &token_id) {
                return Err(ContractError::TokenUsed);
            }
            if CHIP_TOKENS.has(deps.storage, chip_public_key.as_slice()) {
                return Err(ContractError::ChipUsed);
            }
            let binding = binding_hash(
                &env.block.chain_id,
                env.contract.address.as_str(),
                &token_id,
                &token_uri,
                metadata_sha256.as_slice(),
            );
            let nonce = mint_nonce(info.sender.as_str(), &owner);
            if !deps.api.secp256k1_verify(
                &proof_hash(&binding, &nonce),
                chip_proof.as_slice(),
                chip_public_key.as_slice(),
            )? {
                return Err(ContractError::InvalidProof);
            }
            let extension = ChipExtension {
                protocol: PROTOCOL.into(),
                chip_public_key: chip_public_key.clone(),
                metadata_sha256,
                binding_sha256: binding.into(),
            };
            let result = base.execute(
                deps.branch(),
                &env,
                &info,
                Cw721ExecuteMsg::Mint {
                    token_id: token_id.clone(),
                    owner: owner.clone(),
                    token_uri: Some(token_uri.clone()),
                    extension: extension.clone(),
                },
            )?;
            ISSUANCES.save(
                deps.storage,
                &token_id,
                &Issuance {
                    token_id: token_id.clone(),
                    token_uri,
                    extension,
                    issuer: info.sender.to_string(),
                    initial_owner: owner,
                    minted_height: env.block.height,
                    burned: false,
                },
            )?;
            CHIP_TOKENS.save(deps.storage, chip_public_key.as_slice(), &token_id)?;
            return Ok(result.add_attribute(
                "ipi_binding_sha256",
                cosmwasm_std::HexBinary::from(binding).to_hex(),
            ));
        }
        ExecuteMsg::Burn { token_id } => {
            let result = base.execute(
                deps.branch(),
                &env,
                &info,
                Cw721ExecuteMsg::Burn {
                    token_id: token_id.clone(),
                },
            )?;
            ISSUANCES.update(deps.storage, &token_id, |record| -> StdResult<_> {
                let mut record =
                    record.ok_or_else(|| cosmwasm_std::StdError::not_found("issuance"))?;
                record.burned = true;
                Ok(record)
            })?;
            return Ok(result);
        }
        ExecuteMsg::TransferNft {
            recipient,
            token_id,
        } => Cw721ExecuteMsg::TransferNft {
            recipient,
            token_id,
        },
        ExecuteMsg::SendNft {
            contract,
            token_id,
            msg,
        } => Cw721ExecuteMsg::SendNft {
            contract,
            token_id,
            msg,
        },
        ExecuteMsg::Approve {
            spender,
            token_id,
            expires,
        } => Cw721ExecuteMsg::Approve {
            spender,
            token_id,
            expires,
        },
        ExecuteMsg::Revoke { spender, token_id } => Cw721ExecuteMsg::Revoke { spender, token_id },
        ExecuteMsg::ApproveAll { operator, expires } => {
            Cw721ExecuteMsg::ApproveAll { operator, expires }
        }
        ExecuteMsg::RevokeAll { operator } => Cw721ExecuteMsg::RevokeAll { operator },
        ExecuteMsg::UpdateMinterOwnership(action) => Cw721ExecuteMsg::UpdateMinterOwnership(action),
    };
    Ok(base.execute(deps, &env, &info, message)?)
}

#[cfg_attr(not(feature = "library"), entry_point)]
pub fn query(deps: Deps, env: Env, msg: QueryMsg) -> Result<Binary, ContractError> {
    match msg {
        QueryMsg::Cw721(msg) => Ok(Base::default().query(deps, &env, msg)?),
        QueryMsg::Ipi(IpiQueryMsg::Protocol {}) => Ok(to_json_binary(&ProtocolResponse {
            contract: CONTRACT_NAME.into(),
            version: CONTRACT_VERSION.into(),
            chain_id: CHAIN_ID.load(deps.storage)?,
            proof_protocol: PROTOCOL.into(),
        })?),
        QueryMsg::Ipi(IpiQueryMsg::Issuance { token_id }) => {
            Ok(to_json_binary(&ISSUANCES.load(deps.storage, &token_id)?)?)
        }
        QueryMsg::Ipi(IpiQueryMsg::TokenByChip { chip_public_key }) => {
            validate_key(chip_public_key.as_slice())?;
            let token_id = CHIP_TOKENS.load(deps.storage, chip_public_key.as_slice())?;
            Ok(to_json_binary(&ISSUANCES.load(deps.storage, &token_id)?)?)
        }
        QueryMsg::Ipi(IpiQueryMsg::VerifyChip {
            token_id,
            nonce,
            signature,
        }) => {
            if nonce.len() != 32 || signature.len() != 64 {
                return Err(ContractError::Invalid("proof length"));
            }
            let record = ISSUANCES.load(deps.storage, &token_id)?;
            let valid = !record.burned
                && canonical_signature(signature.as_slice())
                && deps
                    .api
                    .secp256k1_verify(
                        &proof_hash(record.extension.binding_sha256.as_slice(), nonce.as_slice()),
                        signature.as_slice(),
                        record.extension.chip_public_key.as_slice(),
                    )
                    .unwrap_or(false);
            Ok(to_json_binary(&ProofResponse {
                valid,
                burned: record.burned,
            })?)
        }
    }
}
