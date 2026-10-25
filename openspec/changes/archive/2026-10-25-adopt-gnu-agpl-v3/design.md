# Design

## Context

The root license, npm metadata, Rust workspace, README, contributor guide and OpenSpec context currently identify MIT. The separate Wasm test package has no license field. `UPSTREAM.md` records a historical MIT application and separately licensed dependencies. See `proposal.md` for the requested change.

## Goals / Non-Goals

**Goals:** Publish the authentic GNU AGPL v3 text and consistent first-party license identifiers while preserving existing attribution.

**Non-Goals:** Change executable code, ABI, protocol bytes, trust boundaries, dependencies or recorded deployments; relicense third-party dependencies or generated workflow skills.

## Decisions

- Copy the complete text from `https://www.gnu.org/licenses/agpl-3.0.txt` into `LICENSE` verbatim. Project-specific attribution belongs in README and provenance documentation rather than inside GNU's license text.
- Use `AGPL-3.0-only`, interpreting the request as the published version 3 without granting later versions. Update only root npm lockfile licensing; retain dependency metadata.
- Preserve the former `LICENSE` byte for byte as `docs/history/MIT-LICENSE.txt`, linked from `UPSTREAM.md`. Identify it as the previous notice, and identify GNU AGPL v3 as the current project license.
- Use `skip_specs: true` because no system behavior requirement changes. Validate license bytes, metadata consistency, preserved notices, local documentation links and strict OpenSpec checks. Runtime tests and a new deployment are unnecessary for this metadata/documentation change.

## Risks / Trade-offs

- Stale MIT wording could obscure the new license → inspect all tracked current project references while preserving historical and third-party notices.
- Accidentally modifying the GNU text or dropping prior attribution → compare `LICENSE` with the downloaded original and the archived MIT notice with the Git baseline.
