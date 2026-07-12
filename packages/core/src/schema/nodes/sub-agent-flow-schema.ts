/**
 * Sub-Agent Flow reference node property schema.
 *
 * Mirrors `SubAgentFlowNodeData` in types/workflow-definition.ts. The
 * Claude Code execution settings (model/memory/tools/color) are editable in
 * the panel and scoped to `['claudeCode']` like their SubAgent counterparts;
 * the linked-flow info/navigation stays a webview Header slot.
 */

import { z } from 'zod';
import type { SubAgentFlowNodeData } from '../../types/workflow-definition.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';
import { SUB_AGENT_MODEL_VALUES } from './sub-agent-schema.js';

export const subAgentFlowPropertySchema = {
  subAgentFlowId: field(z.string(), {
    targets: 'all',
    labelKey: 'subAgentFlow.field.subAgentFlowId',
  }),
  label: field(z.string(), {
    targets: 'all',
    labelKey: 'subAgentFlow.field.label',
  }),
  description: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'subAgentFlow.field.description',
  }),
  model: field(z.enum(SUB_AGENT_MODEL_VALUES).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgentFlow.field.model',
    control: 'select',
    options: SUB_AGENT_MODEL_VALUES,
  }),
  memory: field(z.enum(['user', 'project', 'local']).optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgentFlow.field.memory',
    control: 'select',
    options: ['user', 'project', 'local'],
  }),
  tools: field(z.string().optional(), {
    targets: ['claudeCode'],
    labelKey: 'subAgentFlow.field.tools',
    control: 'text',
    placeholderKey: 'subAgentFlow.field.tools.placeholder',
    helpKey: 'subAgentFlow.field.tools.help',
  }),
  color: field(
    z.enum(['red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan']).optional(),
    {
      targets: ['claudeCode'],
      labelKey: 'subAgentFlow.field.color',
      control: 'color',
    },
  ),
} satisfies Record<string, PropertyField>;

export type SubAgentFlowPropertySchema = typeof subAgentFlowPropertySchema;

/** zod object validator derived from {@link subAgentFlowPropertySchema}. */
export const subAgentFlowZodObject = toZodObject(subAgentFlowPropertySchema);

// Compile-time drift guards: schema field names must exist on SubAgentFlowNodeData and
// declared value types must stay assignable to the interface (optionality may
// be looser in the schema; see each field's comment).
export type SubAgentFlowSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof subAgentFlowZodObject>, keyof SubAgentFlowNodeData>;
export type SubAgentFlowSchemaValueTypesGuard = AssertAssignable<z.infer<typeof subAgentFlowZodObject>, Partial<SubAgentFlowNodeData>>;
