/**
 * Codex Agent node property schema.
 *
 * Mirrors `CodexNodeData` in types/workflow-definition.ts. `sandbox` is
 * declared data-only (no `control`): its UI is an enable-checkbox +
 * mode-select composite that stays a custom control in the webview
 * (`codex-panel.tsx`), grouped under the 'advanced' section.
 *
 * `label` is optional here although `CodexNodeData.label` is required: the
 * panel clears an emptied label to `undefined` so the canvas falls back to
 * the node id (legacy behavior, kept as-is).
 */

import { z } from 'zod';
import type { CodexNodeData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

/** Predefined Codex model choices; the UI select also allows a custom name. */
export const CODEX_PREDEFINED_MODELS = [
  'gpt-5.2-codex',
  'gpt-5.2',
  'gpt-5.1-codex-max',
  'gpt-5.1-codex-mini',
] as const;

export const CODEX_SANDBOX_MODES = ['read-only', 'workspace-write', 'danger-full-access'] as const;

export const codexPropertySchema = {
  label: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'codex.field.label',
    control: 'text',
    helpKey: 'codex.field.label.help',
  }),
  promptMode: field(z.enum(['fixed', 'ai-generated']), {
    targets: 'all',
    labelKey: 'codex.field.promptMode',
    control: 'radio',
    options: ['fixed', 'ai-generated'],
  }),
  prompt: field(z.string(), {
    targets: 'all',
    labelKey: 'codex.field.prompt',
    control: 'textarea',
    editInEditor: true,
    placeholderKey: 'codex.field.prompt.placeholder',
  }),
  model: field(z.string(), {
    targets: 'all',
    labelKey: 'codex.field.model',
    control: 'select',
    options: CODEX_PREDEFINED_MODELS,
    allowCustom: true,
  }),
  reasoningEffort: field(z.enum(['low', 'medium', 'high']), {
    targets: 'all',
    labelKey: 'codex.field.reasoningEffort',
    control: 'select',
    options: ['low', 'medium', 'high'],
  }),
  skipGitRepoCheck: field(z.boolean().optional(), {
    targets: 'all',
    labelKey: 'codex.field.skipGitRepoCheck',
    control: 'checkbox',
  }),
  sandbox: field(z.enum(CODEX_SANDBOX_MODES).optional(), {
    targets: 'all',
    labelKey: 'codex.field.sandbox',
    sectionKey: 'advanced',
  }),
} satisfies Record<string, PropertyField>;

export type CodexPropertySchema = typeof codexPropertySchema;

/** zod object validator derived from {@link codexPropertySchema}. */
export const codexZodObject = toZodObject(codexPropertySchema);

// Compile-time drift guards: schema field names must exist on CodexNodeData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type CodexSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof codexZodObject>, keyof CodexNodeData>;
export type CodexSchemaValueTypesGuard = AssertAssignable<z.infer<typeof codexZodObject>, Partial<CodexNodeData>>;
