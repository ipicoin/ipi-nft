#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
mode=${1:-check}
case "$mode" in check|format|schema) ;; *) echo 'Usage: scripts/rust.sh [check|format|schema]' >&2; exit 1 ;; esac
docker build --platform linux/amd64 -t ipi-nft-rust-check:0.17.0 -f scripts/Dockerfile.check scripts
docker run --rm --platform linux/amd64 \
  --mount "type=bind,source=$PWD,target=/code" \
  --mount type=volume,source=ipi_nft_native_017_target,target=/target \
  --mount type=volume,source=ipi_nft_optimizer_017_registry,target=/usr/local/cargo/registry \
  --env CARGO_TARGET_DIR=/target --entrypoint sh ipi-nft-rust-check:0.17.0 -ec '
    case "$1" in
      check)
        cargo fmt --all -- --check
        cargo fmt --manifest-path tools/wasm-tests/Cargo.toml -- --check
        cargo clippy --workspace --all-targets --locked -- -D warnings
        cargo test --workspace --locked
        ;;
      format)
        cargo fmt --all
        cargo fmt --manifest-path tools/wasm-tests/Cargo.toml
        ;;
      schema)
        cargo run --locked -p ipi-nft --example schema
        chown -R "$2:$3" schema
        ;;
    esac
  ' sh "$mode" "$(id -u)" "$(id -g)"
