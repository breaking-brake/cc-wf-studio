/**
 * Webview-side registry: node type → schema panel configuration.
 *
 * A node type present here renders through SchemaPropertyPanel; types not yet
 * migrated keep their legacy PropertyOverlay component. As phases land, node
 * types move from the legacy ternary chain into this map.
 */

import { askUserQuestionPanelConfig } from './panels/ask-user-question-panel';
import { branchPanelConfig } from './panels/branch-panel';
import { branchSessionPanelConfig } from './panels/branch-session-panel';
import { codexPanelConfig } from './panels/codex-panel';
import { groupPanelConfig } from './panels/group-panel';
import { ifElsePanelConfig } from './panels/if-else-panel';
import { mcpPanelConfig } from './panels/mcp-panel';
import { promptPanelConfig } from './panels/prompt-panel';
import { skillPanelConfig } from './panels/skill-panel';
import { subAgentFlowPanelConfig } from './panels/sub-agent-flow-panel';
import { subAgentPanelConfig } from './panels/sub-agent-panel';
import { switchPanelConfig } from './panels/switch-panel';
import type { NodePanelConfig } from './types';

export const NODE_PANELS: Record<string, NodePanelConfig> = {
  subAgent: subAgentPanelConfig,
  prompt: promptPanelConfig,
  branchSession: branchSessionPanelConfig,
  codex: codexPanelConfig,
  group: groupPanelConfig,
  askUserQuestion: askUserQuestionPanelConfig,
  branch: branchPanelConfig,
  ifElse: ifElsePanelConfig,
  switch: switchPanelConfig,
  skill: skillPanelConfig,
  mcp: mcpPanelConfig,
  subAgentFlow: subAgentFlowPanelConfig,
};
