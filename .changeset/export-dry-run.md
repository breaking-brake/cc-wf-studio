---
'@cc-wf-studio/cli': minor
---

Add `--dry-run` to `ccwf export`: preview every planned file (new / up to date / conflict) without writing anything. Exit 0 means the export would succeed; exit 1 means it would stop on conflicts (add `--overwrite` to see those files as `would overwrite` instead).
