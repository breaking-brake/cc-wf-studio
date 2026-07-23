---
'cc-wf-studio': patch
---

Copy and paste the canvas selection with Ctrl/Cmd+C / Ctrl/Cmd+V: the selected nodes (with the edges between them) are written to the system clipboard as a versioned JSON payload, so a sub-flow can be pasted back with fresh ids — including into a different workflow's canvas in another editor window. Ordinary text copy/paste is never hijacked.
