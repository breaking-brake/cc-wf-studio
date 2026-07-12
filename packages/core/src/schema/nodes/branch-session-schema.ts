/**
 * Branch Session node property schema (Claude Code only node type — see
 * CLAUDE_CODE_ONLY_NODE_TYPES in ../claude-code-only.ts; field-level targets
 * are therefore 'all').
 *
 * Mirrors `BranchSessionNodeData` in types/workflow-definition.ts.
 */

import { z } from 'zod';
import type { BranchSessionNodeData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

export const branchSessionPropertySchema = {
  label: field(z.string(), {
    targets: 'all',
    labelKey: 'branchSession.field.label',
    control: 'text',
    placeholderKey: 'branchSession.field.label.placeholder',
  }),
  workDescription: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'branchSession.field.workDescription',
    control: 'textarea',
    editInEditor: true,
    placeholderKey: 'branchSession.field.workDescription.placeholder',
    helpKey: 'branchSession.field.workDescription.help',
  }),
} satisfies Record<string, PropertyField>;

export type BranchSessionPropertySchema = typeof branchSessionPropertySchema;

/** zod object validator derived from {@link branchSessionPropertySchema}. */
export const branchSessionZodObject = toZodObject(branchSessionPropertySchema);

// Compile-time drift guards: schema field names must exist on BranchSessionNodeData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type BranchSessionSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof branchSessionZodObject>, keyof BranchSessionNodeData>;
export type BranchSessionSchemaValueTypesGuard = AssertAssignable<z.infer<typeof branchSessionZodObject>, Partial<BranchSessionNodeData>>;
