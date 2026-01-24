/**
 * Codex CLI Path Detection Service
 *
 * Shared module for detecting Codex CLI executable path.
 * Uses VSCode's default terminal setting to get the user's shell,
 * then executes with login shell to get the full PATH environment.
 *
 * This handles GUI-launched VSCode scenarios where the Extension Host
 * doesn't inherit the user's shell PATH settings.
 *
 * Based on: claude-cli-path.ts (Issue #375)
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
      log('DEBUG', 'Using VSCode default terminal profile for Codex', {
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

  log('DEBUG', 'No VSCode default terminal profile configured for Codex');
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
  log('DEBUG', `Searching for ${executable} via configured shell`, {
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

    log('DEBUG', `Shell execution completed for ${executable}`, {
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
    log('DEBUG', `${executable} not found via configured shell`, {
      shell: shellPath,
      error: error instanceof Error ? error.message : String(error),
      stdout: err.stdout?.substring(0, 200),
      stderr: err.stderr?.substring(0, 200),
    });
  }

  return null;
}

/**
 * Find an executable using VSCode's default terminal shell.
 * Falls back to platform-specific defaults if not configured.
 *
 * @param executable - The executable name to find (e.g., 'codex')
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
 * Cached Codex CLI path
 * undefined = not checked yet
 * null = not found
 * string = path to codex executable
 */
let cachedCodexPath: string | null | undefined;

/**
 * Get the path to Codex CLI executable
 * Detection order:
 * 1. VSCode default terminal shell (handles version managers like mise, nvm)
 * 2. Direct PATH lookup (fallback for terminal-launched VSCode)
 *
 * @returns Path to codex executable (full path or 'codex' for PATH), null if not found
 */
export async function getCodexCliPath(): Promise<string | null> {
  // Return cached result if available
  if (cachedCodexPath !== undefined) {
    return cachedCodexPath;
  }

  // 1. Try VSCode default terminal (handles GUI-launched VSCode + version managers)
  const shellPath = await findExecutableViaDefaultShell('codex');
  if (shellPath) {
    try {
      const result = await spawn(shellPath, ['--version'], { timeout: 5000 });
      log('INFO', 'Codex CLI found via default shell', {
        path: shellPath,
        version: result.stdout.trim().substring(0, 50),
      });
      cachedCodexPath = shellPath;
      return shellPath;
    } catch (error) {
      log('WARN', 'Codex CLI found but not executable', {
        path: shellPath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  // 2. Fall back to direct PATH lookup (terminal-launched VSCode)
  try {
    const result = await spawn('codex', ['--version'], { timeout: 5000 });
    log('INFO', 'Codex CLI found in PATH', {
      version: result.stdout.trim().substring(0, 50),
    });
    cachedCodexPath = 'codex';
    return 'codex';
  } catch {
    log('WARN', 'Codex CLI not found');
    cachedCodexPath = null;
    return null;
  }
}

/**
 * Clear Codex CLI path cache
 * Useful for testing or when user installs Codex CLI during session
 */
export function clearCodexCliPathCache(): void {
  cachedCodexPath = undefined;
}

/**
 * Get the command for spawning Codex CLI
 *
 * @returns Path to codex executable, or null if not found
 */
export async function getCodexSpawnCommand(): Promise<string | null> {
  return getCodexCliPath();
}
