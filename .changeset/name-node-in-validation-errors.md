---
"@cc-wf-studio/core": patch
---

Workflow validation errors now name the offending node by its canvas label/name (e.g. `Switch node "Check status" must have branches array`) instead of leaving the node anonymous or identified only by its opaque id. New `getNodeDisplayName` helper exported from core; error codes and `field` paths are unchanged.
