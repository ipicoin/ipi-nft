## MODIFIED Requirements
### Requirement: A production chip profile protects its own identity
A qualified NFT profile MUST generate its secp256r1 (NIST P-256) private key internally, permanently lock the NFT binding and build fixed-purpose reader, mint and action messages from stored state. Its interface MUST prohibit private-key export/import, reset, rebinding and unrestricted signing with the NFT key.

#### Scenario: A generic wallet applet can reset or export its key
- **WHEN** it is considered for use as the NFT applet
- **THEN** it does not satisfy the required NFT profile without a separately qualified implementation
