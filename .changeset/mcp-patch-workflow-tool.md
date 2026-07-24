---
"@cc-wf-studio/mcp": minor
---

Add `patch_workflow` MCP tool: add/remove nodes and connections without resending the whole workflow JSON. Removals apply before additions (so a removed ID can be reused to replace a node), removing a node cascades to its connections (`cascadedConnectionIds`), removing a group keeps its children in place (`detachedNodeIds`), and the merged result is schema-validated before persisting with the same optimistic revision guard as `update_nodes`.
