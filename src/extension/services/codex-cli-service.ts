/**
 * Codex CLI Service
 *
 * Executes OpenAI Codex CLI commands for AI-assisted workflow generation and refinement.
 * Based on Codex CLI documentation: https://developers.openai.com/codex/cli/reference/
 *
 * Uses nano-spawn for cross-platform compatibility (Windows/Unix).
 */

import type { ChildProcess } from 'node:child_process';
import nanoSpawn from 'nano-spawn';
import type { CodexModel } from '../../shared/types/messages';
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
  nodeChildProcess: Promise<ChildProcess>;
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

export interface CodexExecutionResult {
  success: boolean;
  output?: string;
  error?: {
    code: 'COMMAND_NOT_FOUND' | 'MODEL_NOT_SUPPORTED' | 'TIMEOUT' | 'PARSE_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
  /** Session ID is not supported by Codex CLI */
  sessionId?: undefined;
}

/** Default Codex model (empty = inherit from CLI config) */
const DEFAULT_CODEX_MODEL: CodexModel = '';

/**
 * Check if Codex CLI is available
 *
 * @returns Promise resolving to availability status
 */
export async function isCodexCliAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  try {
    const subprocess = spawn('codex', ['--version'], {
      timeout: 5000,
    });

    const result = await subprocess;

    if (result.stdout || result.stderr) {
      log('INFO', 'Codex CLI is available', {
        version: result.stdout.trim() || result.stderr.trim(),
      });
      return { available: true };
    }

    return { available: false, reason: 'COMMAND_NOT_FOUND' };
  } catch (error) {
    log('WARN', 'Codex CLI not available', {
      error: error instanceof Error ? error.message : String(error),
    });
    return { available: false, reason: 'COMMAND_NOT_FOUND' };
  }
}

/**
 * Execute Codex CLI with a prompt and return the output (non-streaming)
 *
 * @param prompt - The prompt to send to Codex CLI
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution
 * @param model - Codex model to use (default: '' = inherit from CLI config)
 * @returns Execution result with success status and output/error
 */
export async function executeCodexCLI(
  prompt: string,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: CodexModel = DEFAULT_CODEX_MODEL
): Promise<CodexExecutionResult> {
  const startTime = Date.now();

  log('INFO', 'Starting Codex CLI execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    cwd: workingDirectory ?? process.cwd(),
  });

  try {
    // Build CLI arguments
    // codex exec --json [-m MODEL] --full-auto -
    const args = ['exec', '--json'];
    if (model) {
      args.push('-m', model);
    }
    args.push('--full-auto', '-');

    const subprocess = spawn('codex', args, {
      cwd: workingDirectory,
      timeout: timeoutMs,
      stdin: { string: prompt },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Register as active process if requestId is provided
    if (requestId) {
      activeProcesses.set(requestId, { subprocess, startTime });
      log('INFO', `Registered active Codex process for requestId: ${requestId}`);
    }

    // Wait for subprocess to complete
    const result = await subprocess;

    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active Codex process (success) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    // Parse JSONL output to extract final message
    const output = parseCodexOutput(result.stdout);

    log('INFO', 'Codex CLI execution succeeded', {
      executionTimeMs,
      outputLength: output.length,
    });

    return {
      success: true,
      output: output.trim(),
      executionTimeMs,
    };
  } catch (error) {
    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active Codex process (error) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Codex CLI error caught', {
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      error: error,
      executionTimeMs,
    });

    return handleCodexError(error, timeoutMs, executionTimeMs);
  }
}

/**
 * Progress callback for streaming CLI execution
 */
export type StreamingProgressCallback = (
  chunk: string,
  displayText: string,
  explanatoryText: string,
  contentType?: 'tool_use' | 'text'
) => void;

/**
 * Execute Codex CLI with streaming output
 *
 * @param prompt - The prompt to send to Codex CLI
 * @param onProgress - Callback invoked with each text chunk
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution
 * @param model - Codex model to use (default: '' = inherit from CLI config)
 * @returns Execution result with success status and output/error
 */
