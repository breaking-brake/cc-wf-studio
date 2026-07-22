---
'@cc-wf-studio/core': patch
'cc-wf-studio': patch
---

Target-compatibility warnings now name each Claude Code-only node by its canvas label (e.g. `"Branch Session Work" (branchSession)`) instead of a generic `(e.g. branchSession)` hint, in `ccwf export`/`run`/`validate --agent` and the VSCode export warning alike.
