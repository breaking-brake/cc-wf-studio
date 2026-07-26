import { describe, expect, it } from 'vitest';
import type { z } from 'zod';
import type { PropertyField } from './field.js';
import { NODE_PROPERTY_SCHEMAS } from './node-schema-registry.js';
import { SUB_AGENT_COLORS } from '../types/workflow-definition.js';

/**
 * Suite S1 — consistency between the values the property panel *offers* in a
 * dropdown and the values the field's own zod type *accepts*:
 *
 * | Representation        | Location                                  | Role                                  |
 * |-----------------------|-------------------------------------------|---------------------------------------|
 * | `FieldMeta.options`   | `packages/core/src/schema/nodes/`         | what the select/radio renders         |
 * | the field's zod       | the same object literal, or a constant    | what `ccwf validate` actually accepts |
 * | `SUB_AGENT_COLORS`    | `types/workflow-definition.ts:141`        | what the colour picker renders        |
 *
 * If the first and second disagree, the panel offers a value the node's own
 * zod type rejects. The user picks it, `updateNodeData` stores it, the file
 * saves — and the workflow then fails validation for a value the product
 * itself offered: `validateNodeSchemaFields`
 * (`packages/core/src/utils/validate-workflow.ts:257`) runs
 * `propertyField.zod.safeParse(value)` on every field present on node data, so
 * `ccwf validate` exits 1 and the MCP `apply_workflow` write is refused, on a
 * workflow the user never hand-edited. The mirror-image break is quieter: a
 * value zod accepts but the panel stops offering becomes unreachable from the
 * UI with nothing failing anywhere.
 *
 * Like `authoring-guide-consistency.test.ts`, this relates two independently
 * maintained representations of one fact rather than restating either of them.
 * The duplication it guards is real and cross-file: the eight colours are
 * written out three times (`SUB_AGENT_COLORS`, `sub-agent-schema.ts`'s private
 * `SUB_AGENT_COLOR_VALUES`, and an inline literal in
 * `sub-agent-flow-schema.ts`), and `['user','project','local']` appears in
 * three more files. The `AssertAssignable` drift guards make each zod enum a
 * *subset* of `keyof typeof SUB_AGENT_COLORS` at compile time; they do not
 * constrain the other direction, so adding a ninth colour makes the picker
 * offer a value both zod enums reject with `tsc` still green. That is the hole
 * section C closes.
 *
 * Section A is the load-bearing half — it needs no zod introspection at all,
 * so it cannot break on a zod upgrade. Section B adds the reverse direction
 * and does introspect (`_zod.def`), so it carries its own canary.
 */

/** Unwrap one `.optional()` layer; zod 4 keeps the inner type on `def`. */
function unwrapOptional(zodType: z.ZodTypeAny): z.ZodTypeAny {
  const def = (zodType as { _zod?: { def?: { type?: string; innerType?: z.ZodTypeAny } } })._zod
    ?.def;
  return def?.type === 'optional' && def.innerType ? def.innerType : zodType;
}

/**
 * The value set of a zod enum, or `undefined` for any other type. Reads
 * `.options` off the unwrapped type — the same accessor zod documents for
 * `ZodEnum`.
 */
function enumValuesOf(zodType: z.ZodTypeAny): readonly string[] | undefined {
  const inner = unwrapOptional(zodType);
  const type = (inner as { _zod?: { def?: { type?: string } } })._zod?.def?.type;
  if (type !== 'enum') return undefined;
  const values = (inner as unknown as { options?: unknown }).options;
  return Array.isArray(values) ? (values as readonly string[]) : undefined;
}

const sorted = (values: readonly string[]) => [...values].sort();

interface RegisteredField {
  id: string;
  field: PropertyField;
}

/** Every registered field, flattened to `<nodeType>.<fieldName>` ids. */
const allFields: RegisteredField[] = Object.entries(NODE_PROPERTY_SCHEMAS).flatMap(
  ([nodeType, schema]) =>
    Object.entries(schema ?? {}).map(([fieldName, field]) => ({
      id: `${nodeType}.${fieldName}`,
      field,
    })),
);

/** Fields the panel renders as a dropdown or a radio group. */
const optionFields = allFields.filter(
  ({ field }) => field.meta.control === 'select' || field.meta.control === 'radio',
);

/** Fields the panel renders with the sub-agent colour picker. */
const colorFields = allFields.filter(({ field }) => field.meta.control === 'color');

/**
 * Fields exempt from section B's exact-match rule, with the reason. Named
 * individually so a *new* divergence still fails — the point of the allowlist
 * is that it does not grow silently.
 */
const EXACT_MATCH_EXEMPTIONS: Record<string, string> = {
  // `allowCustom: true` + a `z.string()` zod: CODEX_PREDEFINED_MODELS is a
  // suggestion list, not the accepted set. The panel appends a "custom" entry
  // that switches to free-text, so any string is legitimately accepted.
  'codex.model': 'allowCustom — the option list is a suggestion, not the accepted set',
};

const COLOR_KEYS = Object.keys(SUB_AGENT_COLORS);

