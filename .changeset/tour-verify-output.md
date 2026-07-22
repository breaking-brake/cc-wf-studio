---
"@cc-wf-studio/cli": patch
---

`ccwf tour` now re-validates the workflow file after the launched AI agent exits, catching malformed `tour` output or nonexistent node id references immediately instead of letting them surface later as a broken `ccwf preview`.
