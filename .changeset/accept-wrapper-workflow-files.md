---
'@cc-wf-studio/cli': patch
---

Accept `{meta, workflow}` wrapper files (the bundled sample shape) in every `ccwf` command that takes a workflow file: the wrapper is unwrapped automatically instead of crashing with a raw `TypeError`, and non-workflow JSON now fails with a clear "does not look like a workflow file" error.
