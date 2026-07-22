---
"@cc-wf-studio/cli": patch
---

`ccwf export` / `ccwf run` re-runs are now idempotent: existing files whose content already matches the planned output are reported as up to date and skipped instead of erroring; only files with different content require `--overwrite`.
