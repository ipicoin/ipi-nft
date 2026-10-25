# metadata-cli Specification

## Purpose
Define deterministic content preparation and local transaction-message tooling without custody of account or chip private keys.

Evidence: `sdk/core.ts`, `sdk/cli.ts`, `tests/core.test.ts`, `tests/cli.test.ts`, `docs/DEPLOYMENT.md`.

## Requirements

### Requirement: Metadata commits to exact content bytes
Metadata preparation SHALL accept PNG, JPEG or WebP headers with image bytes bounded to 1 MiB. It SHALL create deterministic UTF-8 JSON ending in one newline, include the image hash and MIME type, and derive CIDv1 raw-block IPFS URIs from exact image and metadata bytes.

#### Scenario: Identical inputs are prepared twice
- **WHEN** the same supported image, name, description and ordered attributes are supplied
- **THEN** metadata bytes, hashes and generated content URIs are identical

#### Scenario: Metadata bytes change after preparation
- **WHEN** even a whitespace or newline change alters the committed metadata bytes
- **THEN** verification against the original SHA-256 fails

### Requirement: Local verification is bounded and does not publish content
Metadata verification SHALL bound input to 64 KiB, validate the expected SHA-256 and decode valid UTF-8 JSON only after the hash matches. Preparation SHALL identify outputs as unpublished. These operations MUST NOT automatically publish, pin or execute referenced content.

#### Scenario: Metadata is prepared offline
- **WHEN** the metadata command succeeds
- **THEN** it writes an image copy, metadata and hash manifest with `published: false` and performs no upload

### Requirement: Transaction tooling prepares unsigned messages
The CLI SHALL prepare collection, mint, transfer and burn JSON without accepting account seeds or production chip private keys. It MUST NOT sign or broadcast transactions. Mint-message preparation SHALL recheck request commitments and verify the supplied chip proof before emitting chain JSON.

#### Scenario: Mint request has been edited
- **WHEN** a saved request's binding hash, nonce or proof message differs from its recomputed value
- **THEN** mint-message generation fails

#### Scenario: Broadcasting or unknown flags are requested
- **WHEN** a user supplies an unsupported command or option
- **THEN** the CLI reports an error instead of pretending to submit a transaction

### Requirement: Generated files are protected from accidental replacement
The CLI SHALL create output files exclusively and SHALL fail when an output file or metadata output directory already exists. New data files SHALL request mode `0600` and metadata directories mode `0700` on systems supporting those permissions. Input files MUST be regular files within command-specific limits.

#### Scenario: Existing output path is reused
- **WHEN** a command targets an existing generated file or directory
- **THEN** it fails without overwriting the existing content

### Requirement: Transaction confirmation requires committed successful execution
Transaction verification SHALL check the expected chain and exact transaction hash, require a positive committed uint64 height and accept only execution code zero. Mempool acceptance, missing results and failed execution MUST NOT be reported as a confirmed successful transaction.

#### Scenario: Broadcast was accepted but no committed result exists
- **WHEN** verification cannot retrieve a matching successful transaction at a positive height
- **THEN** the CLI does not report successful confirmation
