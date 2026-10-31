# Validation — 2026-10-31

Baseline: d2697cc7fd950b891a6a08f4fb30213209fd81ab; local fork branch feat/p256-owner-chip.

- Node 24: npm ci --ignore-scripts completed; npm run check passed; npm test passed all 33 tests, including action CLI roundtrips, altered requests, wrong k1 chip curve and replay-sensitive fields.
- Pinned optimizer/toolchain: npm run test:contract passed formatting, clippy with warnings denied, 15 contract tests and 2 shared-vector tests. Native tests cover mint commitments, identity tombstones, owner/operator restrictions, transfer/send/burn, callback failure rollback, sequence reuse after A→B→A, expiry and missing/wrong action proofs.
- npm run schema completed; ABI adds required action authorization and issuance sequence.
- Strict OpenSpec validation passed. Final archive validation follows when all tasks are complete.
- The initial optimized Wasm lifecycle VM test passed, but its release manifest was intentionally rejected because source inputs changed during the build. A clean final build is required; no manifest is claimed from that first run.

## Boundaries
No public deployment, physical-chip qualification or independent security audit. Full prototype lifecycle with both wallet account families and measured NFT gas/fees remains in the integration goal. Existing reflect-contract measurements do not qualify NFT costs. The fork preserves the wallet boundary; contract mock senders are not evidence of SDK account signature integration.

The user has assigned the application conversion to Codex, superseding the earlier upstream-author dependency. v1 no-admin deployments remain historical; v2 needs a new collection.

## Final artifact

The final npm run build:contract completed successfully with the pinned optimizer. Optimized VM lifecycle and rejection checks passed (1 test). Artifact: 815636 bytes; SHA-256 31c5713031532e33e5718107d03c2e44264058c98c9f2fd455464dcbe97d1d77. artifacts/release.json records source hashes and the dirty working-tree provenance; it does not claim the baseline commit contains the changes. The VM emitted a libunwind diagnostic while completing successfully.

The pinned formatting/clippy/native tests and schema generation were rerun after the final source changes and passed. Node SDK/CLI final run: 33 passed, zero failures.
