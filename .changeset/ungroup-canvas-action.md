---
"cc-wf-studio": patch
"@cc-wf-studio/cli": patch
---

Add "Ungroup" to the canvas context menu (Ctrl/Cmd+Shift+G): dissolves the selected group(s) in place — the nodes keep their exact canvas positions and edges, only the container disappears, in a single undo entry — instead of routing through the node-delete confirm dialog.
