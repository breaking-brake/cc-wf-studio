---
"cc-wf-studio": minor
"@cc-wf-studio/core": patch
"@cc-wf-studio/cli": patch
---

fix: switch the Roo Code integration to Zoo Code (#770). The sunset Roo Code extension is replaced by its maintained community fork: the extension now detects `ZooCodeOrganization.zoo-code` first (falling back to the legacy Roo Code extension if installed), launches skills with Zoo Code's `/<skill>` slash syntax, and all UI labels, generated skill instructions, and CLI hints now say "Zoo Code". The `roo-code` agent ID and `.roo/` output paths are unchanged because Zoo Code still reads `.roo/skills/` and `.roo/mcp.json`.
