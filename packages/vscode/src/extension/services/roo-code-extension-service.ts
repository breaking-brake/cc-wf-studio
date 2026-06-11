/**
 * Claude Code Workflow Studio - Roo Code / Zoo Code Extension Service
 *
 * Wrapper for the Zoo Code VSCode Extension API (community fork of the
 * sunset Roo Code extension — see issue #770). Zoo Code keeps the `.roo/`
 * project directory and the same `startNewTask` extension API, so the
 * integration is unchanged except for the extension ID and launch text.
 *
 * Detection prefers Zoo Code and falls back to the legacy Roo Code
 * extension, which still works if the user configured a non-Router provider.
 */

import * as vscode from 'vscode';

const ZOO_CODE_EXTENSION_ID = 'ZooCodeOrganization.zoo-code';
const LEGACY_ROO_CODE_EXTENSION_ID = 'RooVeterinaryInc.roo-cline';

/**
 * Which compatible extension is installed.
 * 'zoo-code' = Zoo Code (preferred), 'roo-code-legacy' = the sunset Roo Code extension.
 */
export type RooCodeFlavor = 'zoo-code' | 'roo-code-legacy';

function findInstalledExtension(): {
  extension: vscode.Extension<unknown>;
  flavor: RooCodeFlavor;
} | null {
  const zoo = vscode.extensions.getExtension(ZOO_CODE_EXTENSION_ID);
  if (zoo) {
    return { extension: zoo, flavor: 'zoo-code' };
  }
  const legacyRoo = vscode.extensions.getExtension(LEGACY_ROO_CODE_EXTENSION_ID);
  if (legacyRoo) {
    return { extension: legacyRoo, flavor: 'roo-code-legacy' };
  }
  return null;
}

/**
 * Get the flavor of the installed Zoo Code / Roo Code extension
 *
 * @returns 'zoo-code' or 'roo-code-legacy', or null if neither is installed
 */
export function getInstalledRooCodeFlavor(): RooCodeFlavor | null {
  return findInstalledExtension()?.flavor ?? null;
}

/**
 * Check if a compatible extension (Zoo Code or legacy Roo Code) is installed
 *
 * @returns True if either extension is installed
 */
export function isRooCodeInstalled(): boolean {
  return findInstalledExtension() !== null;
}

/**
 * Build the task text that loads a skill, per extension flavor.
 *
 * Zoo Code parses slash-command mentions (`/<name>`) with a fallback to
 * skills; legacy Roo Code used the `:skill <name>` syntax.
 *
 * @param flavor - Installed extension flavor
 * @param skillName - Name of the exported skill
 * @returns Task text to pass to startRooCodeTask
 */
export function skillLaunchText(flavor: RooCodeFlavor, skillName: string): string {
  return flavor === 'zoo-code' ? `/${skillName}` : `:skill ${skillName}`;
}

/**
 * Start a new task in Zoo Code (or legacy Roo Code)
 *
 * Activates the extension if needed and calls its startNewTask API.
 *
 * @param message - Message to send (e.g., "/my-skill")
 * @returns True if the task was started successfully
 */
export async function startRooCodeTask(message: string): Promise<boolean> {
  const installed = findInstalledExtension();
  if (!installed) {
    return false;
  }

  const { extension } = installed;
  if (!extension.isActive) {
    await extension.activate();
  }

  const api = extension.exports as
    | { startNewTask?: (options: { text: string }) => Promise<unknown> }
    | undefined;

  if (api?.startNewTask) {
    await api.startNewTask({ text: message });
    return true;
  }

  return false;
}
