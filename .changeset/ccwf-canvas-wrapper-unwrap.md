---
"@cc-wf-studio/cli": patch
---

Fix `ccwf canvas` showing an empty canvas for `{meta, workflow}` wrapper files — the canvas now unwraps them like every other subcommand, and saving writes the wrapper back so `meta` is preserved.
