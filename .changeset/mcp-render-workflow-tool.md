---
'@cc-wf-studio/mcp': patch
'@cc-wf-studio/cli': patch
'cc-wf-studio': patch
---

Add a read-only `render_workflow` MCP tool: AI agents can now fetch the current workflow as a fenced Mermaid flowchart block (default) or the full `ccwf render`-style Markdown document (`format: "md"`, optional `agent` phrasing) and paste it into chat so users see a diagram of what was built — available in both the canvas server and `ccwf-mcp` file mode.
