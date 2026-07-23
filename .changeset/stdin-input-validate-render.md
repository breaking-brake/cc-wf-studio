---
"@cc-wf-studio/cli": minor
---

`ccwf validate` and `ccwf render` now accept `-` to read the workflow JSON from stdin (reported as `<stdin>`), so generated workflows can be checked or rendered in a pipe without a temp file. Works alongside regular files/dirs and all existing flags; an interactive TTY fails fast instead of hanging.
