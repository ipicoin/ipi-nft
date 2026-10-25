# Contributing

Read [AGENTS.md](AGENTS.md) and [the OpenSpec guide](openspec/README.md) first. They provide the project boundary, source/spec map, change workflow and relevant validation commands for both people and coding agents.

## Set up

Use Node.js 24 and npm. Contract builds/checks use Docker with Linux `amd64` support and the pinned toolchain; a host Rust installation is optional.

```sh
npm ci --ignore-scripts
npm run check:specs
npm run check
npm test
```

OpenSpec 1.15.0 is included in the locked development dependencies. Use npm scripts or `npx --no-install openspec` so the checkout's version is selected.

## Submit a focused change

Find existing work with `npx --no-install openspec list --json` and read affected main specs. Behavioral changes need a proposal, delta requirements/scenarios, applicable design and tasks. Record implementation evidence, update affected documentation and run the checks listed in [AGENTS.md](AGENTS.md).

Changes with no requirement impact can use `skip_specs: true` as described in the OpenSpec guide. Avoid unrelated formatting, dependency upgrades and generated artifacts.

For an ABI change, run `npm run schema` and include the generated schema changes. For protocol changes, check Rust, SDK and optimized-Wasm compatibility together. For README artwork, inspect the image actually referenced by README.

Before finalizing, run strict OpenSpec checks and the affected software checks, record results in the change and archive completed work through the CLI. Describe the resulting behavior and validation in the pull request. Explicitly identify any checks that could not be run.

## Security and provenance

Follow [SECURITY.md](SECURITY.md) for trust boundaries and vulnerability reporting, and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for operator procedures. Keep secrets, generated release artifacts and local provisioning data outside Git.

The qualified applet, hardware provisioning and Pokédex NFT Station are future integrations. Test results must identify whether they came from software fixtures, a trusted-node check or actual hardware. Contributions use the project's [GNU AGPL v3 license](LICENSE) (`AGPL-3.0-only`). Preserve the [previous MIT notice](docs/history/MIT-LICENSE.txt), [upstream attribution](UPSTREAM.md) and third-party license notices.
