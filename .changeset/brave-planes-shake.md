---
'@cc-wf-studio/core': minor
'cc-wf-studio': minor
---

feat: add branchSession node type — a Claude Code-only human-in-the-loop checkpoint where the user works interactively with the AI in a branch session (/branch) and hands results back to the parent session (/resume). Exporting/running workflows containing this node for non-Claude-Code targets shows a confirmation dialog (webview) or a warning (CLI). Includes a new "Daily Dev with Branch Session" sample workflow (5 locales) and a fix for the MCP server manager getting stuck in "already running" after a failed start.
