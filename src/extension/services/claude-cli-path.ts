/**
 * Claude CLI Path Detection Service
 *
 * Shared module for detecting Claude CLI executable path.
 * Uses VSCode's default terminal setting to get the user's shell,
 * then executes with login shell to get the full PATH environment.
 *
 * This handles GUI-launched VSCode scenarios where the Extension Host
 * doesn't inherit the user's shell PATH settings.
 *
 * Issue #375: https://github.com/breaking-brake/cc-wf-studio/issues/375
 * PR #376: https://github.com/breaking-brake/cc-wf-studio/pull/376
 */

import * as fs from 'node:fs';
import nanoSpawn from 'nano-spawn';
import * as vscode from 'vscode';
import { log } from '../extension';

interface Result {
  stdout: string;
  stderr: string;
  output: string;
  command: string;
  durationMs: number;
}

const spawn =
  nanoSpawn.default ||
  (nanoSpawn as (
    file: string,
    args?: readonly string[],
    options?: Record<string, unknown>
  ) => Promise<Result>);

/**
 * Terminal profile configuration from VSCode settings
 */
interface TerminalProfile {
  path?: string;
  args?: string[];
}

/**
 * Get the default terminal shell configuration from VSCode settings.
 *
 * @returns Shell path and args, or null if not configured
 */
function getDefaultShellConfig(): { path: string; args: string[] } | null {
  const config = vscode.workspace.getConfiguration('terminal.integrated');

  let platformKey: 'windows' | 'linux' | 'osx';
  if (process.platform === 'win32') {
    platformKey = 'windows';
  } else if (process.platform === 'darwin') {
    platformKey = 'osx';
  } else {
    platformKey = 'linux';
  }

  const defaultProfileName = config.get<string>(`defaultProfile.${platformKey}`);
  const profiles = config.get<Record<string, TerminalProfile>>(`profiles.${platformKey}`);

  if (defaultProfileName && profiles?.[defaultProfileName]) {
    const profile = profiles[defaultProfileName];
    if (profile.path) {
      log('INFO', 'Using VSCode default terminal profile', {
        profile: defaultProfileName,
        path: profile.path,
        args: profile.args,
      });
      return {
        path: profile.path,
        args: profile.args || [],
      };
    }
  }

  log('INFO', 'No VSCode default terminal profile configured');
  return null;
}

/**
 * Check if the shell is PowerShell (pwsh or powershell)
 */
function isPowerShell(shellPath: string): boolean {
  const lowerPath = shellPath.toLowerCase();
  return lowerPath.includes('pwsh') || lowerPath.includes('powershell');
}

/**
 * Find an executable using VSCode's default terminal shell.
 * Falls back to platform-specific defaults if not configured.
 *
 * @param executable - The executable name to find (e.g., 'claude', 'npx')
 * @returns Full path to executable if found, null otherwise
 */
async function findExecutableViaDefaultShell(executable: string): Promise<string | null> {
  const shellConfig = getDefaultShellConfig();

  if (shellConfig) {
    // Use VSCode's configured default terminal
    const result = await findExecutableWithShell(executable, shellConfig.path, shellConfig.args);
    if (result) return result;
  }

  // Fallback to platform-specific defaults
  if (process.platform === 'win32') {
    return findExecutableViaWindowsFallback(executable);
  }
  return findExecutableViaUnixFallback(executable);
}

/**
 * Find an executable using a specific shell.
 *
 * @param executable - The executable name to find
 * @param shellPath - Path to the shell executable
 * @param shellArgs - Additional shell arguments from profile
 * @returns Full path to executable if found, null otherwise
 */
async function findExecutableWithShell(
  executable: string,
  shellPath: string,
  shellArgs: string[]
): Promise<string | null> {
  log('INFO', `Searching for ${executable} via configured shell`, {
    shell: shellPath,
  });

  try {
    let args: string[];
    let timeout = 15000;

    if (isPowerShell(shellPath)) {
      // PowerShell: use Get-Command with -CommandType Application
      // to avoid .ps1 wrapper scripts
      args = [
        ...shellArgs,
        '-NonInteractive',
        '-Command',
        `(Get-Command ${executable} -CommandType Application -ErrorAction SilentlyContinue).Source`,
      ];
    } else {
      // Unix shells (bash, zsh, etc.): use login shell with which command
      args = [...shellArgs, '-ilc', `which ${executable}`];
      timeout = 10000;
    }

    const result = await spawn(shellPath, args, { timeout });

    log('INFO', `Shell execution completed for ${executable}`, {
      shell: shellPath,
      stdout: result.stdout.trim().substring(0, 300),
      stderr: result.stderr.substring(0, 100),
    });

    const foundPath = result.stdout.trim().split(/\r?\n/)[0];
    if (foundPath && fs.existsSync(foundPath)) {
      log('INFO', `Found ${executable} via configured shell`, {
        shell: shellPath,
        path: foundPath,
      });
      return foundPath;
    }
  } catch (error) {
    const err = error as { stdout?: string; stderr?: string; exitCode?: number };
    log('INFO', `${executable} not found via configured shell`, {
      shell: shellPath,
      error: error instanceof Error ? error.message : String(error),
      stdout: err.stdout?.substring(0, 200),
      stderr: err.stderr?.substring(0, 200),
    });
  }

  return null;
}

/**
 * Fallback for Windows when no VSCode terminal is configured.
 * Tries PowerShell 7 (pwsh) first, then PowerShell 5 (powershell).
 */
async function findExecutableViaWindowsFallback(executable: string): Promise<string | null> {
  const shells = ['pwsh', 'powershell'];

  for (const shell of shells) {
    const result = await findExecutableWithShell(executable, shell, []);
    if (result) return result;
  }

  return null;
}

/**
 * Fallback for Unix/macOS when no VSCode terminal is configured.
 * Tries zsh first, then bash.
 */
async function findExecutableViaUnixFallback(executable: string): Promise<string | null> {
  const shells = ['/bin/zsh', '/bin/bash', 'zsh', 'bash'];

  for (const shell of shells) {
    const result = await findExecutableWithShell(executable, shell, []);
    if (result) return result;
  }

  return null;
}

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
    try {
      const result = await spawn(shellPath, ['--version'], { timeout: 5000 });
      log('INFO', 'Claude CLI found via default shell', {
        path: shellPath,
        version: result.stdout.trim().substring(0, 50),
      });
      cachedClaudePath = shellPath;
      return shellPath;
    } catch (error) {
      log('WARN', 'Claude CLI found but not executable', {
        path: shellPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 2. Fall back to direct PATH lookup (terminal-launched VSCode)
  try {
    const result = await spawn('claude', ['--version'], { timeout: 5000 });
    log('INFO', 'Claude CLI found in PATH', {
      version: result.stdout.trim().substring(0, 50),
    });
    cachedClaudePath = 'claude';
    return 'claude';
  } catch {
    log('INFO', 'Claude CLI not found, will use npx fallback');
    cachedClaudePath = null;
    return null;
  }
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
