/**
 * AskUserQuestion node property schema.
 *
 * Mirrors `AskUserQuestionData` in types/workflow-definition.ts. `options`
 * drives the node's output ports, so every field patch flows through
 * {@link deriveAskUserQuestionUpdate} before persisting.
 *
 * Note: `options` declares `.min(2).max(4)` for the editor UI (add/remove
 * bounds), but AI-suggestions mode legitimately stores an empty array —
 * matching legacy behavior. Wiring this validator (Phase 4) must account for
 * that (e.g. only validate options when useAiSuggestions is false).
 */

import { z } from 'zod';
import type { AskUserQuestionData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

const questionOptionZod = z.object({
  id: z.string().optional(),
  label: z.string(),
  description: z.string(),
});

export const askUserQuestionPropertySchema = {
  questionText: field(z.string(), {
    targets: 'all',
    labelKey: 'askUserQuestion.field.questionText',
    control: 'textarea',
    editInEditor: true,
  }),
  multiSelect: field(z.boolean().optional(), {
    targets: 'all',
    labelKey: 'askUserQuestion.field.multiSelect',
    control: 'checkbox',
  }),
  useAiSuggestions: field(z.boolean().optional(), {
    targets: 'all',
    labelKey: 'askUserQuestion.field.useAiSuggestions',
    control: 'checkbox',
  }),
  options: field(z.array(questionOptionZod).min(2).max(4), {
    targets: 'all',
    labelKey: 'askUserQuestion.field.options',
    control: 'objectArray',
    visibleWhen: (data) => !data.useAiSuggestions,
    itemFields: [
      { name: 'label', control: 'text', placeholderKey: 'property.optionLabel.placeholder' },
      {
        name: 'description',
        control: 'text',
        placeholderKey: 'property.optionDescription.placeholder',
      },
    ],
  }),
} satisfies Record<string, PropertyField>;

export type AskUserQuestionPropertySchema = typeof askUserQuestionPropertySchema;

/** zod object validator derived from {@link askUserQuestionPropertySchema}. */
export const askUserQuestionZodObject = toZodObject(askUserQuestionPropertySchema);

/**
 * Normalize an AskUserQuestion field patch (legacy panel behavior, verbatim):
 * - toggling AI suggestions forces a single output port and clears options
 *   when enabling (disabling keeps whatever options are stored — it does NOT
 *   restore defaults)
 * - toggling multiSelect switches between 1 port and one port per option
 * - changing options syncs outputPorts to the option count
 */
export function deriveAskUserQuestionUpdate(
  data: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  if ('useAiSuggestions' in patch) {
    const enabled = !!patch.useAiSuggestions;
    const options = Array.isArray(data.options) ? data.options : [];
    return { ...patch, outputPorts: 1, options: enabled ? [] : options };
  }
  if ('multiSelect' in patch) {
    const options = Array.isArray(data.options) ? data.options : [];
    return { ...patch, outputPorts: patch.multiSelect ? 1 : options.length };
  }
  if ('options' in patch && Array.isArray(patch.options)) {
    return { ...patch, outputPorts: patch.options.length };
  }
  return patch;
}

// Compile-time drift guards: schema field names must exist on AskUserQuestionData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type AskUserQuestionSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof askUserQuestionZodObject>, keyof AskUserQuestionData>;
export type AskUserQuestionSchemaValueTypesGuard = AssertAssignable<z.infer<typeof askUserQuestionZodObject>, Partial<AskUserQuestionData>>;
