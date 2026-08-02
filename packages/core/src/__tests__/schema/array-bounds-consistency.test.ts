import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { getArrayBounds } from '../../schema/field.js';
import type { PropertyField } from '../../schema/field.js';
import { askUserQuestionPropertySchema } from '../../schema/nodes/ask-user-question-schema.js';
import { branchPropertySchema } from '../../schema/nodes/branch-schema.js';
import { ifElsePropertySchema } from '../../schema/nodes/if-else-schema.js';
import { switchPropertySchema } from '../../schema/nodes/switch-schema.js';
import { NODE_PROPERTY_SCHEMAS } from '../../schema/node-schema-registry.js';

/**
 * Suite S1 — consistency between what the property panel's array editor
 * *offers* and what the field's own zod type *accepts*:
 *
 * | Representation      | Location                                    | Role                                  |
 * |---------------------|---------------------------------------------|---------------------------------------|
 * | `getArrayBounds`    | `packages/core/src/schema/field.ts:116`     | what the Add/Remove buttons allow     |
 * | the field's zod     | `packages/core/src/schema/nodes/`           | what `ccwf validate` actually accepts |
 *
 * If the two disagree, the array editor offers an Add or Remove the node's own
 * zod type forbids. The user clicks it, `updateNodeData` stores the array, the
 * file saves — and the workflow then fails validation for an edit the product
 * itself offered: `validateNodeSchemaFields`
 * (`packages/core/src/utils/validate-workflow.ts:257`) runs
 * `propertyField.zod.safeParse(value)` on every field present on node data, so
 * a 3-branch IfElse makes `ccwf validate` exit 1 and the MCP `apply_workflow`
 * write refused, on a workflow built entirely through the canvas UI. The
 * mirror-image break is quieter: bounds reported where none exist, so the Add
 * button never appears and a legitimate 3rd Switch case becomes unreachable
 * from the UI with nothing failing anywhere.
 *
 * `getArrayBounds` is fragile in a specific way: it reads zod's **private**
 * internals (`_zod.def.checks` and three check-kind strings). All three
 * packages declare `"zod": "^4.4.3"` — a caret range — so an ordinary lockfile
 * refresh can move the minor version with no code change here. If the shape
 * moves, the function returns `{}` for every field, silently and without a
 * type error, because every access is already typed `unknown` and
 * optional-chained.
 *
 * Section A is the load-bearing part: it relates two independently derived
 * facts (what `getArrayBounds` introspects, and what the same zod type
 * actually accepts) and fails when they disagree, whichever side is wrong.
 *
 * **Section C is deliberately a transcription** of the implementation's
 * dependency contract on zod's internals — it exists so a zod bump fails with
 * "zod renamed the check" rather than only "the branch panel disagrees with
 * its validator". Do not delete it as a transcription by mistake.
 */

/** A valid array element built from the field's own declared item columns. */
function buildItem(field: PropertyField): Record<string, string> {
  const itemFields = field.meta.itemFields ?? [];
  return Object.fromEntries(itemFields.map((column) => [column.name, 'x']));
}

/** Every registered field whose panel control is the object-array editor. */
const objectArrayFields = Object.entries(NODE_PROPERTY_SCHEMAS).flatMap(([nodeType, schema]) =>
  Object.entries(schema ?? {})
    .filter(([, field]) => field.meta.control === 'objectArray')
    .map(([fieldName, field]) => ({ id: `${nodeType}.${fieldName}`, field })),
);

