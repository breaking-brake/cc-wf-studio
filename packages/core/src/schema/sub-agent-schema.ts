/**
 * SubAgent node property schema (issue #803).
 *
 * The first — and, for this branch, only — node type migrated to the
 * schema-driven property model. `model`/`tools`/`memory`/`color`/`builtInType`
 * are Claude Code-only and scoped to `['claudeCode']`; everything else applies
 * to every target. The UI scopes fields from this schema and exporters derive
 * "ignored by target X" warnings from it (see {@link ./warnings.js}).
 *
 * Mirrors `SubAgentData` in types/workflow-definition.ts. The derived
 * {@link SubAgentSchemaShape} should stay assignable to `SubAgentData`; this is
 * intentionally NOT enforced with `satisfies` yet (structural-validation reuse
 * is a follow-up — see the plan's "Validation (minimal)" section).
 */

import { z } from 'zod';
import { field, type PropertyField, toZodObject } from './field.js';

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
  agentType: field(z.enum(['claudeCode', 'other']).optional(), {
    targets: 'all',
    labelKey: 'subAgent.field.agentType',
    control: 'select',
    options: ['claudeCode', 'other'],
  }),
  model: field(z.enum(['sonnet', 'opus', 'haiku', 'inherit']).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.model',
    control: 'select',
    options: ['sonnet', 'opus', 'haiku', 'inherit'],
    controlledByBuiltIn: true,
  }),
  tools: field(z.string().optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.tools',
    control: 'tools',
    controlledByBuiltIn: true,
  }),
  memory: field(z.enum(['user', 'project', 'local']).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.memory',
    control: 'select',
    options: ['user', 'project', 'local'],
  }),
  color: field(z.enum(SUB_AGENT_COLOR_VALUES).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgent.field.color',
    control: 'color',
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
