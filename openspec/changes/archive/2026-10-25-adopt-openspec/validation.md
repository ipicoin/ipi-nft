# Validation

Validation date: 2026-10-25. Scope: adopt OpenSpec and agent/contributor tooling without changing runtime behavior.

## Completed checks

| Check | Result |
| --- | --- |
| `npm ci --ignore-scripts --no-audit --no-fund` | Passed from the committed-format lockfile; 63 packages installed. |
| `npx --no-install openspec --version` | Resolves the locked local CLI, version 1.15.0. |
| `npm run check:specs` before archive | Strict adoption-change validation passed; no older archives existed. |
| `openspec instructions specs/apply --change adopt-openspec --json` | Project context, artifact rules and three apply guidance entries resolve correctly. |
| `npx --no-install openspec doctor --json` | Local project root is healthy; no store/reference errors. |
| Invalid-spec fixture in an isolated temporary project | Strict validation rejects a requirement without normative wording/scenarios; a valid equivalent passes. |
| Archived-task fixture in an isolated temporary project | Archived validation rejects an unchecked task; the completed equivalent passes. |
| `npm run check` | Strict TypeScript check passed. |
| `npm test` | All 30 SDK/reader/CLI test cases passed; zero failures/skips. |
| Git ignore checks | Root `AGENTS.md` and all six generated OpenSpec skills are includable; unrelated local `.agents/` and `.codex/` state remains ignored. |
| Documentation references | 104 local file references checked before archive; only the seven main spec destinations awaited CLI synchronization. |
| Runtime dependency review | Runtime dependency declarations and all existing runtime lock entries are unchanged. |
| Runtime/source scope review | Contract, SDK, tests, protocol fixture, ABI, deployments, build scripts, toolchain, security model and artwork have no diff. |
| `git diff --check` | Passed. |

The project adds OpenSpec as a locked development dependency and a CI step; it changes no runtime implementation or chain deployment.

## Verification limits

Rust checks, schema regeneration and the optimized-Wasm build were not rerun because their code, inputs, tooling and schemas are unchanged. Their existing CI checks remain in place.

No card was provisioned or qualified, no live transaction was signed or broadcast, and no deployment or independent audit was performed. Hardware acceptance requirements document future work.

## Archive follow-up

- `openspec archive adopt-openspec --yes` synchronized all seven capabilities and moved this change to the archive after all seven tracked tasks were complete.
- `npm run check:specs` passed for all seven main specs and the completed archive.
- Main specs contain 37 requirements and 49 scenarios. Purpose text and full requirement/scenario blocks match their archived deltas; there are no placeholder purposes or delta headings in main specs.
- All 104 local references across the 27 project documents checked after archive resolve to existing files/directories. The guide subsequently added two direct links to this existing example and validation record.
- `openspec list --json` reports no unfinished changes; `openspec doctor --json` reports a healthy local root.
- Every OpenSpec artifact, generated shared skill and assistant entry point is visible to Git. Machine-local agent exclusions remain intact.
