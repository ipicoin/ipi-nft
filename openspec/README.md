# OpenSpec in IPI NFT

This directory records the system's requirements and the changes made to them. Start with [AGENTS.md](../AGENTS.md) for project boundaries and [CONTRIBUTING.md](../CONTRIBUTING.md) for setup.

The project uses OpenSpec **1.15.0**, the standard `spec-driven` schema and English artifacts. The CLI is locked in npm development dependencies; no global install is needed after `npm ci --ignore-scripts`.

## Current capabilities and evidence

The first six specs capture existing behavior and integration constraints. The workflow spec describes how this repository is maintained. Requirements for qualified hardware are acceptance criteria for a future integration, not a claim that an applet is bundled.

| Capability | Main spec | Implementation and verification evidence |
| --- | --- | --- |
| NFT collection | [nft-contract](specs/nft-contract/spec.md) | [contract](../contracts/ipi-nft/src/contract.rs), [messages](../contracts/ipi-nft/src/msg.rs), [state](../contracts/ipi-nft/src/state.rs), [contract tests](../contracts/ipi-nft/tests/contract.rs), [ABI](../schema/ipi-nft.json) |
| Chip proof bytes | [chip-proof-protocol](specs/chip-proof-protocol/spec.md) | [protocol](../docs/CHIP-PROTOCOL.md), [Rust encoding](../contracts/ipi-nft/src/proof.rs), [SDK encoding](../sdk/core.ts), [shared fixture](../protocol/vectors.json), [Rust fixture test](../contracts/ipi-nft/tests/protocol.rs), [SDK tests](../tests/core.test.ts) |
| Reader authentication | [reader-authentication](specs/reader-authentication/spec.md) | [client](../sdk/client.ts), [challenge](../sdk/core.ts), [reader tests](../tests/client.test.ts) |
| Metadata and messages | [metadata-cli](specs/metadata-cli/spec.md) | [core](../sdk/core.ts), [CLI](../sdk/cli.ts), [CLI tests](../tests/cli.test.ts), [deployment procedures](../docs/DEPLOYMENT.md) |
| Build and release | [build-release](specs/build-release/spec.md) | [toolchain pins](../toolchain.lock.json), [build](../scripts/build-contract.sh), [manifest](../scripts/release-manifest.mjs), [VM test](../tools/wasm-tests/tests/wasm.rs), [CI](../.github/workflows/ci.yml), [testnet record](../deployments/ipi-testnet-1.json) |
| Hardware boundary | [hardware-boundary](specs/hardware-boundary/spec.md) | [security model](../SECURITY.md), [required applet lifecycle](../docs/CHIP-PROTOCOL.md), [status](../README.md) |
| AI collaboration | [ai-workflow](specs/ai-workflow/spec.md) | [agent guide](../AGENTS.md), [config](config.yaml), [shared skills](../.agents/skills/), [contributor guide](../CONTRIBUTING.md) |

Specs are requirements, source/tests are implementation evidence, and active deltas are proposed changes. Investigate disagreements before changing either. Historical review/readiness documents and recorded deployment data retain their dates; they do not establish current network state. The runtime support note in [SECURITY.md](../SECURITY.md) remains relevant when planning production work.

## Directory layout

```text
openspec/
  config.yaml                     Project context, artifact rules and operation guidance
  specs/<capability>/spec.md       Current behavior and acceptance requirements
  changes/<change>/               Active proposal, deltas, design and tasks
  changes/archive/<date>-<change>/ Completed changes and verification records
.agents/skills/openspec-*/         Generated shared workflows, versioned with the project
```

The archived [adopt-openspec change](changes/archive/2026-10-25-adopt-openspec/proposal.md) is the worked example for this baseline. Its [validation record](changes/archive/2026-10-25-adopt-openspec/validation.md) explains what was checked and what remained outside scope.

## Discover current work

Run from the repository root:

```sh
npx --no-install openspec list --specs
npx --no-install openspec list --json
npx --no-install openspec show nft-contract --type spec
npm run check:specs
```

Check for an existing active change before creating a competing one. Keep a capability's established path when changing its requirements.

## Make a change

