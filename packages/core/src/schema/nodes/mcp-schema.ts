/**
 * MCP node property schema (read-only summary panel).
 *
 * Mirrors `McpNodeData` in types/mcp-node.ts. The dynamic parts (recursive
 * tool `parameters`, per-mode config objects, `parameterValues`) are declared
 * data-only — their zod types stay permissive and their summary renderings
 * are custom controls in the webview panel; the parameter editor itself is
 * McpNodeEditDialog. Field visibility follows the node's `mode`
 * ('manualParameterConfig' by default, for backward compatibility).
 */

import { z } from 'zod';
import type { McpNodeData } from '../../types/mcp-node.js';
import { type AssertAssignable, field, type PropertyField, toZodObject } from '../field.js';

export const MCP_NODE_MODES = [
  'manualParameterConfig',
  'aiParameterConfig',
  'aiToolSelection',
] as const;

/** The node's effective mode. Missing or unrecognized values fall back to
 *  'manualParameterConfig' (the backward-compatibility default). */
export function mcpModeOf(data: Record<string, unknown>): (typeof MCP_NODE_MODES)[number] {
  const mode = data.mode;
  return MCP_NODE_MODES.includes(mode as (typeof MCP_NODE_MODES)[number])
    ? (mode as (typeof MCP_NODE_MODES)[number])
    : 'manualParameterConfig';
}

const hasToolInfo = (data: Record<string, unknown>) => mcpModeOf(data) !== 'aiToolSelection';

export const mcpPropertySchema = {
  serverId: field(z.string(), {
    targets: 'all',
    labelKey: 'mcp.field.serverId',
    control: 'text',
  }),
  toolName: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'mcp.field.toolName',
    control: 'text',
    visibleWhen: (data) => hasToolInfo(data) && !!data.toolName,
  }),
  toolDescription: field(z.string().optional(), {
    targets: 'all',
    labelKey: 'mcp.field.toolDescription',
    control: 'text',
    visibleWhen: (data) => hasToolInfo(data) && !!data.toolDescription,
  }),
  validationStatus: field(z.enum(['valid', 'missing', 'invalid']), {
    targets: 'all',
    labelKey: 'mcp.field.validationStatus',
    control: 'select',
    options: ['valid', 'missing', 'invalid'],
  }),
  // Data-only fields: rendered by custom controls in the webview panel.
  parameters: field(z.array(z.unknown()).optional(), {
    targets: 'all',
    labelKey: 'mcp.field.parameters',
    visibleWhen: (data) => hasToolInfo(data) && Array.isArray(data.parameters),
  }),
  mode: field(z.enum(MCP_NODE_MODES).optional(), {
    targets: 'all',
    labelKey: 'mcp.field.mode',
  }),
  aiToolSelectionConfig: field(z.record(z.string(), z.unknown()).optional(), {
    targets: 'all',
    labelKey: 'mcp.field.aiToolSelectionConfig',
    visibleWhen: (data) =>
      mcpModeOf(data) === 'aiToolSelection' &&
      !!(data.aiToolSelectionConfig as { taskDescription?: string } | undefined)?.taskDescription,
  }),
  aiParameterConfig: field(z.record(z.string(), z.unknown()).optional(), {
    targets: 'all',
    labelKey: 'mcp.field.aiParameterConfig',
    visibleWhen: (data) =>
      mcpModeOf(data) === 'aiParameterConfig' &&
      !!(data.aiParameterConfig as { description?: string } | undefined)?.description,
  }),
  parameterValues: field(z.record(z.string(), z.unknown()).optional(), {
    targets: 'all',
    labelKey: 'mcp.field.parameterValues',
    visibleWhen: (data) =>
      mcpModeOf(data) === 'manualParameterConfig' &&
      Object.keys((data.parameterValues as Record<string, unknown> | undefined) ?? {}).length > 0,
  }),
} satisfies Record<string, PropertyField>;

export type McpPropertySchema = typeof mcpPropertySchema;

/** zod object validator derived from {@link mcpPropertySchema}. */
export const mcpZodObject = toZodObject(mcpPropertySchema);

// Compile-time drift guards: schema field names must exist on McpNodeData and
// declared value types must stay assignable to the interface. Permissive
// data-only fields (parameters, aiToolSelectionConfig, aiParameterConfig, parameterValues) are exempt — their zod types are
// intentionally looser than the interface (custom-rendered, dialog-edited).
export type McpSchemaFieldNamesGuard = AssertAssignable<keyof z.infer<typeof mcpZodObject>, keyof McpNodeData>;
export type McpSchemaValueTypesGuard = AssertAssignable<Omit<z.infer<typeof mcpZodObject>, 'parameters' | 'aiToolSelectionConfig' | 'aiParameterConfig' | 'parameterValues'>, Partial<Omit<McpNodeData, 'parameters' | 'aiToolSelectionConfig' | 'aiParameterConfig' | 'parameterValues'>>>;
