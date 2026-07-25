---
'@cc-wf-studio/cli': minor
---

`ccwf canvas` now live-reloads the open canvas when the workflow file changes on disk (e.g. an AI agent editing it via `ccwf mcp --file`, or a text editor), instead of going stale and clobbering the external edit on the next save. The canvas's own saves and mid-write invalid JSON are filtered out, so no spurious reloads occur.
