/**
 * Claude Code Workflow Studio - Antigravity Extension Service
 *
 * Wrapper for Antigravity (Google VSCode fork) Extension.
 * Uses VSCode commands to launch Cascade with skill invocation.
 */

import * as vscode from 'vscode';

const ANTIGRAVITY_EXTENSION_ID = 'google.antigravity';

/**
 * Check if Antigravity extension is installed
 *
 * @returns True if Antigravity extension is installed
 */
export function isAntigravityInstalled(): boolean {
  return vscode.extensions.getExtension(ANTIGRAVITY_EXTENSION_ID) !== undefined;
}

/**
 * Open Antigravity's MCP server management page
 */
export async function openAntigravityMcpSettings(): Promise<void> {
  try {
    await vscode.commands.executeCommand('antigravity.openConfigurePluginsPage');
  } catch {
    // Best-effort
  }
}

/**
 * Start a task in Antigravity via Cascade
 *
 * Attempts to open Cascade in agent mode with the given skill name.
 * Primary: workbench.action.chat.open with agent mode
 * Fallback: antigravity.sendPromptToAgentPanel
 *
 * @param skillName - Skill name to invoke (e.g., "my-workflow")
 * @returns True if the task was started successfully
 */
export async function startAntigravityTask(skillName: string): Promise<boolean> {
  const extension = vscode.extensions.getExtension(ANTIGRAVITY_EXTENSION_ID);
  if (!extension) {
    return false;
  }

  if (!extension.isActive) {
    await extension.activate();
  }

  const prompt = `/${skillName}`;

  try {
    // Primary: Open Cascade chat in agent mode with skill invocation
    await vscode.commands.executeCommand('workbench.action.chat.open', prompt);
    return true;
  } catch {
    // Fallback: Try alternative command
    try {
      await vscode.commands.executeCommand('antigravity.sendPromptToAgentPanel', prompt);
      return true;
    } catch {
      return false;
    }
  }
}
