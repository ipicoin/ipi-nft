#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image='cosmwasm/optimizer@sha256:7e0b9229c1a4118d0c9a2af2e7f5d95a91f264c26a2ce5681c779926e74d7f85'
docker run --rm --platform linux/amd64 \
  --mount "type=bind,source=$PWD,target=/code,readonly" \
  --mount type=volume,source=ipi_nft_vm_tests_017_target,target=/vm-target \
  --mount type=volume,source=ipi_nft_optimizer_017_registry,target=/usr/local/cargo/registry \
  --workdir /code --entrypoint cargo "$image" \
  test --locked --manifest-path tools/wasm-tests/Cargo.toml --target-dir /vm-target
