# @cc-wf-studio/mcp

## 0.1.3

### Patch Changes

- Updated dependencies [181d985]
- Updated dependencies [4403233]
  - @cc-wf-studio/core@0.2.0

## 0.1.2

### Patch Changes

- 37475fc: Relicense from AGPL-3.0-or-later to **MIT**. The headless library and tooling packages are now permissively licensed to encourage reuse and embedding; the VSCode extension (`cc-wf-studio`) remains AGPL-3.0-or-later. Each package now ships its own `LICENSE` file in the published tarball. This is a license loosening — no code or API change — so existing usage is unaffected.
- Updated dependencies [37475fc]
  - @cc-wf-studio/core@0.1.1

## 0.1.1

### Patch Changes

- Fix `ccwf --version` reporting `0.0.0` instead of the actual published version, and add a `--version` / `-V` flag to `ccwf-mcp`. Both bins now read the version from their own `package.json` at startup so they stay in sync with the npm release without a build-time substitution step.

## 0.1.0

### Minor Changes

- e9c49d3: Introduce `@cc-wf-studio/mcp`: a transport-agnostic MCP server toolkit that ships the cc-wf-studio workflow tool definitions, a `WorkflowIoAdapter` contract, and a new standalone stdio bin `ccwf-mcp --file <path>` for editing workflow JSON files outside the VSCode canvas. The VSCode extension's in-process HTTP server is refactored to consume the same factory through a `CanvasWorkflowAdapter` (no user-visible behavior changes — tool names, arguments, and response shapes are preserved). `@cc-wf-studio/core` adds `.js` extensions on its relative imports so the new bin can resolve the package under Node ESM without a bundler.

### Patch Changes

- Updated dependencies [37ec403]
- Updated dependencies [b948d19]
- Updated dependencies [e9c49d3]
  - @cc-wf-studio/core@0.1.0
