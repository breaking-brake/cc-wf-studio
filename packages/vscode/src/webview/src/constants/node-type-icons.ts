/**
 * Node type icon mapping
 *
 * Maps each NodeType to a lucide-react icon component.
 */

import type { LucideIcon } from 'lucide-react';
import {
  Bot,
  GitBranch,
  GitFork,
  MessageSquare,
  Play,
  Plug,
  ShieldQuestion,
  Square,
  SquareDashed,
  Terminal,
  Zap,
} from 'lucide-react';

export const NODE_TYPE_ICONS: Record<string, LucideIcon> = {
  start: Play,
  end: Square,
  prompt: MessageSquare,
  subAgent: Bot,
  subAgentFlow: Bot,
  codex: Terminal,
  skill: Zap,
  mcp: Plug,
  ifElse: GitBranch,
  switch: GitFork,
  askUserQuestion: ShieldQuestion,
  branch: GitBranch,
  group: SquareDashed,
} as const;

/**
 * Get the icon component for a node type
 * @param nodeType - The node type string
 * @returns The LucideIcon component, or undefined if not found
 */
export const getNodeTypeIcon = (nodeType: string | undefined): LucideIcon | undefined => {
  if (!nodeType) return undefined;
  return NODE_TYPE_ICONS[nodeType];
};
