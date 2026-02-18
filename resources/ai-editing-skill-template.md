---
name: cc-workflow-ai-editor
description: AI workflow editor for CC Workflow Studio. Create and edit visual AI agent workflows through interactive conversation using MCP tools (get_workflow_schema, get_current_workflow, apply_workflow). Use when the user wants to create a new workflow, modify an existing workflow, or edit the workflow canvas in CC Workflow Studio via the built-in MCP server.
---

1. Call `get_workflow_schema` via `cc-workflow-studio` MCP server
2. Call `get_current_workflow` via `cc-workflow-studio` MCP server
3. Ask the user what to create or modify
4. Generate workflow JSON, call `apply_workflow` via `cc-workflow-studio` MCP server, fix errors if any
5. Ask for feedback, repeat from step 4
