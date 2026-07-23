---
'@cc-wf-studio/core': minor
'@cc-wf-studio/mcp': minor
'@cc-wf-studio/cli': patch
'cc-wf-studio': minor
---

Add a `validate_workflow` MCP tool: AI agents can now validate a workflow draft (schema check plus optional per-agent target-compatibility warnings via the new `agent` parameter) without applying it to the canvas or writing the workflow file — no review dialog, no auto-created sub-agent files. The warning logic is shared with `ccwf export/run/validate --agent` through the new core exports `collectAgentCompatibilityWarnings` / `WORKFLOW_TARGET_AGENTS`, and the AI-editing skill now instructs agents to validate before applying.
