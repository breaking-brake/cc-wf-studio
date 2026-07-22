---
"@cc-wf-studio/cli": patch
---

`ccwf validate` gains `--agent <name>`: preflight which configured node fields the target agent ignores (and Claude Code-only nodes it cannot run) without writing any files. Warnings do not affect the exit code; with `--json` they are included as a `warnings` array.
