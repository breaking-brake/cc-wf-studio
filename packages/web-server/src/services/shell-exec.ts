/**
 * Shell Execution Service
 *
 * Replaces vscode.window.createTerminal() with child_process.spawn()
 * and WebSocket stdout/stderr streaming.
 */

import { spawn } from 'node:child_process';
import { log } from '@cc-wf-studio/core';

export interface ShellExecOptions {
  command: string;
  args?: string[];
  cwd?: string;
  env?: Record<string, string>;
  shell?: boolean;
}

export interface ShellExecResult {
  pid: number | undefined;
  kill: () => void;
}

type StreamCallback = (stream: 'stdout' | 'stderr', data: string) => void;
type ExitCallback = (code: number | null) => void;

/**
 * Execute a command with streaming output
 */
export function executeWithStreaming(
  options: ShellExecOptions,
  onStream: StreamCallback,
  onExit?: ExitCallback
): ShellExecResult {
  const { command, args = [], cwd, env, shell = true } = options;

  const child = spawn(command, args, {
    cwd,
    shell,
    env: env ? { ...process.env, ...env } : process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  child.stdout?.on('data', (data) => {
    onStream('stdout', data.toString());
  });

  child.stderr?.on('data', (data) => {
    onStream('stderr', data.toString());
  });

  child.on('close', (code) => {
    onExit?.(code);
  });

  child.on('error', (error) => {
    log('ERROR', `Shell exec error: ${command}`, { error: error.message });
    onStream('stderr', `Error: ${error.message}\n`);
    onExit?.(1);
  });

  return {
    pid: child.pid,
    kill: () => {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    },
  };
}

/**
 * Execute a command and collect output
 */
export async function execute(
  options: ShellExecOptions
): Promise<{ stdout: string; stderr: string; code: number | null }> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';

    executeWithStreaming(
      options,
      (stream, data) => {
        if (stream === 'stdout') stdout += data;
        else stderr += data;
      },
      (code) => {
        resolve({ stdout, stderr, code });
      }
    );
  });
}
