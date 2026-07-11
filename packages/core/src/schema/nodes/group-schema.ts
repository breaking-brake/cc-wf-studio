/**
 * Group node property schema.
 *
 * Groups are layout-only containers; `label` is the only editable property.
 * The child-node list/navigation stays a webview Footer slot.
 */

import { z } from 'zod';
import { field, type PropertyField, toZodObject } from '../field.js';

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
