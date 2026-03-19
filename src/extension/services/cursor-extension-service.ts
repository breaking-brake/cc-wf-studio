/**
 * Claude Code Workflow Studio - Cursor Extension Service
 *
 * Wrapper for Cursor (Anysphere VSCode fork) Extension.
 * Uses VSCode commands to launch Cursor Agent with skill invocation.
 */

import * as vscode from 'vscode';

/**
 * Check if running inside Cursor editor
 *
 * Cursor is a VSCode fork, so built-in agent functionality
 * is not a separate extension. Detect via appName or uriScheme.
 *
 * @returns True if running in Cursor
 */
export function isCursorInstalled(): boolean {
  const appName = vscode.env.appName?.toLowerCase() ?? '';
  const uriScheme = vscode.env.uriScheme?.toLowerCase() ?? '';
  return appName.includes('cursor') || uriScheme.includes('cursor');
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
  if (!isCursorInstalled()) {
    return false;
  }

  const prompt = `/${skillName}`;

  try {
    await vscode.commands.executeCommand('workbench.action.chat.open', prompt);
    return true;
  } catch {
    return false;
  }
}
