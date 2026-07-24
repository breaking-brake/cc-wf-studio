---
"cc-wf-studio": patch
"@cc-wf-studio/cli": patch
---

Add "Save as Image (PNG)" to the canvas More Actions menu: exports the whole workflow graph — including off-screen parts, at the current theme's background — as a PNG. The VSCode extension asks where to save via a save dialog; `ccwf canvas` writes the image next to the workflow file (non-clobbering).
