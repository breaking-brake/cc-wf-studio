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

## Group Node

Group nodes are visual containers for organizing related nodes on the canvas. They do NOT affect workflow execution.

### Rules
- Group nodes have `type: "group"` and require `data.label` (display name)
- Group nodes must have `style: { width, height }` to define their visual area
- Group nodes CANNOT have connections (no edges to/from group nodes)
- To place a node inside a group, set the child node's `parentId` to the group's `id`
- Child node `position` is relative to the group's top-left corner (not the canvas origin)
- The `name` field on group nodes is not validated (can be empty or omitted)

### Example
```json
{
  "nodes": [
    {
      "id": "group-1",
      "type": "group",
      "name": "",
      "position": { "x": 100, "y": 100 },
      "style": { "width": 400, "height": 300 },
      "data": { "label": "Data Processing" }
    },
    {
      "id": "node-1",
      "type": "subAgent",
      "name": "fetch-data",
      "parentId": "group-1",
      "position": { "x": 50, "y": 50 },
      "data": { "description": "Fetch data from API", "outputPorts": 1 }
    }
  ]
}
```
