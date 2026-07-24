---
"@cc-wf-studio/cli": minor
---

`ccwf canvas <file>` now starts a brand-new workflow when `<file>` does not exist: the canvas opens with a Start→End starter and the file is created on first save. A missing parent directory or a directory path still fails with a clear error.
