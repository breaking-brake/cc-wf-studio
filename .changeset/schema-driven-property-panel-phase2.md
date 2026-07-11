---
'@cc-wf-studio/core': minor
'cc-wf-studio': patch
---

Schema-driven property panel phase 2: migrate AskUserQuestion, Branch, IfElse, and Switch panels to core zod schemas with pure derive functions for outputPorts sync, add the objectArray editor control (bounds read from zod), and replace render-time array-item ID backfill with load-time normalization (ensureNodeDataItemIds).
