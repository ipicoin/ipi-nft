use cosmwasm_schema::cw_serde;
use cosmwasm_std::{Binary, Deps, Empty, Env, HexBinary, MessageInfo, StdError};
use cw721::{
    error::Cw721ContractError,
    extension::Cw721Extensions,
    traits::{Contains, Cw721CustomMsg, Cw721State, StateFactory},
    DefaultOptionalCollectionExtension, DefaultOptionalCollectionExtensionMsg,
};
use cw_storage_plus::{Item, Map};

#[cw_serde]
pub struct ChipExtension {
    pub protocol: String,
    pub chip_public_key: Binary,
    pub metadata_sha256: HexBinary,
    pub binding_sha256: HexBinary,
}

impl Cw721State for ChipExtension {}
impl Cw721CustomMsg for ChipExtension {}
impl Contains for ChipExtension {
    fn contains(&self, other: &Self) -> bool {
        self == other
    }
}
impl StateFactory<ChipExtension> for ChipExtension {
    fn create(
        &self,
        deps: Deps,
        env: &Env,
        info: Option<&MessageInfo>,
        current: Option<&Self>,
    ) -> Result<Self, Cw721ContractError> {
        self.validate(deps, env, info, current)?;
        Ok(self.clone())
    }
    fn validate(
        &self,
        _deps: Deps,
        _env: &Env,
        _info: Option<&MessageInfo>,
        current: Option<&Self>,
    ) -> Result<(), Cw721ContractError> {
        if current.is_some() {
            return Err(StdError::generic_err("Chip metadata is immutable").into());
        }
        Ok(())
    }
}

pub type Base<'a> = Cw721Extensions<
    'a,
    ChipExtension,
    ChipExtension,
    DefaultOptionalCollectionExtension,
    DefaultOptionalCollectionExtensionMsg,
    Empty,
    Empty,
    Empty,
>;

#[cw_serde]
pub struct Issuance {
    pub token_id: String,
    pub token_uri: String,
    pub extension: ChipExtension,
    pub issuer: String,
    pub initial_owner: String,
    pub minted_height: u64,
    pub burned: bool,
}

// Deliberately retained after burn: neither a token ID nor a chip can be recycled.
pub const ISSUANCES: Map<&str, Issuance> = Map::new("ipi_issuances");
pub const CHIP_TOKENS: Map<&[u8], String> = Map::new("ipi_chip_tokens");
pub const CHAIN_ID: Item<String> = Item::new("ipi_chain_id");
