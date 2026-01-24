/**
 * Codex CLI Path Detection Service
 *
 * Detects Codex CLI executable path using the shared CLI path detector.
 * Uses VSCode's default terminal setting to get the user's shell,
 * then executes with login shell to get the full PATH environment.
 *
 * This handles GUI-launched VSCode scenarios where the Extension Host
 * doesn't inherit the user's shell PATH settings.
 *
 * Based on: claude-cli-path.ts (Issue #375)
 */

import { log } from '../extension';
import {
  findExecutableInPath,
  findExecutableViaDefaultShell,
  verifyExecutable,
} from './cli-path-detector';

/**
 * Cached Codex CLI path
 * undefined = not checked yet
 * null = not found (use npx fallback)
 * string = path to codex executable
 */
let cachedCodexPath: string | null | undefined;

/**
 * Get the path to Codex CLI executable
 * Detection order:
 * 1. VSCode default terminal shell (handles version managers like mise, nvm)
 * 2. Direct PATH lookup (fallback for terminal-launched VSCode)
 * 3. npx fallback (handled in getCodexSpawnCommand)
 *
 * @returns Path to codex executable (full path or 'codex' for PATH), null for npx fallback
 */
export async function getCodexCliPath(): Promise<string | null> {
  // Return cached result if available
  if (cachedCodexPath !== undefined) {
    return cachedCodexPath;
  }

  // 1. Try VSCode default terminal (handles GUI-launched VSCode + version managers)
  const shellPath = await findExecutableViaDefaultShell('codex');
  if (shellPath) {
    const version = await verifyExecutable(shellPath);
    if (version) {
      log('INFO', 'Codex CLI found via default shell', {
        path: shellPath,
        version,
      });
      cachedCodexPath = shellPath;
      return shellPath;
    }
    log('WARN', 'Codex CLI found but not executable', { path: shellPath });
  }

  // 2. Fall back to direct PATH lookup (terminal-launched VSCode)
  const pathResult = await findExecutableInPath('codex');
  if (pathResult) {
    cachedCodexPath = 'codex';
    return 'codex';
  }

  log('INFO', 'Codex CLI not found, will use npx fallback');
  cachedCodexPath = null;
  return null;
}

/**
 * Clear Codex CLI path cache
 * Useful for testing or when user installs Codex CLI during session
 */
export function clearCodexCliPathCache(): void {
  cachedCodexPath = undefined;
}

/**
 * Get the command and args for spawning Codex CLI
 * Uses codex directly if available, otherwise falls back to 'npx @openai/codex'
 * npx detection order:
 * 1. VSCode default terminal shell (handles version managers)
 * 2. Direct PATH lookup
 *
 * @returns command path with 'npx:' prefix if using npx fallback, or null if not found
 */
export async function getCodexSpawnCommand(): Promise<string | null> {
  const codexPath = await getCodexCliPath();

  if (codexPath) {
    return codexPath;
  }

  // Fallback: Try npx @openai/codex
  // Return a special marker that codex-cli-service will handle
  const npxPath = await findExecutableViaDefaultShell('npx');
  if (npxPath) {
    log('INFO', 'Using npx from default shell for Codex CLI fallback', {
      path: npxPath,
    });
    return `npx:${npxPath}`;
  }

  // Final fallback to direct PATH lookup
  log('INFO', 'Using npx from PATH for Codex CLI fallback');
  return 'npx:npx';
}