export async function executeCodexCLIStreaming(
  prompt: string,
  onProgress: StreamingProgressCallback,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: CodexModel = DEFAULT_CODEX_MODEL
): Promise<CodexExecutionResult> {
  const startTime = Date.now();
  let accumulated = '';

  log('INFO', 'Starting Codex CLI streaming execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    cwd: workingDirectory ?? process.cwd(),
  });

  try {
    // Build CLI arguments with --json for JSONL output
    const args = ['exec', '--json'];
    if (model) {
      args.push('-m', model);
    }
    args.push('--full-auto', '-');

    const subprocess = spawn('codex', args, {
      cwd: workingDirectory,
      timeout: timeoutMs,
      stdin: { string: prompt },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Register as active process if requestId is provided
    if (requestId) {
      activeProcesses.set(requestId, { subprocess, startTime });
      log('INFO', `Registered active Codex streaming process for requestId: ${requestId}`);
    }

    // Track explanatory text (non-JSON text from AI, for chat history)
    let explanatoryText = '';
    // Track current tool info for display
    let currentToolInfo = '';

    // Process streaming output using AsyncIterable
    for await (const chunk of subprocess.stdout) {
      // Normalize CRLF to LF and split by newlines (JSONL format)
      const lines = chunk
        .replace(/\r\n/g, '\n')
        .split('\n')
        .filter((line: string) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);

          log('DEBUG', 'Codex streaming JSON line parsed', {
            type: parsed.type,
            hasContent: !!parsed.content,
          });

          // Handle different event types from Codex CLI
          // Based on Codex CLI JSONL output format
          if (parsed.type === 'message' && parsed.content) {
            // Message content from the AI
            const content = parsed.content;

            if (typeof content === 'string') {
              accumulated += content;
              explanatoryText = accumulated;

              // Clear tool info when new text comes
              currentToolInfo = '';

              onProgress(content, explanatoryText, explanatoryText, 'text');
            } else if (Array.isArray(content)) {
              // Handle array of content blocks (similar to Claude format)
              for (const block of content) {
                if (block.type === 'text' && block.text) {
                  accumulated += block.text;
                  explanatoryText = accumulated;
                  currentToolInfo = '';
                  onProgress(block.text, explanatoryText, explanatoryText, 'text');
                } else if (block.type === 'tool_use' && block.name) {
                  const toolName = block.name;
                  currentToolInfo = toolName;
                  const displayText = explanatoryText
                    ? `${explanatoryText}\n\n🔧 ${currentToolInfo}`
                    : `🔧 ${currentToolInfo}`;
                  onProgress(currentToolInfo, displayText, explanatoryText, 'tool_use');
                }
              }
            }
          } else if (parsed.type === 'tool_use' || parsed.type === 'function_call') {
            // Tool usage event
            const toolName = parsed.name || parsed.function?.name || 'Unknown tool';
            currentToolInfo = toolName;

            const displayText = explanatoryText
              ? `${explanatoryText}\n\n🔧 ${currentToolInfo}`
              : `🔧 ${currentToolInfo}`;

            onProgress(currentToolInfo, displayText, explanatoryText, 'tool_use');
          } else if (parsed.type === 'text' || parsed.type === 'assistant') {
            // Direct text output
            const text = parsed.text || parsed.content || '';
            if (text) {
              accumulated += text;
              explanatoryText = accumulated;
              currentToolInfo = '';
              onProgress(text, explanatoryText, explanatoryText, 'text');
            }
          }
        } catch {
          // Ignore JSON parse errors (may be partial chunks or non-JSON output)
          log('DEBUG', 'Skipping non-JSON line in Codex streaming output', {
            lineLength: line.length,
          });
        }
      }
    }

    // Wait for subprocess to complete
    const result = await subprocess;

    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active Codex streaming process (success) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    log('INFO', 'Codex CLI streaming execution succeeded', {
      executionTimeMs,
      accumulatedLength: accumulated.length,
      rawOutputLength: result.stdout.length,
    });

    return {
      success: true,
      output: accumulated || parseCodexOutput(result.stdout),
      executionTimeMs,
    };
  } catch (error) {
    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active Codex streaming process (error) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Codex CLI streaming error caught', {
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      executionTimeMs,
      accumulatedLength: accumulated.length,
    });

    const result = handleCodexError(error, timeoutMs, executionTimeMs);
    // Include accumulated content even on error
    result.output = accumulated || result.output;
    return result;
  }
}

