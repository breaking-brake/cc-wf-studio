---
"@cc-wf-studio/core": minor
"cc-wf-studio": patch
---

Add zod-based, target-scoped node property schemas (foundation + subAgent). Core defines each SubAgent property with per-field export-target metadata and exposes helpers to derive "field ignored by target" export warnings. The SubAgent property panel now groups settings into per-agent accordions (Claude Code / Other) instead of an either/or agentType toggle, so each setting's export scope is visually explicit and Claude Code settings are always editable.