1. Read the affected main specs, implementation/tests, `AGENTS.md` and project context.
2. Create a named change and retrieve the schema's artifact instructions:

   ```sh
   npx --no-install openspec new change improve-reader-timeouts
   npx --no-install openspec instructions proposal --change improve-reader-timeouts --json
   npx --no-install openspec status --change improve-reader-timeouts --json
   ```

3. Write `proposal.md`, capability deltas, an applicable `design.md` and `tasks.md` in dependency order. Retrieve `openspec instructions <artifact> --change <name> --json` before each artifact. Requirements use SHALL/MUST and `#### Scenario:` headings with WHEN/THEN outcomes. New capabilities need a meaningful `## Purpose`; modified requirements retain their full existing scenario blocks.
4. Follow the user's authorized scope. A request for a proposal ends with a reviewable plan. For already authorized implementation, record the artifacts and use the apply workflow to carry out the tasks. Mark completed work only after its applicable checks succeed.
5. Run the affected checks from [AGENTS.md](../AGENTS.md), strict spec validation and any extra checks required by the change. Record results and limitations in the change, for example `validation.md`.
6. Once tasks are complete and verification is recorded, archive through the CLI:

   ```sh
   npx --no-install openspec validate improve-reader-timeouts --strict --no-interactive
   npx --no-install openspec archive improve-reader-timeouts --yes
   npm run check:specs
   ```

Archive synchronizes delta requirements into main specs. Do not manually mark unfinished work complete to enable archive. Keep source, affected specs, tasks and evidence consistent in the same contribution.

### Changes without requirement deltas

For documentation, artwork or a pure refactor that changes no requirement, set `skip_specs: true` in the change's CLI-generated `.openspec.yaml`. Preserve its other fields. Do not create a spec delta for that change. Continue to record the proposal, applicable design, tasks and verification.

This exception concerns requirement changes, not file extensions: a documentation change that alters the promised behavior still needs a real delta.

## Agent entry points

[AGENTS.md](../AGENTS.md) is shared project guidance. [CLAUDE.md](../CLAUDE.md), [GEMINI.md](../GEMINI.md), [Cursor rules](../.cursor/rules/ipi-nft.mdc) and [Copilot instructions](../.github/copilot-instructions.md) point to it. Plain-language requests and the CLI work without assistant-specific slash commands.

The checked-in shared skills are:

| Skill | Purpose |
| --- | --- |
| [openspec-explore](../.agents/skills/openspec-explore/SKILL.md) | Investigate an idea and its trade-offs. |
| [openspec-propose](../.agents/skills/openspec-propose/SKILL.md) | Prepare a planning-only proposal and artifacts. |
| [openspec-apply-change](../.agents/skills/openspec-apply-change/SKILL.md) | Implement authorized tasks and track progress. |
| [openspec-update-change](../.agents/skills/openspec-update-change/SKILL.md) | Revise the plan as requirements change. |
| [openspec-sync-specs](../.agents/skills/openspec-sync-specs/SKILL.md) | Merge reviewed deltas into current specs. |
| [openspec-archive-change](../.agents/skills/openspec-archive-change/SKILL.md) | Finalize and archive completed work. |

Codex invokes these by skill name, such as `$openspec-apply-change`. Other assistants can read the shared skill or install native integrations with the pinned CLI, for example `npx --no-install openspec init --tools claude`. Invocation names vary by tool; use the init output and the [official tool directory](https://openspec.dev/docs/supported-tools).

Keep generated skill instructions intact. Put project rules in `config.yaml` and `AGENTS.md`. Review updates generated by `npx --no-install openspec update`; do not change global profiles or upgrade dependencies as an incidental part of a feature.

## What validation establishes

`npm run check:specs` strictly validates main specs and active changes, then checks archived task completion. CI runs the same command after installing the lockfile. This checks document structure and workflow integrity; code/spec correspondence still requires review and the relevant runtime tests.

Protocol, ABI, contract, release and hardware work have different evidence requirements. In particular, mocked readers and public test vectors do not qualify a real chip, defeat relays or certify a production deployment.

The setup follows the official [project setup](https://openspec.dev/docs/setup) and [project configuration](https://openspec.dev/docs/project-config) documentation.
