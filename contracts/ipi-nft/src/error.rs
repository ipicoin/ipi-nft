use cosmwasm_std::{StdError, VerificationError};
use cw721::error::Cw721ContractError;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum ContractError {
    #[error("{0}")]
    Std(#[from] StdError),
    #[error("{0}")]
    Cw721(#[from] Cw721ContractError),
    #[error("{0}")]
    Verify(#[from] VerificationError),
    #[error("{0}")]
    Ownership(#[from] cw_ownable::OwnershipError),
    #[error("Attached funds are not accepted")]
    Funds,
    #[error("Unexpected chain ID")]
    WrongChain,
    #[error("Invalid {0}")]
    Invalid(&'static str),
    #[error("This token ID has already been issued, including burned tokens")]
    TokenUsed,
    #[error("This chip public key has already been issued, including burned tokens")]
    ChipUsed,
    #[error("Chip proof does not match this issuance")]
    InvalidProof,
}
