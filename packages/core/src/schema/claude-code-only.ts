/**
 * Node-level Claude Code exclusivity.
 *
 * Some node types rely on Claude Code-specific runtime features and have no
 * equivalent on other export targets. Exporters and UIs use these helpers to
 * warn before exporting such workflows for non-Claude-Code targets.
 */

import { NodeType, type Workflow, type WorkflowNode } from '../types/workflow-definition.js';

/** Node types that only execute on Claude Code (no equivalent on other targets). */
export const CLAUDE_CODE_ONLY_NODE_TYPES: ReadonlySet<NodeType> = new Set([
  NodeType.BranchSession,
]);

/** Returns the nodes in the list that only work on Claude Code. */
export function getClaudeCodeOnlyNodes(nodes: readonly WorkflowNode[]): WorkflowNode[] {
  return nodes.filter((node) => CLAUDE_CODE_ONLY_NODE_TYPES.has(node.type));
}

/** Returns true when the workflow contains at least one Claude Code-only node. */
export function workflowContainsClaudeCodeOnlyNodes(workflow: Workflow): boolean {
  return getClaudeCodeOnlyNodes(workflow.nodes).length > 0;
}

/**
 * Human-readable descriptions of the Claude Code-only nodes in a workflow,
 * e.g. `"Checkpoint A" (branchSession)`. Prefers the node's canvas display
 * label (`data.label`), then its name, then its id. Used by exporters and
 * UIs to name the exact nodes in target-compatibility warnings.
 */
export function describeClaudeCodeOnlyNodes(workflow: Workflow): string[] {
  return getClaudeCodeOnlyNodes(workflow.nodes).map((node) => {
    const label = (node.data as { label?: unknown }).label;
    const display =
      [label, node.name].find((v): v is string => typeof v === 'string' && v.trim().length > 0) ??
      node.id;
    return `"${display.trim()}" (${node.type})`;
  });
}
