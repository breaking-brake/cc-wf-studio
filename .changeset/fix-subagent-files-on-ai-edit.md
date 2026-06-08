---
"cc-wf-studio": patch
---

fix: don't create `.claude/agents/*.md` files during AI editing

- AI-edit applies no longer write sub-agent files to disk: rejecting the diff no longer leaves orphaned (and mis-named, e.g. `-1.md`) agent files behind
- Sub-agent nodes stay inline (agentDefinition/prompt) on the canvas; agent files are materialised only on export/run
- Removed the "files to be created" list from the AI-edit confirmation dialog
