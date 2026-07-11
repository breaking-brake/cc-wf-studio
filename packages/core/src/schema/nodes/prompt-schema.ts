/**
 * Prompt node property schema.
 *
 * Mirrors `PromptNodeData` in types/workflow-definition.ts. `variables` is a
 * runtime-populated map (no `control`): validated and target-scoped but never
 * rendered by the generic panel — the detected-variables display derives from
 * `prompt` in the webview Footer slot instead.
 */

import { z } from 'zod';
import { field, type PropertyField, toZodObject } from '../field.js';

export const promptPropertySchema = {
  label: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'prompt.field.label',
    control: 'text',
    placeholderKey: 'prompt.field.label.placeholder',
  }),
  prompt: field(z.string(), {
    targets: 'all',
    labelKey: 'prompt.field.prompt',
    control: 'textarea',
    editInEditor: true,
    placeholderKey: 'prompt.field.prompt.placeholder',
    helpKey: 'prompt.field.prompt.help',
  }),
  variables: field(z.record(z.string(), z.string()).optional(), {
    targets: 'all',
    labelKey: 'prompt.field.variables',
  }),
} satisfies Record<string, PropertyField>;

export type PromptPropertySchema = typeof promptPropertySchema;

/** zod object validator derived from {@link promptPropertySchema}. */
export const promptZodObject = toZodObject(promptPropertySchema);
