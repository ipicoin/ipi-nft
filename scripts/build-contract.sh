#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
image='cosmwasm/optimizer@sha256:7e0b9229c1a4118d0c9a2af2e7f5d95a91f264c26a2ce5681c779926e74d7f85'
# Keep caches separate from every other project and compile for the release architecture.
mkdir -p artifacts
rm -f artifacts/release.json
source_before=$(node scripts/release-manifest.mjs --source-digest)
before=$(sha256sum Cargo.lock)
docker run --rm --platform linux/amd64 \
  --mount "type=bind,source=$PWD,target=/code" \
  --mount "type=bind,source=$PWD/Cargo.lock,target=/code/Cargo.lock,readonly" \
  --mount type=volume,source=ipi_nft_optimizer_017_target,target=/target \
  --mount type=volume,source=ipi_nft_optimizer_017_registry,target=/usr/local/cargo/registry \
  --entrypoint sh "$image" -ec '
    /usr/local/bin/optimize.sh .
    chown "$1:$2" artifacts/ipi_nft.wasm artifacts/checksums.txt
  ' sh "$(id -u)" "$(id -g)"
[[ "$before" == "$(sha256sum Cargo.lock)" ]] || { echo 'Build changed Cargo.lock; review dependency resolution' >&2; exit 1; }
bash scripts/test-wasm.sh
node scripts/release-manifest.mjs --expect-source-digest "$source_before"
