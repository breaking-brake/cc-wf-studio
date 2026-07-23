---
"@cc-wf-studio/cli": minor
---

`ccwf export --agent` is now repeatable and accepts `all`, materialising a workflow for several agents in one atomic run (any conflict aborts before writing). Multi-agent human output uses `[agent]` prefixes; `--json` and `--dry-run --json` report per agent via `agents` + `resultsByAgent`. Single-agent output is unchanged.
