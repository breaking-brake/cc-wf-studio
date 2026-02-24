/**
 * Claude Code Workflow Studio - Cursor Extension Service
 *
 * Wrapper for Cursor (Anysphere VSCode fork) Extension.
 * Uses VSCode commands to launch Cursor Agent with skill invocation.
 */

import * as vscode from 'vscode';

const CURSOR_EXTENSION_ID = 'anysphere.cursor-agent';

/**
 * Check if Cursor extension is installed
 *
 * @returns True if Cursor extension is installed
 */
export function isCursorInstalled(): boolean {
  return vscode.extensions.getExtension(CURSOR_EXTENSION_ID) !== undefined;
}

/**
 * Start a task in Cursor via Agent
 *
 * Attempts to open Cursor's chat in agent mode with the given skill name.
 *
 * @param skillName - Skill name to invoke (e.g., "my-workflow")
 * @returns True if the task was started successfully
 */
export async function startCursorTask(skillName: string): Promise<boolean> {
  const extension = vscode.extensions.getExtension(CURSOR_EXTENSION_ID);
  if (!extension) {
    return false;
  }

  if (!extension.isActive) {
    await extension.activate();
  }

  const prompt = `/${skillName}`;

  try {
    await vscode.commands.executeCommand('workbench.action.chat.open', prompt);
    return true;
  } catch {
    return false;
  }
}
