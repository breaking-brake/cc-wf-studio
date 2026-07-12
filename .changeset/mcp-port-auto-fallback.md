---
'cc-wf-studio': patch
---

MCP server: when the configured port is already in use (another VS Code window, a stale process), automatically fall back to an OS-assigned free port instead of failing AI agent launch. The setting cc-wf-studio.mcp.port now acts as a preferred port; an info toast reports the fallback.
