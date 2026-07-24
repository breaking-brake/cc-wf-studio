---
'cc-wf-studio': minor
---

Add a Workflow Problems panel to the canvas: every validation issue is listed at once (found by the same validator the MCP server and `ccwf validate` use), clicking a node-scoped issue jumps to and selects the offending node, and the list re-validates live as the workflow is edited. Opens automatically when a save/export fails validation and manually via a new Problems toolbar button.
