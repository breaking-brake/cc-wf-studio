---
'@cc-wf-studio/core': minor
'@cc-wf-studio/cli': minor
---

`ccwf render --agent <name>` phrases the execution instructions for the chosen
target agent (codex, cursor, gemini, copilot, antigravity, roo-code) — the same
wording `ccwf export --agent <name>` writes into that agent's SKILL.md — and
reports the agent's target-compatibility warnings on stderr. Default output is
unchanged. Core now exports `generateAgentExecutionInstructions` (the
instructions section of `generateAgentSkillContent`, extracted).
