/**
 * Workflow problems collection
 *
 * Serializes the current canvas state and runs core's
 * validateAIGeneratedWorkflow — the same validator the MCP server and
 * `ccwf validate` use — returning every issue at once, tagged with the
 * offending node's id where the error is node-scoped.
 */

import {
  type SlashCommandOptions,
  type SubAgentFlow,
  validateAIGeneratedWorkflow,
} from '@cc-wf-studio/core';
import type { Edge, Node } from 'reactflow';
import { serializeWorkflow } from '../services/workflow-service';

export interface WorkflowIssue {
  /** Stable list key */
  key: string;
  code: string;
  message: string;
  /** Set when the issue points at a node currently on the canvas */
  nodeId: string | null;
}

/** Node-scoped errors carry a field like `nodes[<id>]` or `nodes[<id>].data.foo` */
const NODE_FIELD_PATTERN = /^nodes\[(.+?)\]/;

export function collectWorkflowIssues(
  nodes: Node[],
  edges: Edge[],
  workflowName: string,
  workflowDescription?: string,
  subAgentFlows?: SubAgentFlow[],
  slashCommandOptions?: SlashCommandOptions
): WorkflowIssue[] {
  const workflow = serializeWorkflow(
    nodes,
    edges,
    workflowName,
    workflowDescription,
    undefined,
    subAgentFlows,
    slashCommandOptions
  );
  const result = validateAIGeneratedWorkflow(workflow);
  const canvasNodeIds = new Set(nodes.map((n) => n.id));
  return result.errors.map((error, index) => {
    const match = error.field ? NODE_FIELD_PATTERN.exec(error.field) : null;
    const nodeId = match && canvasNodeIds.has(match[1]) ? match[1] : null;
    return {
      key: `${error.code}:${error.field ?? ''}:${index}`,
      code: error.code,
      message: error.message,
      nodeId,
    };
  });
}
