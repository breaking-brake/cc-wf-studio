/**
 * Group node property schema.
 *
 * Groups are layout-only containers; `label` is the only editable property.
 * The child-node list/navigation stays a webview Footer slot.
 */

import { z } from 'zod';
import type { GroupNodeData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

export const groupPropertySchema = {
  label: field(z.string(), {
    targets: 'all',
    labelKey: 'group.field.label',
    control: 'text',
    placeholderKey: 'group.field.label.placeholder',
  }),
} satisfies Record<string, PropertyField>;

export type GroupPropertySchema = typeof groupPropertySchema;

/** zod object validator derived from {@link groupPropertySchema}. */
export const groupZodObject = toZodObject(groupPropertySchema);

// Compile-time drift guards: schema field names must exist on GroupNodeData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type GroupSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof groupZodObject>, keyof GroupNodeData>;
export type GroupSchemaValueTypesGuard = AssertAssignable<z.infer<typeof groupZodObject>, Partial<GroupNodeData>>;
