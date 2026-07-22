---
'@cc-wf-studio/cli': patch
---

`ccwf run --launch` now spawns Codex CLI, Copilot CLI, or Gemini CLI (in addition to Claude Code) when `--agent` targets one of them, instead of warning that launch is claude-code only.
