# build-release Specification

## Purpose
Make contract ABI, release artifacts and deployment identity reproducible and reviewable using the repository's pinned build process.

Evidence: `toolchain.lock.json`, `scripts/`, `.github/workflows/ci.yml`, `tools/wasm-tests/tests/wasm.rs`, `schema/`, `deployments/`, `docs/DEPLOYMENT.md`.

## Requirements

### Requirement: Builds use pinned toolchains and dependency locks
Supported builds SHALL use the optimizer image digest, architecture and toolchain recorded in `toolchain.lock.json` and the build scripts. JavaScript and Rust dependencies SHALL resolve from committed lockfiles. A release build MUST fail if its contract dependency lock or recorded source inputs change during the build.

#### Scenario: Source or dependency lock changes during optimization
- **WHEN** a build observes different contract source inputs or a different Cargo lock after its snapshot
- **THEN** it refuses to write a successful release manifest

### Requirement: Committed ABI reflects the contract interface
Contract JSON schemas SHALL be generated from the Rust interface and committed under `schema/`. CI SHALL reject modified or additional generated schema files that differ from the committed ABI.

#### Scenario: An ABI change omits regenerated schemas
- **WHEN** CI regenerates schemas from the changed Rust interface
- **THEN** schema drift causes verification to fail

### Requirement: Release builds execute the optimized Wasm
A successful release build SHALL validate and execute its actual optimized Wasm in CosmWasm VM through instantiate, signed mint, proof verification, transfer, burn and rejected identity reuse. Native tests alone MUST NOT count as validation of the optimized artifact.

#### Scenario: Optimized artifact fails its lifecycle test
- **WHEN** the VM cannot execute the produced Wasm or its lifecycle checks fail
- **THEN** the release build fails and produces no successful release manifest

### Requirement: Release provenance is written after successful verification
Successful builds SHALL emit the Wasm, checksum and a release manifest with artifact hash, source digest/hashes, Git revision, dirty status, toolchain and target platform. A previous manifest SHALL be removed before a new release build. Generated release artifacts MUST remain outside tracked source.

#### Scenario: A build is interrupted after a previous successful build
- **WHEN** the new build starts but fails before verification completes
- **THEN** the old release manifest cannot be mistaken for a successful new build

### Requirement: Deployment identity is explicit and nonupgradeable
Supported deployments SHALL have no upgrade administrator and SHALL be identified by chain, collection, code ID, Wasm checksum and protocol. Recorded deployments SHALL retain their transaction and source provenance. Testnet records MUST NOT be represented as a mainnet audit or hardware certification.

#### Scenario: Another collection has the same display name
- **WHEN** a collection name matches but its address, code or approved identity differs
- **THEN** it does not inherit the recorded deployment's trust

#### Scenario: A deployed no-admin contract needs new behavior
- **WHEN** a future release changes contract behavior
- **THEN** it requires a separately approved deployment and reader/hardware transition rather than assuming the existing collection can be migrated
