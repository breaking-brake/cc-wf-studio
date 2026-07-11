---
'@cc-wf-studio/core': minor
'cc-wf-studio': minor
---

Add 'fable' (Claude Fable 5) to sub-agent and slash command model options. Model
values are now exported from core as `SUB_AGENT_MODEL_VALUES` / `SubAgentModel`
(single source of truth for the zod schema, TS unions, JSON schema, and UI
dropdowns); CC-only models ('haiku', 'fable') are omitted when exporting to
non-Claude-Code providers.
