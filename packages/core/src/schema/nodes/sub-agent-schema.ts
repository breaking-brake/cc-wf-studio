/**
 * SubAgent node property schema (issue #803).
 *
 * The first node type migrated to the schema-driven property model.
 * `model`/`tools`/`memory`/`color`/`builtInType` are Claude Code-only and
 * scoped to `['claudeCode']`; everything else applies to every target. The UI
 * renders its property panel from this schema and exporters derive "ignored by
 * target X" warnings from it (see {@link ../warnings.js}).
 *
 * Mirrors `SubAgentData` in types/workflow-definition.ts. The derived
 * {@link SubAgentSchemaShape} should stay assignable to `SubAgentData`; this is
 * intentionally NOT enforced with `satisfies` yet (structural-validation reuse
 * is a follow-up — see the plan's "Validation (minimal)" section).
 */

import { z } from 'zod';
import type { SubAgentData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

export const SUB_AGENT_MODEL_VALUES = ['sonnet', 'opus', 'haiku', 'fable', 'inherit'] as const;
export type SubAgentModel = (typeof SUB_AGENT_MODEL_VALUES)[number];

/** Models that exist only in Claude Code; exporters for other providers omit them. */
export const CC_ONLY_MODELS: readonly SubAgentModel[] = ['haiku', 'fable'];

const SUB_AGENT_COLOR_VALUES = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
  'pink',
  'cyan',
] as const;

const isBuiltIn = (data: Record<string, unknown>) => !!data.builtInType;

export const subAgentPropertySchema = {
  description: field(z.string(), {
    targets: 'all',
    labelKey: 'subAgent.field.description',
    control: 'textarea',
  }),
  agentDefinition: field(z.string(), {
    targets: 'all',
    labelKey: 'subAgent.field.agentDefinition',
    control: 'textarea',
  }),
  prompt: field(z.string(), {
    targets: 'all',
    labelKey: 'subAgent.field.prompt',
    control: 'textarea',
  }),
  // Retained for backward compatibility; no longer rendered — settings are
  // grouped per agent into sections instead of toggled by agentType.
  agentType: field(z.enum(['claudeCode', 'other']).optional(), {
    targets: 'all',
    labelKey: 'subAgent.field.agentType',
  }),
  model: field(z.enum(SUB_AGENT_MODEL_VALUES).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.model',
    control: 'select',
    options: SUB_AGENT_MODEL_VALUES,
    sectionKey: 'claudeCode',
    readonlyWhen: isBuiltIn,
    readonlyHintKey: 'subAgent.builtIn.controlledByPreset',
  }),
  tools: field(z.string().optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.tools',
    control: 'tools',
    sectionKey: 'claudeCode',
    readonlyWhen: isBuiltIn,
    readonlyHintKey: 'subAgent.builtIn.controlledByPreset',
  }),
  memory: field(z.enum(['user', 'project', 'local']).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.memory',
    control: 'select',
    options: ['user', 'project', 'local'],
    sectionKey: 'claudeCode',
    visibleWhen: (data) => !isBuiltIn(data),
  }),
  color: field(z.enum(SUB_AGENT_COLOR_VALUES).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.color',
    control: 'color',
    sectionKey: 'claudeCode',
    visibleWhen: (data) => !isBuiltIn(data),
  }),
  builtInType: field(z.enum(['general-purpose', 'explore', 'plan']).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.builtInType',
  }),
} satisfies Record<string, PropertyField>;

export type SubAgentPropertySchema = typeof subAgentPropertySchema;

/** zod object validator derived from {@link subAgentPropertySchema}. */
export const subAgentZodObject = toZodObject(subAgentPropertySchema);

/** Inferred shape of the validated SubAgent property set. */
export type SubAgentSchemaShape = z.infer<typeof subAgentZodObject>;

// Compile-time drift guards: schema field names must exist on SubAgentData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type SubAgentSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof subAgentZodObject>, keyof SubAgentData>;
export type SubAgentSchemaValueTypesGuard = AssertAssignable<z.infer<typeof subAgentZodObject>, Partial<SubAgentData>>;
