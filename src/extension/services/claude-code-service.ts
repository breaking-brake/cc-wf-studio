/**
 * Claude Code CLI Service
 *
 * Executes Claude Code CLI commands for AI-assisted workflow generation.
 * Based on: /specs/001-ai-workflow-generation/research.md Q1
 *
 * Updated to use nano-spawn for cross-platform compatibility (Windows/Unix)
 * See: Issue #79 - Windows environment compatibility
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const nanoSpawn = require('nano-spawn');

import type { ChildProcess } from 'node:child_process';
import { log } from '../extension';

/**
 * nano-spawn type definitions (manually defined for compatibility)
 */
interface SubprocessError extends Error {
  stdout: string;
  stderr: string;
  output: string;
  command: string;
  durationMs: number;
  exitCode?: number;
  signalName?: string;
  isTerminated?: boolean;
  code?: string;
}

interface Result {
  stdout: string;
  stderr: string;
  output: string;
  command: string;
  durationMs: number;
}

interface Subprocess extends Promise<Result> {
  nodeChildProcess: ChildProcess;
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
}

const spawn =
  nanoSpawn.default ||
  (nanoSpawn as (
    file: string,
    args?: readonly string[],
    options?: Record<string, unknown>
  ) => Subprocess);

/**
 * Active generation processes
 * Key: requestId, Value: subprocess and start time
 */
const activeProcesses = new Map<string, { subprocess: Subprocess; startTime: number }>();

export interface ClaudeCodeExecutionResult {
  success: boolean;
  output?: string;
  error?: {
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
}

/**
 * Execute Claude Code CLI with a prompt and return the output
 *
 * @param prompt - The prompt to send to Claude Code CLI
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution (defaults to current directory)
 * @returns Execution result with success status and output/error
 */
export async function executeClaudeCodeCLI(
  prompt: string,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string
): Promise<ClaudeCodeExecutionResult> {
  const startTime = Date.now();

  log('INFO', 'Starting Claude Code CLI execution', {
    promptLength: prompt.length,
    timeoutMs,
    cwd: workingDirectory ?? process.cwd(),
  });

  try {
    // Spawn Claude Code CLI process using nano-spawn (cross-platform compatible)
    // Use stdin for prompt instead of -p argument to avoid Windows command line length limits
    // Use npx to ensure cross-platform compatibility (Windows PATH issues with global npm installs)
    const subprocess = spawn('npx', ['claude', '-p', '-'], {
      cwd: workingDirectory,
      timeout: timeoutMs,
      stdin: { string: prompt },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Register as active process if requestId is provided
    if (requestId) {
      activeProcesses.set(requestId, { subprocess, startTime });
      log('INFO', `Registered active process for requestId: ${requestId}`, {
        pid: subprocess.nodeChildProcess.pid,
      });
    }

    // Wait for subprocess to complete
    const result = await subprocess;

    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active process (success) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    // Success - return stdout
    log('INFO', 'Claude Code CLI execution succeeded', {
      executionTimeMs,
      outputLength: result.stdout.length,
    });

    return {
      success: true,
      output: result.stdout.trim(),
      executionTimeMs,
    };
  } catch (error) {
    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active process (error) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    // Log complete error object for debugging
    log('ERROR', 'Claude Code CLI error caught', {
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      errorKeys: error && typeof error === 'object' ? Object.keys(error) : [],
      error: error,
      executionTimeMs,
    });

    // Handle SubprocessError from nano-spawn
    if (isSubprocessError(error)) {
      // Timeout error
      if (error.isTerminated && error.signalName === 'SIGTERM') {
        log('WARN', 'Claude Code CLI execution timed out', {
          timeoutMs,
          executionTimeMs,
        });

        return {
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `AI generation timed out after ${Math.floor(timeoutMs / 1000)} seconds. Try simplifying your description.`,
            details: `Timeout after ${timeoutMs}ms`,
          },
          executionTimeMs,
        };
      }

      // Command not found (ENOENT)
      if (error.code === 'ENOENT') {
        log('ERROR', 'Claude Code CLI not found', {
          errorCode: error.code,
          errorMessage: error.message,
          executionTimeMs,
        });

        return {
          success: false,
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: 'Cannot connect to Claude Code - please ensure it is installed and running',
            details: error.message,
          },
          executionTimeMs,
        };
      }

      // Non-zero exit code
      log('ERROR', 'Claude Code CLI execution failed', {
        exitCode: error.exitCode,
        executionTimeMs,
        stderr: error.stderr?.substring(0, 200), // Log first 200 chars of stderr
      });

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Generation failed - please try again or rephrase your description',
          details: `Exit code: ${error.exitCode ?? 'unknown'}, stderr: ${error.stderr ?? 'none'}`,
        },
        executionTimeMs,
      };
    }

