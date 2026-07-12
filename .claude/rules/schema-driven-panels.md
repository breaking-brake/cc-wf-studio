---
paths:
  - "packages/core/src/schema/**"
  - "packages/vscode/src/webview/src/components/property/**"
  - "packages/core/src/utils/validate-workflow.ts"
---

# Schema-Driven Node Property Panels

All 12 node types render their property panels from zod-based schemas in
`@cc-wf-studio/core`. One definition per node drives the panel UI, export
ignored-field warnings, and workflow validation. Keep it that way.

## Where things live

| Layer | Location | Role |
|---|---|---|
| Field primitive | `packages/core/src/schema/field.ts` | `field(zod, meta)`, `FieldMeta`, `getArrayBounds`, `AssertAssignable` |
| Node schemas | `packages/core/src/schema/nodes/<type>-schema.ts` | One file per node type: `<x>PropertySchema` + `<x>ZodObject` + optional `derive<X>Update` + drift guards |
| Registry | `packages/core/src/schema/node-schema-registry.ts` | `NODE_PROPERTY_SCHEMAS` / `NODE_DERIVE_FNS` — the single lookup for all consumers |
| Renderer | `packages/vscode/src/webview/src/components/property/` | `SchemaPropertyPanel` + `SchemaField` + `controls/` + `field-styles.ts` |
| Panel configs | `.../components/property/panels/<type>-panel.tsx`, registered in `node-panels.ts` | Per-node `mode`, `Header`/`Footer` slots, `customControls`, `derive`, `sectionDefaultOpen` |

`PropertyOverlay.tsx` is only the shell (header, resize, node-type badge,
shared node-name field). Do not add per-node rendering back into it.

## Adding a field to a node type

1. Add the field to `packages/core/src/schema/nodes/<type>-schema.ts`
   (zod type + `FieldMeta`: `labelKey`, `control`, and predicates as needed).
2. Add `<nodeType>.field.<name>` (plus `.help` / `.placeholder` if used) to
   `translation-keys.ts` and all 5 locale files. See
   `.claude/rules/translation.md` for the dynamic key conventions.
3. If AI agents should author the field too, also describe it in
   `packages/core/resources/workflow-schema.json` (hand-tuned guide — never
   generated from zod).

That is the whole change for a simple field — the panel, warnings, and
validator pick it up from the registry.

## Guardrails (do NOT grow FieldMeta into a DSL)

FieldMeta holds: targets, i18n keys, a control hint + options, and the
predicates `visibleWhen` / `readonlyWhen` (+ array `itemFields` /
`itemReadonlyWhen`). Nothing else. Specifically:

- **No side-effect meta.** Cross-field effects (outputPorts sync,
  dependent-field resets) go in the pure `derive<X>Update(data, patch)`
  function co-located with the schema.
- **No layout/styling meta.** Declaration order is render order; `sectionKey`
  is the only grouping mechanism.
- **No dialog/navigation meta.** Edit dialogs, badges, navigation, and any
  UI a predicate + slot cannot express stay plain React in the panel's
  `Header`/`Footer` slots or per-field `customControls`.
- A custom control on a field **with** `control` replaces only the input
  (label/help framing stays); on a field **without** `control` it owns the
  whole rendering.

## Drift guards

Every schema file ends with two exported `AssertAssignable` types locking
field names and value types to the node's TypeScript interface. If your
schema change breaks `tsc` there, fix the schema (or, deliberately, the
interface) — do not delete the guard. MCP's permissive data-only fields are
the documented exception.

## Validation semantics (validateAIGeneratedWorkflow)

The schema pass in `packages/core/src/utils/validate-workflow.ts`
(`validateNodeSchemaFields`) checks each node's data against its registered
schema with two deliberate rules:

- Only fields **present** on the data are validated (`undefined` skipped) —
  presence requirements stay with the hand-written checks, so old workflow
  files missing later-added fields keep loading.
- Fields whose `visibleWhen` predicate fails are skipped as inactive
  (e.g. AskUserQuestion `options` bounds apply in manual mode only;
  AI-suggestions mode legitimately stores an empty array). `outputPorts`
  is not schema-validated at all.

Semantic, cross-node, connection, and length/pattern checks remain
hand-written in the same file — do not port them into zod without checking
error-code consumers.
