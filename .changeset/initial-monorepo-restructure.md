---
"cc-wf-studio": patch
---

Restructure repository into a pnpm monorepo. The VSCode extension code now lives in `packages/vscode/`, with `@cc-wf-studio/core`, `@cc-wf-studio/cli`, and `@cc-wf-studio/mcp` skeletons added for the upcoming CLI and standalone MCP server. No user-facing changes in this release.