describe('objectArray field bounds', () => {
  it('the registry still exposes the four known objectArray fields', () => {
    // Guards the parameterised sections below from passing vacuously if the
    // filter ever stops matching (e.g. the control name is renamed).
    expect(objectArrayFields.map((entry) => entry.id).sort()).toEqual([
      'askUserQuestion.options',
      'branch.branches',
      'ifElse.branches',
      'switch.branches',
    ]);
  });

  // Section A — reported bounds agree with what safeParse accepts.
  describe.each(objectArrayFields)('$id', ({ id, field }) => {
    const { min, max } = getArrayBounds(field.zod);

    it('accepts an array of exactly the reported minimum length', () => {
      // Doubles as the element-builder check: if buildItem stops producing a
      // valid element, this fails by name instead of the section passing
      // vacuously on rejected input.
      const items = Array.from({ length: min ?? 1 }, () => buildItem(field));
      const result = field.zod.safeParse(items);
      expect(result.success, `${id}: ${JSON.stringify(result.error?.issues)}`).toBe(true);
    });

    it('rejects one element fewer than the reported minimum', () => {
      if (min === undefined || min === 0) {
        // No lower bound reported — the empty-array case below is the guard.
        return;
      }
      const items = Array.from({ length: min - 1 }, () => buildItem(field));
      expect(field.zod.safeParse(items).success, `${id} accepted ${min - 1} items`).toBe(false);
    });

    it('accepts an empty array when no minimum is reported', () => {
      if (min !== undefined) return;
      // A getArrayBounds that dropped `.min(2)` claims no lower bound; this
      // case then contradicts it.
      expect(field.zod.safeParse([]).success, `${id} rejected an empty array`).toBe(true);
    });

    it('accepts the reported maximum and rejects one more', () => {
      if (max === undefined) return;
      const atMax = Array.from({ length: max }, () => buildItem(field));
      const overMax = Array.from({ length: max + 1 }, () => buildItem(field));
      expect(field.zod.safeParse(atMax).success, `${id} rejected ${max} items`).toBe(true);
      expect(field.zod.safeParse(overMax).success, `${id} accepted ${max + 1} items`).toBe(false);
    });

    it('accepts a long array when no maximum is reported', () => {
      if (max !== undefined) return;
      // The upper-bound half of the same trick: a dropped `.max()` claims no
      // ceiling, and this case then contradicts it.
      const items = Array.from({ length: 25 }, () => buildItem(field));
      expect(field.zod.safeParse(items).success, `${id} rejected 25 items`).toBe(true);
    });

    it('declares the item columns the editor renders', () => {
      // ObjectArrayControl iterates itemFields to render an item's columns, so
      // a field that loses it renders rows with no inputs.
      expect(field.meta.itemFields ?? []).not.toHaveLength(0);
    });
  });

  // Section B — the four production shapes, named individually, so a failure
  // says which bound shape broke and not only which field.
  describe('the production bound shapes', () => {
    it('askUserQuestion.options reports min 2 / max 4', () => {
      expect(getArrayBounds(askUserQuestionPropertySchema.options.zod)).toEqual({
        min: 2,
        max: 4,
      });
    });

    it('branch.branches reports min 2 and no maximum', () => {
      expect(getArrayBounds(branchPropertySchema.branches.zod)).toEqual({
        min: 2,
        max: undefined,
      });
    });

    it('ifElse.branches reports a fixed length of 2 (min === max)', () => {
      // The `length_equals` check kind, and the only field where
      // ObjectArrayControl's `fixedLength` hides add/remove entirely.
      expect(getArrayBounds(ifElsePropertySchema.branches.zod)).toEqual({ min: 2, max: 2 });
    });

    it('switch.branches reports min 2 / max 10', () => {
      expect(getArrayBounds(switchPropertySchema.branches.zod)).toEqual({ min: 2, max: 10 });
    });
  });

  // Section C — the zod-internals canary. A transcription on purpose: see the
  // file header.
  describe('the zod internals getArrayBounds reads', () => {
    it('still names the three check kinds the implementation switches on', () => {
      const checkKind = (zodType: z.ZodTypeAny): (string | undefined)[] => {
        const def = (zodType as { _zod?: { def?: { checks?: unknown[] } } })._zod?.def;
        return (def?.checks ?? []).map(
          (check) =>
            (check as { _zod?: { def?: { check?: string } } })._zod?.def?.check as
              | string
              | undefined,
        );
      };
      expect(checkKind(z.array(z.string()).min(1))).toEqual(['min_length']);
      expect(checkKind(z.array(z.string()).max(1))).toEqual(['max_length']);
      expect(checkKind(z.array(z.string()).length(1))).toEqual(['length_equals']);
    });

    it('reports nothing rather than throwing when there are no checks', () => {
      // Both halves of the "reports nothing" branch must stay reachable.
      expect(getArrayBounds(z.array(z.string()))).toEqual({ min: undefined, max: undefined });
      expect(getArrayBounds(z.string())).toEqual({ min: undefined, max: undefined });
    });
  });

  // Section D — pinned as observed, not as desired. Neither is a bug today;
  // both are recorded so a change to them is visible.
  describe('observed limits of getArrayBounds', () => {
    it('does not unwrap ZodOptional, so an optional array reports no bounds', () => {
      // Unreachable today — none of the four objectArray fields is optional.
      // The day one becomes optional its editor silently loses both bounds;
      // section A's empty-array case is what would catch it.
      const optional = z.array(z.object({ label: z.string() })).min(2).optional();
      expect(getArrayBounds(optional)).toEqual({ min: undefined, max: undefined });
      expect(optional.safeParse([]).success).toBe(false);
    });

    it('is not array-specific: string length checks report as bounds too', () => {
      // Harmless — the only call site passes an objectArray field's zod — but
      // the name promises otherwise, so pin it.
      expect(getArrayBounds(z.string().min(3).max(9))).toEqual({ min: 3, max: 9 });
    });
  });
});
