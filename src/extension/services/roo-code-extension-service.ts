/**
 * Claude Code Workflow Studio - Roo Code Extension Service
 *
 * Wrapper for Roo Code VSCode Extension API.
 * Uses the extension's exported API to start new tasks with :skill command.
 *
 * @beta This is a PoC feature for Roo Code integration
 */

import * as vscode from 'vscode';

const ROO_CODE_EXTENSION_ID = 'RooVeterinaryInc.roo-cline';

/**
 * Check if Roo Code extension is installed
 *
 * @returns True if Roo Code extension is installed
 */
export function isRooCodeInstalled(): boolean {
  return vscode.extensions.getExtension(ROO_CODE_EXTENSION_ID) !== undefined;
}

/**
 * Start a new task in Roo Code
 *
 * Activates the Roo Code extension if needed and calls startNewTask API.
 *
 * @param message - Message to send (e.g., ":skill my-skill")
 * @returns True if the task was started successfully
 */
export async function startRooCodeTask(message: string): Promise<boolean> {
  const extension = vscode.extensions.getExtension(ROO_CODE_EXTENSION_ID);
  if (!extension) {
    return false;
  }

  if (!extension.isActive) {
    await extension.activate();
  }

  const api = extension.exports;

  if (api?.startNewTask) {
    await api.startNewTask({ text: message });
    return true;
  }

  return false;
}
