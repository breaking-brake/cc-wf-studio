---
'@cc-wf-studio/mcp': patch
'@cc-wf-studio/cli': patch
'cc-wf-studio': patch
---

The `validate_workflow` MCP tool now preflights several targets in one call: its `agent` parameter accepts a single agent name (unchanged result shape), an array of names, or `"all"` for every supported target — mirroring `ccwf validate --agent all`. With one agent the result keeps the stable `warnings: string[]` shape; with several it carries `warningsByAgent: { <agent>: string[] }` (de-duped, first-mention order). Docs for the MCP server, the ccwf-cli skill, and the AI-editing skill template mention the new forms.