describe('property-panel option sets', () => {
  it('the registry still exposes the known select/radio fields', () => {
    // Every parameterised case below is filtered on `control`, so without this
    // a renamed control kind would make the whole suite pass vacuously.
    expect(optionFields.map((entry) => entry.id).sort()).toEqual([
      'branch.branchType',
      'codex.model',
      'codex.promptMode',
      'codex.reasoningEffort',
      'mcp.validationStatus',
      'skill.executionMode',
      'skill.scope',
      'skill.validationStatus',
      'subAgent.memory',
      'subAgent.model',
      'subAgentFlow.memory',
      'subAgentFlow.model',
    ]);
  });

  // Section A — every offered value is accepted. The dangerous direction, and
  // the one that needs no zod introspection.
  describe.each(optionFields)('$id', ({ id, field }) => {
    it('offers a non-empty option list', () => {
      // SelectControl falls back to `meta.options ?? []`, so a field that
      // loses its options renders an empty dropdown and reports no error.
      expect(field.meta.options ?? [], `${id} renders a control with no options`).not.toHaveLength(
        0,
      );
    });

    it('offers only values its own zod accepts', () => {
      const rejected = (field.meta.options ?? []).filter(
        (option) => !field.zod.safeParse(option).success,
      );
      expect(rejected, `${id} offers value(s) its zod rejects: ${rejected.join(', ')}`).toEqual([]);
    });
  });

  // Section B — every accepted value is offered. Needs enum introspection.
  describe('the reverse direction', () => {
    const enumBacked = optionFields.filter(({ field }) => enumValuesOf(field.zod) !== undefined);

    it('reads the value set off the enum-backed fields', () => {
      // The canary for `enumValuesOf`. If a zod bump moves `_zod.def.type` or
      // `.options`, every field looks non-enum and section B silently covers
      // nothing — this fails first, and by name.
      expect(
        enumBacked.map((entry) => entry.id).sort(),
        'no enum value sets could be read — zod internals may have moved',
      ).toEqual(
        optionFields
          .map((entry) => entry.id)
          .filter((id) => id !== 'codex.model')
          .sort(),
      );
    });

    describe.each(enumBacked)('$id', ({ id, field }) => {
      it('offers exactly the values its zod enum accepts', () => {
        if (EXACT_MATCH_EXEMPTIONS[id]) return;
        const accepted = enumValuesOf(field.zod) ?? [];
        expect(sorted(field.meta.options ?? []), `${id}: offered set ≠ accepted set`).toEqual(
          sorted(accepted),
        );
      });
    });

    it('keeps the codex.model exemption justified', () => {
      // The exemption is only sound while the field really does accept
      // free text. If it ever becomes an enum, delete the allowlist entry
      // instead of carrying a now-false reason.
      const codexModel = optionFields.find((entry) => entry.id === 'codex.model');
      expect(codexModel?.field.meta.allowCustom).toBe(true);
      expect(enumValuesOf(codexModel?.field.zod as z.ZodTypeAny)).toBeUndefined();
      expect(codexModel?.field.zod.safeParse('some-unlisted-model').success).toBe(true);
    });
  });

  // Section C — the colour set, across all three of its representations. The
  // compile-time guards cover the zod ⊆ SUB_AGENT_COLORS direction only.
  describe('the sub-agent colour set', () => {
    it('the registry still exposes the known colour fields', () => {
      expect(colorFields.map((entry) => entry.id).sort()).toEqual([
        'subAgent.color',
        'subAgentFlow.color',
      ]);
    });

    it.each(colorFields)('$id accepts exactly the colours the picker offers', ({ id, field }) => {
      // Stated over the registry rather than naming the two known fields, so a
      // third colour field added later is covered without editing this test.
      // `SUB_AGENT_COLOR_VALUES` is module-private by design and is read here
      // through the registry instead of being exported for the test.
      const accepted = enumValuesOf(field.zod);
      expect(accepted, `${id}: colour field is not enum-backed`).toBeDefined();
      expect(sorted(accepted ?? []), `${id}: accepted colours ≠ SUB_AGENT_COLORS`).toEqual(
        sorted(COLOR_KEYS),
      );
    });

    it('offers every colour to both node types identically', () => {
      // The two node types keep independent copies of the list (a constant in
      // one file, an inline literal in the other), so they can drift from each
      // other even while each still satisfies the compile-time subset guard.
      const perField = colorFields.map(({ field }) => sorted(enumValuesOf(field.zod) ?? []));
      for (const values of perField) {
        expect(values).toEqual(perField[0]);
      }
    });

    it('every colour the picker renders has a hex value', () => {
      // The picker renders `Object.entries(SUB_AGENT_COLORS)`; a key with no
      // usable value paints a swatch the user cannot see.
      for (const [name, hex] of Object.entries(SUB_AGENT_COLORS)) {
        expect(hex, `SUB_AGENT_COLORS.${name}`).toMatch(/^#[0-9A-Fa-f]{6}$/);
      }
    });
  });
});
