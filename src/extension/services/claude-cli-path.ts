/**
 * Claude CLI Path Detection Service
 *
 * Detects Claude CLI executable path using the shared CLI path detector.
 * Uses VSCode's default terminal setting to get the user's shell,
 * then executes with login shell to get the full PATH environment.
 *
 * This handles GUI-launched VSCode scenarios where the Extension Host
 * doesn't inherit the user's shell PATH settings.
 *
 * Issue #375: https://github.com/breaking-brake/cc-wf-studio/issues/375
 * PR #376: https://github.com/breaking-brake/cc-wf-studio/pull/376
 */

import { log } from '../extension';
import {
  findExecutableInPath,
  findExecutableViaDefaultShell,
  verifyExecutable,
} from './cli-path-detector';

/**
 * Cached Claude CLI path
 * undefined = not checked yet
 * null = not found (use npx fallback)
 * string = path to claude executable
 */
let cachedClaudePath: string | null | undefined;

/**
 * Get the path to Claude CLI executable
 * Detection order:
 * 1. VSCode default terminal shell (handles version managers like mise, nvm)
 * 2. Direct PATH lookup (fallback for terminal-launched VSCode)
 * 3. npx fallback (handled in getClaudeSpawnCommand)
 *
 * @returns Path to claude executable (full path or 'claude' for PATH), null for npx fallback
 */
export async function getClaudeCliPath(): Promise<string | null> {
  // Return cached result if available
  if (cachedClaudePath !== undefined) {
    return cachedClaudePath;
  }

  // 1. Try VSCode default terminal (handles GUI-launched VSCode + version managers)
  const shellPath = await findExecutableViaDefaultShell('claude');
  if (shellPath) {
    const version = await verifyExecutable(shellPath);
    if (version) {
      log('INFO', 'Claude CLI found via default shell', {
        path: shellPath,
        version,
      });
      cachedClaudePath = shellPath;
      return shellPath;
    }
    log('WARN', 'Claude CLI found but not executable', { path: shellPath });
  }

  // 2. Fall back to direct PATH lookup (terminal-launched VSCode)
  const pathResult = await findExecutableInPath('claude');
  if (pathResult) {
    cachedClaudePath = 'claude';
    return 'claude';
  }

  log('INFO', 'Claude CLI not found, will use npx fallback');
  cachedClaudePath = null;
  return null;
}

/**
 * Clear Claude CLI path cache
 * Useful for testing or when user installs Claude CLI during session
 */
export function clearClaudeCliPathCache(): void {
  cachedClaudePath = undefined;
}

/**
 * Get the command and args for spawning Claude CLI
 * Uses claude directly if available, otherwise falls back to 'npx claude'
 * npx detection order:
 * 1. VSCode default terminal shell (handles version managers)
 * 2. Direct PATH lookup
 *
 * @param args - CLI arguments (without 'claude' command itself)
 * @returns command and args for spawn
 */
export async function getClaudeSpawnCommand(
  args: string[]
): Promise<{ command: string; args: string[] }> {
  const claudePath = await getClaudeCliPath();

  if (claudePath) {
    return { command: claudePath, args };
  }

  // 1. Try VSCode default terminal for npx (handles version managers like mise, nvm)
  const npxPath = await findExecutableViaDefaultShell('npx');
  if (npxPath) {
    log('INFO', 'Using npx from default shell for Claude CLI fallback', {
      path: npxPath,
    });
    return { command: npxPath, args: ['claude', ...args] };
  }

  // 2. Final fallback to direct PATH lookup
  log('INFO', 'Using npx from PATH for Claude CLI fallback');
  return { command: 'npx', args: ['claude', ...args] };
}
