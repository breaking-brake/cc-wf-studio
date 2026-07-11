/**
 * Branch Session node property schema (Claude Code only node type — see
 * CLAUDE_CODE_ONLY_NODE_TYPES in ../claude-code-only.ts; field-level targets
 * are therefore 'all').
 *
 * Mirrors `BranchSessionNodeData` in types/workflow-definition.ts.
 */

import { z } from 'zod';
import { field, type PropertyField, toZodObject } from '../field.js';

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
