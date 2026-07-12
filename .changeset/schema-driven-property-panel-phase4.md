---
'@cc-wf-studio/core': minor
'cc-wf-studio': patch
---

Schema-driven property panel phase 4: wire registry-driven zod validation into validateAIGeneratedWorkflow (present fields only; visibleWhen-inactive fields skipped), remove the seven hand-written enum checks it supersedes, add compile-time schema↔interface drift guards to all node schemas, and deprecate validateSubAgentData.
