# Proposal

## Why

The maintainer requests the original GNU AGPL instead of the current MIT project license. The license text, package metadata and contributor documentation must agree.

## What Changes

- Replace the root `LICENSE` with the complete, unmodified GNU Affero General Public License, version 3, from GNU.
- Use SPDX `AGPL-3.0-only` consistently in first-party npm and Rust package metadata, including the separate Wasm test package.
- Update current documentation and OpenSpec context to identify GNU AGPL v3, retaining the previous MIT notice and copyright attribution separately for provenance.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This changes licensing and its documentation, without changing runtime requirements; `.openspec.yaml` declares `skip_specs: true`.

## Impact

The distribution license changes from MIT to GNU AGPL v3. The requested version is interpreted as version 3 only, without an additional grant for future versions. Affected files are the license, package manifests and npm root lockfile metadata, README, contributor/provenance documentation and OpenSpec context. Third-party dependency licenses and generated OpenSpec skill notices remain intact. Contract behavior, ABI, chip protocol, deployment records and hardware scope are unchanged.
