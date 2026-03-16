---
name: cc-workflow-ai-editor
description: AI workflow editor for CC Workflow Studio. Create and edit visual AI agent workflows through interactive conversation using MCP tools (get_workflow_schema, get_current_workflow, apply_workflow). Use when the user wants to create a new workflow, modify an existing workflow, or edit the workflow canvas in CC Workflow Studio via the built-in MCP server.
---

1. Call `get_workflow_schema` via `cc-workflow-studio` MCP server
2. Call `get_current_workflow` via `cc-workflow-studio` MCP server
3. Call `list_available_commands` via `cc-workflow-studio` MCP server to discover existing sub-agent command files
4. Ask the user what to create or modify
5. Generate workflow JSON: existing sub-agents use commandFilePath reference, new sub-agents provide description/prompt/model etc. without commandFilePath (apply_workflow will auto-create .md files)
6. Call `apply_workflow` via `cc-workflow-studio` MCP server, fix errors if any
7. Ask for feedback, repeat from step 5
