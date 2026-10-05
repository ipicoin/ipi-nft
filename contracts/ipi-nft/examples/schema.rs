use cosmwasm_schema::write_api;
use ipi_nft::msg::{ExecuteMsg, InstantiateMsg, QueryMsg};
fn main() {
    write_api! { instantiate: InstantiateMsg, execute: ExecuteMsg, query: QueryMsg }
}
