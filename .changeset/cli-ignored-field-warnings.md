---
"@cc-wf-studio/cli": patch
---

`ccwf export` and `ccwf run` now warn which configured node fields the chosen target ignores (e.g. Sub-Agent model/tools/memory when exporting to codex), instead of silently dropping them.
