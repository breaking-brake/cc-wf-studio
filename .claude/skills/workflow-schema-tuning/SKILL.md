---
name: workflow-schema-tuning
description: Use when modifying `resources/workflow-schema.json` in cc-wf-studio to influence how AI agents generate workflows via the cc-workflow-ai-editor skill. Triggers include "AIが特定のノードタイプを選んでくれない", "ワークフロー生成のバイアスを調整したい", "スキーマの description を変えたい", "新しいノードタイプを追加したい", "嘘の制約がスキーマに混じっていないか確認したい". Covers what the schema actually does (instructions to AI, not runtime constraints), the design philosophy (align direction, do not prescribe rules), the build pipeline (.json → .toon auto-generated), and known bias sources to audit.
---

# Workflow Schema Tuning

The schema (`resources/workflow-schema.json`) is the primary spec **delivered to the AI editor at runtime** via the `get_workflow_schema` MCP tool. It is not a runtime validator — the runtime barely validates anything. **Whatever the schema says, the AI believes.** Treat schema edits as prompt engineering, not type definitions.

## Core principle: align direction, do not prescribe rules

AI agents already know how to choose between node types intuitively (e.g., when to delegate to a sub-agent vs. handle in-context). The fix for bad output is almost never "add more rules" — it is "remove what is biasing the AI in the wrong direction."

**Defaults**:
- Prefer minimal description text that states each node's *positional role* (立ち位置). Example: "A step executed by the main orchestrating agent" vs. "A step executed by an isolated sub-agent." The contrast does the work.
- Avoid `aiGenerationGuidance` lists of "when to use / when not to use / anti-patterns." They treat the AI as a rules engine, bloat tokens, and fail on unanticipated cases.
- **Test minimal first.** Only add guidance after a concrete failure where the minimal change is provably insufficient.

**Anti-pattern**: writing detailed `upgradeToSubAgentWhen` / `stayInPromptWhen` lists. If you find yourself writing 3+ bullets explaining when to use a node, the description itself is probably wrong.

## Schema architecture

| File | Role | Editable? |
|---|---|---|
| `resources/workflow-schema.json` | Single source of truth | YES |
| `resources/workflow-schema.toon` | Token-efficient format consumed by AI via MCP | NO — auto-generated |
| `resources/ai-editing-skill-template.md` | Skill template loaded at AI editor launch | YES |
| `scripts/generate-toon-schema.ts` | TOON generator | YES (rare) |

After editing `.json`, regenerate `.toon`:

```bash
npm run generate:toon
```

The full build (`npm run build`) does this automatically as the first step.

## Where biases hide (audit checklist)

When the AI consistently picks the wrong node type, look here in priority order:

1. **`ai-editing-skill-template.md` step 4** — strongest pull. A line like "use built-in sub-agents by default" overrides every other signal in the schema. Keep this neutral.
2. **`nodeTypes.<type>.description`** — the AI's first impression of what each node *means*. Keep terse, contrastive, role-focused.
3. **`nodeTypes.<type>.aiGenerationGuidance`** — when present, this is read closely. Audit for stale "default" framings or anti-patterns that no longer apply.
4. **`examples[]`** — the AI learns strongly from examples. If every example uses one node type, expect that node to dominate output.
5. **Top-level constraints** (`connections.overview.forbidden`, `exportValidationRules`, `postGenerationChecklist`) — these can encode false constraints (e.g., "no cycles allowed" when the runtime allows them, since the runtime is an AI that uses judgment, not a deterministic executor). **Removing false constraints is itself a valid improvement.**

## Workflow for making changes

1. **Diagnose**: identify the symptom (wrong node type chosen, false constraint cited in AI's reasoning, etc.).
2. **Locate the bias**: walk the audit checklist above. Look for a single source pulling the AI in the wrong direction before adding new content.
3. **Minimal edit**: prefer removing biased text or fixing one description over adding new sections.
4. **Regenerate TOON**: `npm run generate:toon`.
5. **Validate**: `npm run check && npm run build`.
6. **Test**: `npm run debug` launches a fresh Extension Development Host. Trigger the AI editor with a node-type-agnostic prompt (no hints like "use a sub-agent for X") and inspect the generated workflow.
7. **Iterate**: if the minimal change is insufficient, add the smallest additional signal — not a guidance section.

## Important constraints

- The framework is **multi-agent** (Claude Code, Codex, "other"). Schema text must be agent-agnostic. Avoid Claude-specific phrasing like "isolated Claude session" — use "isolated AI agent session" or "isolated sub-agent."
- The runtime is an AI agent making judgments, **not a deterministic program**. Constraints that make sense in code (no cycles, no infinite loops) often do not apply here. Verify before transcribing programming-style constraints.
- After `generate:toon`, confirm the change took effect by grepping the relevant string in `workflow-schema.toon`. The MCP delivers TOON, not JSON.

## Commit conventions for schema changes

Per the project's conventional commit policy:
- Description fixes / bias removal → `improvement:` (patch bump)
- Build/tooling-only changes → `chore:` (no release)
- Keep subjects ≤50 chars, body 3–5 bullets, "what changed" only
- Split unrelated concerns into separate commits to make diffs reviewable
