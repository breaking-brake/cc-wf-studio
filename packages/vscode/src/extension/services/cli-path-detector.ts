/**
 * CLI Path Detection Service (Shared)
 *
 * Shared module for detecting CLI executable paths.
 * Uses VSCode's default terminal setting to get the user's shell,
 * then executes with login shell to get the full PATH environment.
 *
 * This handles GUI-launched VSCode scenarios where the Extension Host
 * doesn't inherit the user's shell PATH settings.
 *
 * Used by: claude-cli-path.ts, codex-cli-path.ts
 * Based on: Issue #375
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
 * Find an executable using VSCode's default terminal shell.
 * Falls back to platform-specific defaults if not configured.
 *
 * @param executable - The executable name to find (e.g., 'claude', 'codex', 'npx')
 * @returns Full path to executable if found, null otherwise
 */
export async function findExecutableViaDefaultShell(executable: string): Promise<string | null> {
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
 * Verify an executable is runnable by checking its version
 *
 * @param executablePath - Path to the executable
 * @param versionFlag - Flag to get version (default: '--version')
 * @returns Version string if executable works, null otherwise
 */
export async function verifyExecutable(
  executablePath: string,
  versionFlag = '--version'
): Promise<string | null> {
  try {
    const result = await spawn(executablePath, [versionFlag], { timeout: 5000 });
    return result.stdout.trim().substring(0, 50);
  } catch {
    return null;
  }
}

/**
 * Try to find an executable directly in PATH (for terminal-launched VSCode)
 *
 * @param executable - The executable name
 * @param versionFlag - Flag to get version (default: '--version')
 * @returns executable name if found in PATH, null otherwise
 */
export async function findExecutableInPath(
  executable: string,
  versionFlag = '--version'
): Promise<string | null> {
  try {
    const result = await spawn(executable, [versionFlag], { timeout: 5000 });
    log('INFO', `${executable} found in PATH`, {
      version: result.stdout.trim().substring(0, 50),
    });
    return executable;
  } catch {
    return null;
  }
}
