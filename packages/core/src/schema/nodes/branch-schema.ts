/**
 * Branch node property schema (legacy 2-in-1 node: conditional or switch).
 *
 * Mirrors `BranchNodeData` in types/workflow-definition.ts. Branches drive
 * output ports; switching to 'conditional' trims to two branches — both
 * handled by {@link deriveBranchUpdate}.
 */

import { z } from 'zod';
import type { BranchNodeData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

const branchConditionZod = z.object({
  id: z.string().optional(),
  label: z.string(),
  condition: z.string(),
});

export const branchPropertySchema = {
  branchType: field(z.enum(['conditional', 'switch']), {
    targets: 'all',
    labelKey: 'branch.field.branchType',
    control: 'select',
    options: ['conditional', 'switch'],
  }),
  branches: field(z.array(branchConditionZod).min(2), {
    targets: 'all',
    labelKey: 'branch.field.branches',
    control: 'objectArray',
    helpKey: 'property.minimumBranches',
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

export type BranchPropertySchema = typeof branchPropertySchema;

/** zod object validator derived from {@link branchPropertySchema}. */
export const branchZodObject = toZodObject(branchPropertySchema);

/**
 * Normalize a Branch field patch: switching to 'conditional' trims branches
 * to two; branch add/remove syncs outputPorts to the branch count.
 */
export function deriveBranchUpdate(
  data: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if ('branchType' in patch) {
    const branches = Array.isArray(data.branches) ? data.branches : [];
    if (patch.branchType === 'conditional' && branches.length > 2) {
      return { ...patch, branches: branches.slice(0, 2), outputPorts: 2 };
    }
    return patch;
  }
  if ('branches' in patch && Array.isArray(patch.branches)) {
    return { ...patch, outputPorts: patch.branches.length };
  }
  return patch;
}

// Compile-time drift guards: schema field names must exist on BranchNodeData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type BranchSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof branchZodObject>, keyof BranchNodeData>;
export type BranchSchemaValueTypesGuard = AssertAssignable<z.infer<typeof branchZodObject>, Partial<BranchNodeData>>;
