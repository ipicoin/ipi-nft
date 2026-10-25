# ai-workflow Specification

## Purpose
Give contributors and coding agents a shared, versioned description of the system and a repeatable path from requested changes to verified implementation.

Evidence: `AGENTS.md`, `CONTRIBUTING.md`, `openspec/README.md`, `openspec/config.yaml`, `.agents/skills/openspec-*/SKILL.md`, `.github/workflows/ci.yml`.

## Requirements

### Requirement: Project instructions are discoverable across agents
The repository SHALL track a root `AGENTS.md` describing the project boundary, source/spec map, commands and critical invariants. Lightweight entry points for other configured assistants SHALL direct them to this same shared guidance rather than maintain independent project rules.

#### Scenario: A new agent opens the checkout
- **WHEN** it reads its repository instruction entry point
- **THEN** it can find the shared guide, current specs, implementation evidence and hardware limitations

### Requirement: Specifications and workflow skills are versioned
The repository SHALL track project configuration, main specs, change artifacts and the generated shared OpenSpec skills. Ignore rules MUST preserve unrelated machine-local agent configuration while allowing these project files to be included in a normal commit.

#### Scenario: A contributor clones the repository
- **WHEN** it installs the locked development dependencies
- **THEN** the same pinned OpenSpec CLI can validate the checked-in specs without machine-global tool configuration

### Requirement: Behavioral changes have reviewable scope and requirements
Contributors SHALL read affected specs and evidence before changing behavior. Behavior changes SHALL record a proposal, capability deltas, applicable design decisions and checkbox tasks. Work with no requirement changes SHALL use the supported `skip_specs: true` marker rather than inventing behavior. The user's requested scope MUST determine whether work stops at planning or includes implementation.

#### Scenario: A change alters protocol encoding
- **WHEN** its implementation is planned
- **THEN** the change identifies compatibility impact and includes relevant Rust, TypeScript, fixture and ABI checks

#### Scenario: A change only corrects presentation or documentation
- **WHEN** it does not alter an existing requirement
- **THEN** its tracking can explicitly skip spec deltas while still recording the task and applicable verification

### Requirement: Spec validation is reproducible and enforced in CI
The repository SHALL provide locked commands that strictly validate all active/main specs and reject incomplete archived task lists. CI SHALL run these checks using the committed dependency lock alongside the existing software checks.

#### Scenario: An invalid requirement or unfinished archived task is committed
- **WHEN** the OpenSpec check runs locally or in CI
- **THEN** it returns a failure rather than reporting the repository as valid

### Requirement: Completion records describe verified work
Tasks SHALL be marked complete only after their stated behavior is implemented and applicable checks are recorded. Completed changes SHALL synchronize their deltas into main specs before archival. Validation records MUST distinguish software checks from live-chain, physical hardware and independent audit evidence.

#### Scenario: Only software fixtures have been exercised
- **WHEN** a change is verified and archived
- **THEN** its validation record does not claim card qualification, a live deployment or an independent security audit
