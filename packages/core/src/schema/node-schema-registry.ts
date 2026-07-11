/**
 * Node property schema registry.
 *
 * Maps node types to their schema-driven property definitions under
 * `./nodes/`. Consumed by the webview property panel (rendering), export
 * warning derivation, and (later) the workflow validator, so all three read
 * the same single definition per node.
 *
 * Adding a field to a node type = edit its `nodes/<type>-schema.ts` + add the
 * `<nodeType>.field.<name>` label to the five webview locale files. If AI
 * agents should author the field too, also describe it in
 * `resources/workflow-schema.json` (hand-tuned AI-authoring guide — NOT
 * generated from these schemas by design).
 *
 * Node types absent from this registry (start/end: no editable fields) keep
 * their non-schema panel rendering.
 */

import { NodeType } from '../types/workflow-definition.js';
import type { PropertySchema } from './field.js';
import { subAgentPropertySchema } from './nodes/sub-agent-schema.js';

/** Property schemas for the node types migrated to the schema-driven model. */
export const NODE_PROPERTY_SCHEMAS: Partial<Record<NodeType, PropertySchema>> = {
  [NodeType.SubAgent]: subAgentPropertySchema,
};

/**
 * Pure per-node normalizers applied to every field patch before it is
 * persisted (outputPorts sync, dependent-field resets, ...). A node type
 * without an entry persists patches as-is.
 */
export type DeriveUpdateFn = (
  data: Record<string, unknown>,
  patch: Record<string, unknown>,
) => Record<string, unknown>;

export const NODE_DERIVE_FNS: Partial<Record<NodeType, DeriveUpdateFn>> = {};
