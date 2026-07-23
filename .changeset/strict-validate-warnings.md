---
'@cc-wf-studio/cli': minor
---

Add `--strict` to `ccwf validate`: combined with `--agent`, any target-compatibility warning now exits 1 so CI can gate on warnings, not just schema validity. `--strict` without `--agent` is a usage error (exit 2). `--json` output shapes are unchanged — the exit code carries the verdict.