/**
 * Cancel an active Codex process
 *
 * @param requestId - Request ID of the process to cancel
 * @returns Result indicating if cancellation was successful
 */
export async function cancelCodexProcess(requestId: string): Promise<{
  cancelled: boolean;
  executionTimeMs?: number;
}> {
  const activeGen = activeProcesses.get(requestId);

  if (!activeGen) {
    log('WARN', `No active Codex process found for requestId: ${requestId}`);
    return { cancelled: false };
  }

  const { subprocess, startTime } = activeGen;
  const executionTimeMs = Date.now() - startTime;

  // nano-spawn v2.0.0: nodeChildProcess is a Promise
  const childProcess = await subprocess.nodeChildProcess;

  log('INFO', `Cancelling Codex process for requestId: ${requestId}`, {
    pid: childProcess.pid,
    elapsedMs: executionTimeMs,
  });

  // Kill the process
  childProcess.kill();

  // Force kill after 500ms if process doesn't terminate
  setTimeout(() => {
    if (!childProcess.killed) {
      childProcess.kill();
      log('WARN', `Forcefully killed Codex process for requestId: ${requestId}`);
    }
  }, 500);

  // Remove from active processes map
  activeProcesses.delete(requestId);

  return { cancelled: true, executionTimeMs };
}

/**
 * Parse Codex CLI JSONL output to extract the final message content
 *
 * @param output - Raw JSONL output from Codex CLI
 * @returns Extracted message content
 */
function parseCodexOutput(output: string): string {
  const lines = output.trim().split('\n');
  let finalContent = '';

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);

      // Extract message content based on event type
      if (parsed.type === 'message' && parsed.content) {
        if (typeof parsed.content === 'string') {
          finalContent = parsed.content;
        } else if (Array.isArray(parsed.content)) {
          const textBlocks = parsed.content
            .filter((b: { type: string }) => b.type === 'text')
            .map((b: { text: string }) => b.text)
            .join('\n');
          if (textBlocks) {
            finalContent = textBlocks;
          }
        }
      } else if (parsed.type === 'text' || parsed.type === 'assistant') {
        const text = parsed.text || parsed.content;
        if (text && typeof text === 'string') {
          finalContent = text;
        }
      } else if (parsed.type === 'result' && parsed.output) {
        finalContent = parsed.output;
      }
    } catch {
      // Ignore parse errors
    }
  }

  // If no structured content found, return raw output
  return finalContent || output;
}

/**
 * Type guard to check if an error is a SubprocessError from nano-spawn
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
 * Handle Codex CLI errors and map to structured error response
 */
function handleCodexError(
  error: unknown,
  timeoutMs: number,
  executionTimeMs: number
): CodexExecutionResult {
  if (isSubprocessError(error)) {
    // Timeout detection
    const isTimeout =
      (error.isTerminated && error.signalName === 'SIGTERM') || error.exitCode === 143;

    if (isTimeout) {
      log('WARN', 'Codex CLI execution timed out', {
        timeoutMs,
        executionTimeMs,
        exitCode: error.exitCode,
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
      log('ERROR', 'Codex CLI not found', {
        errorCode: error.code,
        errorMessage: error.message,
        executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'COMMAND_NOT_FOUND',
          message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
          details: error.message,
        },
        executionTimeMs,
      };
    }

    // Non-zero exit code
    log('ERROR', 'Codex CLI execution failed', {
      exitCode: error.exitCode,
      executionTimeMs,
      stderr: error.stderr?.substring(0, 200),
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
  log('ERROR', 'Unexpected error during Codex CLI execution', {
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
