# Tasks

## 1. License and attribution

- [x] 1.1 Install the unmodified GNU AGPL v3 as `LICENSE`, retain the old MIT notice in `docs/history/MIT-LICENSE.txt`, and update README/provenance; verify both license files byte for byte and check their documentation links.
- [x] 1.2 Update first-party npm/Rust metadata, contributor instructions and OpenSpec context to `AGPL-3.0-only`; verify consistent identifiers and unchanged third-party package/skill licenses.

## 2. Integration validation

- [x] 2.1 Run strict OpenSpec validation, inspect the scoped diff and record results and limits in `validation.md`.

## Workflow follow-up

- Archive the completed change through the CLI and run `npm run check:specs` on the archived result.
