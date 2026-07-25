---
'@cc-wf-studio/cli': patch
---

`ccwf run --launch` now spawns the agent CLI with the exported skill already invoked, so the workflow starts running instead of opening an empty session. Supported for claude-code, codex, copilot and gemini, each with the invocation it understands.
