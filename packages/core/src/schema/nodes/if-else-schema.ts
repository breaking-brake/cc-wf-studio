/**
 * IfElse node property schema (fixed 2-way branch).
 *
 * Mirrors `IfElseNodeData` in types/workflow-definition.ts. `.length(2)` on
 * branches makes the array editor render without add/remove controls
 * (min === max).
 */

import { z } from 'zod';
import { field, type PropertyField, toZodObject } from '../field.js';

const ifElseConditionZod = z.object({
  id: z.string().optional(),
  label: z.string(),
  condition: z.string(),
});

export const ifElsePropertySchema = {
  evaluationTarget: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'ifElse.field.evaluationTarget',
    control: 'text',
    placeholderKey: 'ifElse.field.evaluationTarget.placeholder',
    helpKey: 'ifElse.field.evaluationTarget.help',
  }),
  branches: field(z.array(ifElseConditionZod).length(2), {
    targets: 'all',
    labelKey: 'ifElse.field.branches',
    control: 'objectArray',
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

export type IfElsePropertySchema = typeof ifElsePropertySchema;

/** zod object validator derived from {@link ifElsePropertySchema}. */
export const ifElseZodObject = toZodObject(ifElsePropertySchema);

/** Normalize an IfElse field patch: outputPorts is always 2. */
export function deriveIfElseUpdate(
  _data: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if ('branches' in patch) {
    return { ...patch, outputPorts: 2 };
  }
  return patch;
}
