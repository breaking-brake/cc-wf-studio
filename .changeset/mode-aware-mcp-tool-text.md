---
'@cc-wf-studio/mcp': patch
'@cc-wf-studio/cli': patch
---

Make MCP tool descriptions and errors mode-aware: in file mode (`ccwf mcp --file` / `ccwf-mcp`) the tools now describe the workflow file being edited — including sha256-revision conflict detection and the fact that sub-agent `.md` files are not auto-created — instead of instructing AI agents to open the VSCode canvas or promising a review dialog that file mode does not have. Canvas-mode text is unchanged.
