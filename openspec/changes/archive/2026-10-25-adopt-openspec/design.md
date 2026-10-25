# Design

## Context

See [proposal.md](proposal.md) for scope. The checkout already has Rust/TypeScript tests, deployment records, a chip protocol and a security model. It has no OpenSpec baseline; `.gitignore` currently hides root agent instructions and all shared skills. OpenSpec 1.15.0 is installed as a standalone executable on this machine.

## Goals / Non-Goals

**Goals:** Preserve runtime behavior while making requirements, constraints and verification discoverable from a fresh checkout. Include a complete first change as a worked example.

**Non-Goals:** Change on-chain code, dependencies used at runtime, the ABI, proof bytes, artwork or deployment identity; implement or certify hardware; install machine-wide assistant configuration.

## Decisions

### Standard schema and source-grounded baseline

Use OpenSpec's `spec-driven` schema and capture seven cohesive capabilities in English. Six document existing behavior/constraints; `ai-workflow` introduces the collaboration process. Every capability names implementation/test evidence, and the index explains checks and pending work. Archive the adoption through the CLI so the first main specs and their deltas stay connected.

An empty initialization was considered but would leave future agents without the system's contract. A custom workflow schema adds maintenance without a current need.

### One shared instruction source

Keep project facts in `AGENTS.md`, detailed workflows in `openspec/README.md`, and short artifact/operation rules in `config.yaml`. Track the generated `.agents/skills/openspec-*` files without editing vendor instructions. Add small Claude, Gemini, Cursor and Copilot entry points that reference the shared guide. Other tool-specific commands can be installed later with `openspec init --tools <tool>`.

Generating every supported integration would duplicate many workflows and introduce unrelated files. Shared skills plus thin entry points provide the required access with less drift.

### Lock the CLI in development dependencies

Add exact `@fission-ai/openspec@1.15.0` to `devDependencies` and the npm lockfile. Provide `check:specs` for strict main/active validation and archived task completion. Run it after `npm ci` in CI. The global standalone CLI remains usable; npm scripts resolve the locked local CLI.

An unpinned `npx @latest` or reliance on a developer's global executable would make CI and fresh checkouts depend on different versions.

### Preserve trust boundaries

The hardware spec describes integration acceptance requirements and accurate status reporting. It does not turn planned applets into delivered implementations. Existing deployed Wasm, protocol fixtures, schemas and runtime code remain unchanged. Agent guidance preserves trusted deployment selection, non-exportable key requirements and the difference between proof possession and ownership.

## Risks / Trade-offs

- Baseline drift → trace each capability to existing source/tests and require delta specs with behavior changes.
- New development dependency surface → exact version and lockfile; no change to runtime dependencies.
- Multiple assistant entry points drift → keep them as short links to one shared guide.
- Strict validation checks document structure, not correctness → manually compare specs to source and run applicable software checks.
- Hardware/mainnet claims outpace evidence → document missing components and keep tests, testnet records and qualification distinct.

## Migration Plan

1. Initialize shared skills and project config; write the proposal and baseline deltas.
2. Add tracked instructions, contributor onboarding, npm/CI validation and the evidence index.
3. Run strict validation, instruction/config resolution, TypeScript checking and SDK/CLI tests; record results.
4. Archive only after all implementation tasks are complete; validate the resulting main specs and archive.

Rollback removes this tooling/documentation and its CI/npm integration; it requires no chain migration or hardware operation.
