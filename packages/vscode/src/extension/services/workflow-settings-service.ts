/**
 * Workflow Settings Service
 *
 * Reads workflow-related settings from VSCode configuration.
 */

import { VALIDATION_RULES } from '@cc-wf-studio/core';
import * as vscode from 'vscode';

/**
 * Get the maximum number of nodes allowed in a workflow.
 * Reads from `cc-wf-studio.workflow.maxNodes` setting.
 */
export function getMaxNodes(): number {
  const config = vscode.workspace.getConfiguration('cc-wf-studio');
  return config.get<number>('workflow.maxNodes', VALIDATION_RULES.WORKFLOW.MAX_NODES);
}
