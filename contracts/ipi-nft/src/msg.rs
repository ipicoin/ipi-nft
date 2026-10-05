use crate::state::ChipExtension;
use cosmwasm_schema::{cw_serde, QueryResponses};
use cosmwasm_std::{Binary, Empty, HexBinary};
use cw721::{msg::Cw721QueryMsg, DefaultOptionalCollectionExtension};
use cw_utils::Expiration;

#[cw_serde]
pub struct InstantiateMsg {
    pub name: String,
    pub symbol: String,
    pub minter: String,
    pub expected_chain_id: String,
}

// Explicit allowlist: upstream metadata updates, creator changes and arbitrary
// extension execution are intentionally not part of this contract's ABI.
#[cw_serde]
pub enum ExecuteMsg {
    Mint {
        token_id: String,
        owner: String,
        token_uri: String,
        metadata_sha256: HexBinary,
        chip_public_key: Binary,
        chip_proof: Binary,
    },
    TransferNft {
        recipient: String,
        token_id: String,
    },
    SendNft {
        contract: String,
        token_id: String,
        msg: Binary,
    },
    Approve {
        spender: String,
        token_id: String,
        expires: Option<Expiration>,
    },
    Revoke {
        spender: String,
        token_id: String,
    },
    ApproveAll {
        operator: String,
        expires: Option<Expiration>,
    },
    RevokeAll {
        operator: String,
    },
    Burn {
        token_id: String,
    },
    UpdateMinterOwnership(cw_ownable::Action),
}

#[cw_serde]
#[derive(QueryResponses)]
pub enum IpiQueryMsg {
    #[returns(crate::state::Issuance)]
    Issuance { token_id: String },
    #[returns(crate::state::Issuance)]
    TokenByChip { chip_public_key: Binary },
    #[returns(ProofResponse)]
    VerifyChip {
        token_id: String,
        nonce: HexBinary,
        signature: Binary,
    },
    #[returns(ProtocolResponse)]
    Protocol {},
}

// Untagged wrapper retains the standard CW721 query JSON on the wire.
#[cw_serde]
#[derive(QueryResponses)]
#[serde(untagged)]
#[query_responses(nested)]
pub enum QueryMsg {
    Ipi(IpiQueryMsg),
    Cw721(Cw721QueryMsg<ChipExtension, DefaultOptionalCollectionExtension, Empty>),
}

#[cw_serde]
pub struct ProofResponse {
    pub valid: bool,
    pub burned: bool,
}

#[cw_serde]
pub struct ProtocolResponse {
    pub contract: String,
    pub version: String,
    pub chain_id: String,
    pub proof_protocol: String,
}
