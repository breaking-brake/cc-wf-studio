/**
 * Gemini CLI Path Detection Service
 *
 * Detects Gemini CLI executable path using the shared CLI path detector.
 * Uses VSCode's default terminal setting to get the user's shell,
 * then executes with login shell to get the full PATH environment.
 *
 * This handles GUI-launched VSCode scenarios where the Extension Host
 * doesn't inherit the user's shell PATH settings.
 *
 * Based on: codex-cli-path.ts
 */

import { log } from '../extension';
import {
  findExecutableInPath,
  findExecutableViaDefaultShell,
  verifyExecutable,
} from './cli-path-detector';

/**
 * Cached Gemini CLI path
 * undefined = not checked yet
 * null = not found (use npx fallback)
 * string = path to gemini executable
 */
let cachedGeminiPath: string | null | undefined;

/**
 * Get the path to Gemini CLI executable
 * Detection order:
 * 1. VSCode default terminal shell (handles version managers like mise, nvm)
 * 2. Direct PATH lookup (fallback for terminal-launched VSCode)
 * 3. npx fallback (handled in getGeminiSpawnCommand)
 *
 * @returns Path to gemini executable (full path or 'gemini' for PATH), null for npx fallback
 */
export async function getGeminiCliPath(): Promise<string | null> {
  // Return cached result if available
  if (cachedGeminiPath !== undefined) {
    return cachedGeminiPath;
  }

  // 1. Try VSCode default terminal (handles GUI-launched VSCode + version managers)
  const shellPath = await findExecutableViaDefaultShell('gemini');
  if (shellPath) {
    const version = await verifyExecutable(shellPath);
    if (version) {
      log('INFO', 'Gemini CLI found via default shell', {
        path: shellPath,
        version,
      });
      cachedGeminiPath = shellPath;
      return shellPath;
    }
    log('WARN', 'Gemini CLI found but not executable', { path: shellPath });
  }

  // 2. Fall back to direct PATH lookup (terminal-launched VSCode)
  const pathResult = await findExecutableInPath('gemini');
  if (pathResult) {
    cachedGeminiPath = 'gemini';
    return 'gemini';
  }

  log('INFO', 'Gemini CLI not found, will use npx fallback');
  cachedGeminiPath = null;
  return null;
}

/**
 * Clear Gemini CLI path cache
 * Useful for testing or when user installs Gemini CLI during session
 */
export function clearGeminiCliPathCache(): void {
  cachedGeminiPath = undefined;
}

/**
 * Get the command and args for spawning Gemini CLI
 * Uses gemini directly if available, otherwise falls back to 'npx @google/gemini-cli'
 * npx detection order:
 * 1. VSCode default terminal shell (handles version managers)
 * 2. Direct PATH lookup
 *
 * @returns command path with 'npx:' prefix if using npx fallback, or null if not found
 */
export async function getGeminiSpawnCommand(): Promise<string | null> {
  const geminiPath = await getGeminiCliPath();

  if (geminiPath) {
    return geminiPath;
  }

  // Fallback: Try npx @google/gemini-cli
  // Return a special marker that the caller will handle
  const npxPath = await findExecutableViaDefaultShell('npx');
  if (npxPath) {
    log('INFO', 'Using npx from default shell for Gemini CLI fallback', {
      path: npxPath,
    });
    return `npx:${npxPath}`;
  }

  // Final fallback to direct PATH lookup
  log('INFO', 'Using npx from PATH for Gemini CLI fallback');
  return 'npx:npx';
}