    // Unknown error type
    log('ERROR', 'Unexpected error during Claude Code CLI execution', {
      errorMessage: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
    };
  }
}

/**
 * Type guard to check if an error is a SubprocessError from nano-spawn
 *
 * @param error - The error to check
 * @returns True if error is a SubprocessError
 */
function isSubprocessError(error: unknown): error is SubprocessError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'exitCode' in error &&
    'stderr' in error &&
    'stdout' in error
  );
}

/**
 * Parse JSON output from Claude Code CLI
 *
 * @param output - Raw output string from CLI
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseClaudeCodeOutput(output: string): unknown {
  try {
    // Claude Code might wrap output in markdown code blocks, so extract JSON
    const jsonMatch = output.match(/```json\s*([\s\S]*?)\s*```/);
    const jsonString = jsonMatch ? jsonMatch[1] : output;

    return JSON.parse(jsonString.trim());
  } catch (_error) {
    // If parsing fails, return null
    return null;
  }
}

/**
 * Cancel an active generation process
 *
 * @param requestId - Request ID of the generation to cancel
 * @returns True if process was found and killed, false otherwise
 */
export function cancelGeneration(requestId: string): {
  cancelled: boolean;
  executionTimeMs?: number;
} {
  const activeGen = activeProcesses.get(requestId);

  if (!activeGen) {
    log('WARN', `No active generation found for requestId: ${requestId}`);
    return { cancelled: false };
  }

  const { subprocess, startTime } = activeGen;
  const childProcess = subprocess.nodeChildProcess;
  const executionTimeMs = Date.now() - startTime;

  log('INFO', `Cancelling generation for requestId: ${requestId}`, {
    pid: childProcess.pid,
    elapsedMs: executionTimeMs,
  });

  // Kill the process (cross-platform compatible)
  // On Windows: kill() sends an unconditional termination
  // On Unix: kill() sends SIGTERM (graceful termination)
  childProcess.kill();

  // Force kill after 500ms if process doesn't terminate
  setTimeout(() => {
    if (!childProcess.killed) {
      // On Unix: this would be SIGKILL, but kill() without signal works on both platforms
      childProcess.kill();
      log('WARN', `Forcefully killed process for requestId: ${requestId}`);
    }
  }, 500);

  // Remove from active processes map
  activeProcesses.delete(requestId);

  return { cancelled: true, executionTimeMs };
}

/**
 * Cancel an active refinement process
 *
 * @param requestId - Request ID of the refinement to cancel
 * @returns True if process was found and killed, false otherwise
 */
export function cancelRefinement(requestId: string): {
  cancelled: boolean;
  executionTimeMs?: number;
} {
  const activeGen = activeProcesses.get(requestId);

  if (!activeGen) {
    log('WARN', `No active refinement found for requestId: ${requestId}`);
    return { cancelled: false };
  }

  const { subprocess, startTime } = activeGen;
  const childProcess = subprocess.nodeChildProcess;
  const executionTimeMs = Date.now() - startTime;

  log('INFO', `Cancelling refinement for requestId: ${requestId}`, {
    pid: childProcess.pid,
    elapsedMs: executionTimeMs,
  });

  // Kill the process (cross-platform compatible)
  // On Windows: kill() sends an unconditional termination
  // On Unix: kill() sends SIGTERM (graceful termination)
  childProcess.kill();

  // Force kill after 500ms if process doesn't terminate
  setTimeout(() => {
    if (!childProcess.killed) {
      // On Unix: this would be SIGKILL, but kill() without signal works on both platforms
      childProcess.kill();
      log('WARN', `Forcefully killed refinement process for requestId: ${requestId}`);
    }
  }, 500);

  // Remove from active processes map
  activeProcesses.delete(requestId);

  return { cancelled: true, executionTimeMs };
}
