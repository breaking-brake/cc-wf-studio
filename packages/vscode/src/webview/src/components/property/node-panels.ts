/**
 * Webview-side registry: node type → schema panel configuration.
 *
 * A node type present here renders through SchemaPropertyPanel; types not yet
 * migrated keep their legacy PropertyOverlay component. As phases land, node
 * types move from the legacy ternary chain into this map.
 */

import { branchSessionPanelConfig } from './panels/branch-session-panel';
import { codexPanelConfig } from './panels/codex-panel';
import { groupPanelConfig } from './panels/group-panel';
import { promptPanelConfig } from './panels/prompt-panel';
import { subAgentPanelConfig } from './panels/sub-agent-panel';
import type { NodePanelConfig } from './types';

export const NODE_PANELS: Record<string, NodePanelConfig> = {
  subAgent: subAgentPanelConfig,
  prompt: promptPanelConfig,
  branchSession: branchSessionPanelConfig,
  codex: codexPanelConfig,
  group: groupPanelConfig,
};
