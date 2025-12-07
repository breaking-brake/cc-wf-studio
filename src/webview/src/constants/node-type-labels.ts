/**
 * Node type labels for PropertyPanel
 *
 * These are technical terms that don't need translation.
 * They are consistent across all languages.
 */

export const NODE_TYPE_LABELS: Record<string, string> = {
  subAgent: 'Sub-Agent',
  subAgentFlow: 'Sub-Agent Flow',
  askUserQuestion: 'Ask User Question',
  branch: 'Branch',
  ifElse: 'If/Else',
  switch: 'Switch',
  prompt: 'Prompt',
  start: 'Start',
  end: 'End',
  skill: 'Skill',
  mcp: 'MCP Tool',
} as const;

export const NODE_TYPE_UNKNOWN = 'Unknown';

/**
 * Get the label for a node type
 * @param nodeType - The node type string (can be undefined)
 * @returns The label for the node type, or 'Unknown' if not found
 */
export const getNodeTypeLabel = (nodeType: string | undefined): string => {
  if (!nodeType) return NODE_TYPE_UNKNOWN;
  return NODE_TYPE_LABELS[nodeType] ?? NODE_TYPE_UNKNOWN;
};
