---
'@cc-wf-studio/mcp': minor
'@cc-wf-studio/cli': patch
---

The file-mode MCP server (`ccwf mcp --file` / `ccwf-mcp`) gains an `export_workflow` tool: a connected AI agent can now materialise the workflow's slash-command and agent-skill files itself — `agent` accepts a single name, an array, or `"all"` for one atomic multi-target run — with a `dryRun` preview and the same conflict safety and result shapes as `ccwf export --json` (nothing is written unless every planned file is conflict-free or `overwrite` is set; invalid workflows are refused with `validationErrors`). The tool is backed by a new optional `exportWorkflow` adapter capability and appears only on adapters that implement it, so the canvas-mode server is unchanged.
