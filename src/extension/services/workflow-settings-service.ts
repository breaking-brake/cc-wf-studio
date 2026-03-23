/**
 * Workflow Settings Service
 *
 * Reads workflow-related settings from VSCode configuration.
 */

import * as vscode from 'vscode';
import { VALIDATION_RULES } from '../../shared/types/workflow-definition';

/**
 * Get the maximum number of nodes allowed in a workflow.
 * Reads from `cc-wf-studio.workflow.maxNodes` setting.
 */
export function getMaxNodes(): number {
  const config = vscode.workspace.getConfiguration('cc-wf-studio');
  return config.get<number>('workflow.maxNodes', VALIDATION_RULES.WORKFLOW.MAX_NODES);
}
