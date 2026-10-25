# Validation

Validated on 2026-10-25 with Node.js v24.21.0 and the locked OpenSpec 1.15.0 CLI.

- Downloaded the original license with `curl --fail --location --max-time 30 https://www.gnu.org/licenses/agpl-3.0.txt --output /tmp/ipi-nft-agpl-3.0.txt`; the root `LICENSE` matches that download byte for byte (34,523 bytes, 661 lines).
- `sha256sum LICENSE`: `0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0`.
- Compared `docs/history/MIT-LICENSE.txt` with `git show HEAD:LICENSE`: exact byte match, retaining both original copyright notices and the complete previous MIT text.
- Parsed npm JSON and Rust TOML: the npm package, root npm lockfile entry, Rust workspace and standalone Wasm test package use `AGPL-3.0-only`; the contract still inherits the workspace license.
- Compared parsed npm lockfiles with the Git baseline: only the root package license changes; all resolved dependency metadata is preserved. Generated shared workflow skills are unchanged.
- Checked local Markdown link targets in README, `UPSTREAM.md` and `CONTRIBUTING.md`: all resolve. Reviewed current licensing references and the scoped diff.
- `npx --no-install openspec validate adopt-gnu-agpl-v3 --strict --no-interactive`: passed with the declared `skip_specs: true` exemption.
- `npm run check:specs`: passed for all main specs, the active change and existing archived work.
- `npx --no-install openspec archive adopt-gnu-agpl-v3 --yes`: completed as `2026-10-25-adopt-gnu-agpl-v3`; the subsequent `npm run check:specs` passed all seven main specs and both archived changes, and `openspec list --json` reported no active changes.
- `git diff --check`: passed.

No executable code, ABI, protocol fixture, dependency resolution or deployment record changed. Runtime tests and contract builds were not run for this license/documentation-only change. These checks establish document and metadata consistency, not hardware qualification, a live-chain deployment or an independent audit.
