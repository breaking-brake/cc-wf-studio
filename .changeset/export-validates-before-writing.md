---
'@cc-wf-studio/cli': minor
---

`ccwf export` / `ccwf run` now schema-validate the workflow before writing any file, reporting the same errors as `ccwf validate` and exiting 1; `--no-validate` skips the check
