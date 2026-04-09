---
name: cc-workflow-ai-editor
description: AI workflow editor for CC Workflow Studio. Create and edit visual AI agent workflows through interactive conversation using MCP tools (get_workflow_schema, get_current_workflow, apply_workflow, update_nodes). Use when the user wants to create a new workflow, modify an existing workflow, or edit the workflow canvas in CC Workflow Studio via the built-in MCP server.
---

1. Call `get_workflow_schema` via `cc-workflow-studio` MCP server
2. Call `get_current_workflow` via `cc-workflow-studio` MCP server
3. Ask the user what to create or modify
4. Generate workflow JSON: use built-in sub-agents (builtInType: explore/plan/general-purpose) by default. Only call `list_available_agents` when the user explicitly asks to use an existing custom sub-agent.
5. Apply changes via `cc-workflow-studio` MCP server:
   - **New workflow or structural changes** (add/remove nodes/connections): use `apply_workflow`
   - **Partial updates to existing nodes** (change name, position, or data): use `update_nodes` (more token-efficient)
   - Fix errors if any
6. Ask for feedback, repeat from step 4

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
