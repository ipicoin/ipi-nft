## MODIFIED Requirements
### Requirement: Ownership actions follow CW721 authorization
The contract SHALL require the current NFT owner as sender and a valid P256 action proof for transfer, send and burn. Approvals SHALL NOT substitute for the owner. CW721 queries and receiver callbacks remain available. A reader or mint proof MUST NOT authorize ownership actions.

#### Scenario: Receiver rejects a transfer
- **WHEN** an authorized owner invokes a receiver that rejects its NFT callback
- **THEN** the send transaction rolls back, including ownership and authorization sequence

#### Scenario: Expired approval is used
- **WHEN** an account attempts a transfer using an expired approval
- **THEN** the transfer fails

#### Scenario: Operator has a valid proof
- **WHEN** an approved operator submits a valid chip action proof
- **THEN** execution fails because the sender is not the owner

## ADDED Requirements
### Requirement: Ownership proofs cannot be replayed
Every successful transfer, send or burn SHALL increment a persistent uint64 sequence. Authorization SHALL bind the immutable NFT binding, current owner, action, target, callback payload hash, sequence and expiry height. Execution SHALL require the exact sequence and a future expiry within 1000 blocks. No recovery or key replacement route SHALL bypass authorization.

#### Scenario: Owner returns
- **WHEN** an NFT transfers from A to B and back to A
- **THEN** an unused proof from A's earlier ownership fails

#### Scenario: Failed action
- **WHEN** authorization or a receiver callback fails
- **THEN** ownership and sequence remain unchanged
