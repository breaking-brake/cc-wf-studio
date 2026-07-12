/**
 * Switch node property schema (multi-way branch with a fixed default).
 *
 * Mirrors `SwitchNodeData` in types/workflow-definition.ts. The default
 * branch renders read-only (`itemReadonlyWhen`) and must stay last —
 * {@link deriveSwitchUpdate} re-orders after any branches change, so the
 * editor can simply append new cases. Bounds: 1–9 regular cases + 1 default
 * (`.min(2).max(10)` total).
 */

import { z } from 'zod';
import type { SwitchNodeData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

const switchConditionZod = z.object({
  id: z.string().optional(),
  label: z.string(),
  condition: z.string(),
  isDefault: z.boolean().optional(),
});

export const switchPropertySchema = {
  evaluationTarget: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'switch.field.evaluationTarget',
    control: 'text',
    placeholderKey: 'switch.field.evaluationTarget.placeholder',
    helpKey: 'switch.field.evaluationTarget.help',
  }),
  branches: field(z.array(switchConditionZod).min(2).max(10), {
    targets: 'all',
    labelKey: 'switch.field.branches',
    control: 'objectArray',
    helpKey: 'property.minimumBranches',
    itemReadonlyWhen: (item) => !!item.isDefault,
    itemFields: [
      {
        name: 'label',
        control: 'text',
        labelKey: 'property.branchLabel',
        placeholderKey: 'property.branchLabel.placeholder',
      },
      {
        name: 'condition',
        control: 'textarea',
        labelKey: 'property.branchCondition',
        placeholderKey: 'property.branchCondition.placeholder',
      },
    ],
  }),
} satisfies Record<string, PropertyField>;

export type SwitchPropertySchema = typeof switchPropertySchema;

/** zod object validator derived from {@link switchPropertySchema}. */
export const switchZodObject = toZodObject(switchPropertySchema);

/**
 * Normalize a Switch field patch: keep default branch(es) last and sync
 * outputPorts to the branch count.
 */
export function deriveSwitchUpdate(
  _data: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if ('branches' in patch && Array.isArray(patch.branches)) {
    const branches = patch.branches as { isDefault?: boolean }[];
    const regular = branches.filter((b) => !b.isDefault);
    const defaults = branches.filter((b) => b.isDefault);
    const ordered = [...regular, ...defaults];
    return { ...patch, branches: ordered, outputPorts: ordered.length };
  }
  return patch;
}

// Compile-time drift guards: schema field names must exist on SwitchNodeData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type SwitchSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof switchZodObject>, keyof SwitchNodeData>;
export type SwitchSchemaValueTypesGuard = AssertAssignable<z.infer<typeof switchZodObject>, Partial<SwitchNodeData>>;
