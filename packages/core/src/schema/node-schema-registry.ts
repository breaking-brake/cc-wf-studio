/**
 * Node property schema registry.
 *
 * Maps node types to their schema-driven property definitions under
 * `./nodes/`. Consumed by the webview property panel (rendering), export
 * warning derivation (warnings.ts), and the workflow validator
 * (validate-workflow.ts: present fields are checked against their zod types;
 * fields whose `visibleWhen` fails are skipped as inactive), so all three
 * read the same single definition per node.
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
import {
  askUserQuestionPropertySchema,
  deriveAskUserQuestionUpdate,
} from './nodes/ask-user-question-schema.js';
import { branchPropertySchema, deriveBranchUpdate } from './nodes/branch-schema.js';
import { branchSessionPropertySchema } from './nodes/branch-session-schema.js';
import { codexPropertySchema } from './nodes/codex-schema.js';
import { groupPropertySchema } from './nodes/group-schema.js';
import { deriveIfElseUpdate, ifElsePropertySchema } from './nodes/if-else-schema.js';
import { mcpPropertySchema } from './nodes/mcp-schema.js';
import { promptPropertySchema } from './nodes/prompt-schema.js';
import { skillPropertySchema } from './nodes/skill-schema.js';
import { subAgentFlowPropertySchema } from './nodes/sub-agent-flow-schema.js';
import { subAgentPropertySchema } from './nodes/sub-agent-schema.js';
import { deriveSwitchUpdate, switchPropertySchema } from './nodes/switch-schema.js';

/** Property schemas for the node types migrated to the schema-driven model. */
export const NODE_PROPERTY_SCHEMAS: Partial<Record<NodeType, PropertySchema>> = {
  [NodeType.SubAgent]: subAgentPropertySchema,
  [NodeType.Prompt]: promptPropertySchema,
  [NodeType.BranchSession]: branchSessionPropertySchema,
  [NodeType.Codex]: codexPropertySchema,
  [NodeType.Group]: groupPropertySchema,
  [NodeType.AskUserQuestion]: askUserQuestionPropertySchema,
  [NodeType.Branch]: branchPropertySchema,
  [NodeType.IfElse]: ifElsePropertySchema,
  [NodeType.Switch]: switchPropertySchema,
  [NodeType.Skill]: skillPropertySchema,
  [NodeType.Mcp]: mcpPropertySchema,
  [NodeType.SubAgentFlow]: subAgentFlowPropertySchema,
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

export const NODE_DERIVE_FNS: Partial<Record<NodeType, DeriveUpdateFn>> = {
  [NodeType.AskUserQuestion]: deriveAskUserQuestionUpdate,
  [NodeType.Branch]: deriveBranchUpdate,
  [NodeType.IfElse]: deriveIfElseUpdate,
  [NodeType.Switch]: deriveSwitchUpdate,
};
