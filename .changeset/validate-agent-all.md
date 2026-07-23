---
"@cc-wf-studio/cli": patch
---

`ccwf validate --agent` is now repeatable and accepts `all`, preflighting target compatibility for several agents in one run: per-agent `[agent]`-prefixed warning lines, and `warningsByAgent` in multi-agent `--json` reports. Single-agent output is unchanged.
