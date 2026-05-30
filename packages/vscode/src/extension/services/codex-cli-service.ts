/**
 * Codex CLI Service
 *
 * Executes OpenAI Codex CLI commands for AI-assisted workflow generation and refinement.
 * Based on Codex CLI documentation: https://developers.openai.com/codex/cli/reference/
 *
 * Uses nano-spawn for cross-platform compatibility (Windows/Unix).
 * Uses codex-cli-path.ts for cross-platform CLI path detection (handles GUI-launched VSCode).
 */

import type { ChildProcess } from 'node:child_process';
import nanoSpawn from 'nano-spawn';
import type { CodexModel, CodexReasoningEffort } from '../../shared/types/messages';
import { log } from '../extension';
import { clearCodexCliPathCache, getCodexSpawnCommand } from './codex-cli-path';

// Re-export for external use
export { clearCodexCliPathCache };

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
  /** Thread ID for session continuation (extracted from thread.started event) */
  sessionId?: string;
}

/** Default Codex model (empty = inherit from CLI config) */
const DEFAULT_CODEX_MODEL: CodexModel = '';

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
 * Parse the codex command path returned by getCodexSpawnCommand.
 * Handles both direct path and npx fallback (prefixed with "npx:").
 *
 * @param codexPath - Path from getCodexSpawnCommand
 * @param args - CLI arguments
 * @returns Command and args for spawn
 */
function parseCodexCommand(codexPath: string, args: string[]): { command: string; args: string[] } {
  // Check for npx fallback (prefixed with "npx:")
  if (codexPath.startsWith('npx:')) {
    const npxPath = codexPath.slice(4); // Remove "npx:" prefix
    // npx @openai/codex exec [args]
    return {
      command: npxPath,
      args: ['@openai/codex', ...args],
    };
  }

  // Direct codex path
  return { command: codexPath, args };
}

/**
 * Check if Codex CLI is available
 * Uses codex-cli-path.ts for cross-platform path detection.
 *
 * @returns Promise resolving to availability status
 */
export async function isCodexCliAvailable(): Promise<{
  available: boolean;
  reason?: string;
}> {
  const codexPath = await getCodexSpawnCommand();

  if (codexPath) {
    log('INFO', 'Codex CLI is available', { path: codexPath });
    return { available: true };
  }

  log('WARN', 'Codex CLI not available');
  return { available: false, reason: 'COMMAND_NOT_FOUND' };
}

/**
 * Execute Codex CLI with a prompt and return the output (non-streaming)
 * Uses nano-spawn with stdin support for cross-platform compatibility.
 *
 * @param prompt - The prompt to send to Codex CLI via stdin
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution
 * @param model - Codex model to use (default: '' = inherit from CLI config)
 * @param reasoningEffort - Reasoning effort level (default: 'low')
 * @param resumeSessionId - Optional thread ID to resume a previous session
 * @returns Execution result with success status and output/error
 */
export async function executeCodexCLI(
  prompt: string,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: CodexModel = DEFAULT_CODEX_MODEL,
  reasoningEffort: CodexReasoningEffort = 'low',
  resumeSessionId?: string
): Promise<CodexExecutionResult> {
  const startTime = Date.now();

  log('INFO', 'Starting Codex CLI execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    reasoningEffort,
    cwd: workingDirectory ?? process.cwd(),
    resumeSessionId: resumeSessionId ? '(present)' : undefined,
  });

  // Get Codex CLI path (handles GUI-launched VSCode where PATH is different)
  const codexPath = await getCodexSpawnCommand();
  if (!codexPath) {
    log('ERROR', 'Codex CLI not found during execution');
    return {
      success: false,
      error: {
        code: 'COMMAND_NOT_FOUND',
        message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
        details: 'Unable to locate codex executable via shell or PATH',
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  try {
    // Build CLI arguments with '-' to read prompt from stdin
    // --skip-git-repo-check: bypass trust check since user is explicitly using extension
    // For session resume: codex exec resume <thread_id> [options] -
    const args = resumeSessionId
      ? ['exec', 'resume', resumeSessionId, '--json', '--skip-git-repo-check']
      : ['exec', '--json', '--skip-git-repo-check'];
    if (model) {
      args.push('-m', model);
    }
    // Add reasoning effort configuration
    if (reasoningEffort) {
      args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
    }
    args.push('--full-auto', '-');

    // Parse command (handles npx fallback)
    const spawnCmd = parseCodexCommand(codexPath, args);

    log('DEBUG', 'Spawning Codex CLI process', {
      command: spawnCmd.command,
      args: spawnCmd.args,
    });

    // Spawn using nano-spawn (cross-platform compatible)
    const subprocess = spawn(spawnCmd.command, spawnCmd.args, {
      cwd: workingDirectory,
      timeout: timeoutMs > 0 ? timeoutMs : undefined,
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

    // Parse output
    const parsedOutput = parseCodexOutput(result.stdout);
    const output = extractJsonResponse(parsedOutput);
    const extractedSessionId = extractThreadIdFromOutput(result.stdout);

    log('INFO', 'Codex CLI execution succeeded', {
      executionTimeMs,
      outputLength: output.length,
      wasExtracted: output !== parsedOutput,
      sessionId: extractedSessionId,
    });

    return {
      success: true,
      output: output.trim(),
      executionTimeMs,
      sessionId: extractedSessionId,
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
      executionTimeMs,
    });

    // Handle SubprocessError from nano-spawn
    if (isSubprocessError(error)) {
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
            message: `AI generation timed out after ${Math.floor(timeoutMs / 1000)} seconds.`,
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

      // npx fallback failed
      if (error.stderr?.includes('could not determine executable to run')) {
        log('WARN', 'Codex CLI not installed (npx fallback failed)', {
          stderr: error.stderr,
        });
        return {
          success: false,
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
            details: error.stderr,
          },
          executionTimeMs,
        };
      }

      // Non-zero exit code
      log('ERROR', 'Codex CLI execution failed', {
        exitCode: error.exitCode,
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
 * Uses nano-spawn with stdin support for cross-platform compatibility.
 *
 * @param prompt - The prompt to send to Codex CLI via stdin
 * @param onProgress - Callback invoked with each text chunk
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution
 * @param model - Codex model to use (default: '' = inherit from CLI config)
 * @param reasoningEffort - Reasoning effort level (default: 'low')
 * @param resumeSessionId - Optional thread ID to resume a previous session
 * @returns Execution result with success status and output/error
 */
export async function executeCodexCLIStreaming(
  prompt: string,
  onProgress: StreamingProgressCallback,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: CodexModel = DEFAULT_CODEX_MODEL,
  reasoningEffort: CodexReasoningEffort = 'low',
  resumeSessionId?: string
): Promise<CodexExecutionResult> {
  const startTime = Date.now();
  let accumulated = '';
  let extractedSessionId: string | undefined;

  log('INFO', 'Starting Codex CLI streaming execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    reasoningEffort,
    cwd: workingDirectory ?? process.cwd(),
    resumeSessionId: resumeSessionId ? '(present)' : undefined,
  });

  // Get Codex CLI path (handles GUI-launched VSCode where PATH is different)
  const codexPath = await getCodexSpawnCommand();
  if (!codexPath) {
    log('ERROR', 'Codex CLI not found during streaming execution');
    return {
      success: false,
      error: {
        code: 'COMMAND_NOT_FOUND',
        message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
        details: 'Unable to locate codex executable via shell or PATH',
      },
      executionTimeMs: Date.now() - startTime,
    };
  }

  try {
    // Build CLI arguments with '-' to read prompt from stdin
    // --skip-git-repo-check: bypass trust check since user is explicitly using extension
    // For session resume: codex exec resume <thread_id> [options] -
    const args = resumeSessionId
      ? ['exec', 'resume', resumeSessionId, '--json', '--skip-git-repo-check']
      : ['exec', '--json', '--skip-git-repo-check'];
    if (model) {
      args.push('-m', model);
    }
    // Add reasoning effort configuration
    if (reasoningEffort) {
      args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
    }
    args.push('--full-auto', '-');

    // Parse command (handles npx fallback)
    const spawnCmd = parseCodexCommand(codexPath, args);

    log('DEBUG', 'Spawning Codex CLI streaming process', {
      command: spawnCmd.command,
      args: spawnCmd.args,
    });

    // Spawn using nano-spawn (cross-platform compatible)
    const subprocess = spawn(spawnCmd.command, spawnCmd.args, {
      cwd: workingDirectory,
      timeout: timeoutMs > 0 ? timeoutMs : undefined,
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
    // Line buffer for JSONL parsing
    let lineBuffer = '';
    // Collect stderr for debugging
    let stderrOutput = '';

    // Start collecting stderr in background (for debugging)
    const stderrPromise = (async () => {
      for await (const chunk of subprocess.stderr) {
        stderrOutput += chunk;
        log('DEBUG', 'Codex stderr chunk received', {
          chunkLength: chunk.length,
          totalStderrLength: stderrOutput.length,
          preview: chunk.substring(0, 200),
        });
      }
    })();

    // Process streaming output using AsyncIterable
    let stdoutChunkCount = 0;
    for await (const chunk of subprocess.stdout) {
      stdoutChunkCount++;
      log('DEBUG', 'Codex stdout chunk received', {
        chunkNumber: stdoutChunkCount,
        chunkLength: chunk.length,
        preview: chunk.substring(0, 200),
        hasNewline: chunk.includes('\n'),
      });
      // Normalize CRLF to LF for cross-platform compatibility
      const normalizedChunk = chunk.replace(/\r\n/g, '\n');

      // Codex CLI may output complete JSON objects without trailing newlines
      // Each chunk from nano-spawn might be a complete JSONL line
      // Handle both cases: chunks with newlines (split normally) and without (treat as complete line)
      let linesToProcess: string[];

      if (normalizedChunk.includes('\n')) {
        // Chunk contains newlines - use normal JSONL parsing
        lineBuffer += normalizedChunk;
        const lines = lineBuffer.split('\n');
        // Keep the last potentially incomplete line in buffer
        lineBuffer = lines.pop() || '';
        linesToProcess = lines;
      } else {
        // No newlines - treat entire chunk as a complete JSON line
        // But first check if we have buffered content to prepend
        if (lineBuffer) {
          lineBuffer += normalizedChunk;
          linesToProcess = [lineBuffer];
          lineBuffer = '';
        } else {
          linesToProcess = [normalizedChunk];
        }
      }

      for (const line of linesToProcess) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line);

          log('DEBUG', 'Codex streaming JSON line parsed', {
            type: parsed.type,
            hasContent: !!parsed.content,
            hasItem: !!parsed.item,
          });

          // Handle Codex CLI JSONL event types
          if (parsed.type === 'item.completed' && parsed.item) {
            const item = parsed.item;

            // Extract content from item
            if (item.content && Array.isArray(item.content)) {
              for (const block of item.content) {
                if (block.type === 'text' && block.text) {
                  accumulated += block.text;
                  explanatoryText = accumulated;
                  currentToolInfo = '';
                  onProgress(block.text, explanatoryText, explanatoryText, 'text');
                } else if (block.type === 'tool_use' && block.name) {
                  currentToolInfo = block.name;
                  const displayText = explanatoryText
                    ? `${explanatoryText}\n\n🔧 ${currentToolInfo}`
                    : `🔧 ${currentToolInfo}`;
                  onProgress(currentToolInfo, displayText, explanatoryText, 'tool_use');
                } else if (block.type === 'function_call' && block.name) {
                  currentToolInfo = block.name;
                  const displayText = explanatoryText
                    ? `${explanatoryText}\n\n🔧 ${currentToolInfo}`
                    : `🔧 ${currentToolInfo}`;
                  onProgress(currentToolInfo, displayText, explanatoryText, 'tool_use');
                }
              }
            } else if (typeof item.content === 'string') {
              accumulated += item.content;
              explanatoryText = accumulated;
              currentToolInfo = '';
              onProgress(item.content, explanatoryText, explanatoryText, 'text');
            }

            // Check for output field
            if (item.output && typeof item.output === 'string') {
              accumulated += item.output;
              explanatoryText = accumulated;
              currentToolInfo = '';
              onProgress(item.output, explanatoryText, explanatoryText, 'text');
            }

            // Codex CLI uses item.text for agent_message type
            if (item.text && typeof item.text === 'string') {
              const textContent = item.text;
              let displayContent = item.text;

              // Try to parse item.text as JSON
              try {
                const textJson = JSON.parse(item.text);
                if (textJson.status && textJson.message) {
                  displayContent = textJson.message;
                  log('DEBUG', 'Parsed JSON from item.text', {
                    status: textJson.status,
                    messageLength: textJson.message.length,
                  });
                }
              } catch {
                // Not JSON, use as-is
              }

              accumulated += textContent;
              explanatoryText = displayContent;
              currentToolInfo = '';
              onProgress(displayContent, displayContent, displayContent, 'text');
            }
          } else if (parsed.type === 'message' && parsed.content) {
            const content = parsed.content;

            if (typeof content === 'string') {
              accumulated += content;
              explanatoryText = accumulated;
              currentToolInfo = '';
              onProgress(content, explanatoryText, explanatoryText, 'text');
            } else if (Array.isArray(content)) {
              for (const block of content) {
                if (block.type === 'text' && block.text) {
                  accumulated += block.text;
                  explanatoryText = accumulated;
                  currentToolInfo = '';
                  onProgress(block.text, explanatoryText, explanatoryText, 'text');
                } else if (block.type === 'tool_use' && block.name) {
                  currentToolInfo = block.name;
                  const displayText = explanatoryText
                    ? `${explanatoryText}\n\n🔧 ${currentToolInfo}`
                    : `🔧 ${currentToolInfo}`;
                  onProgress(currentToolInfo, displayText, explanatoryText, 'tool_use');
                }
              }
            }
          } else if (parsed.type === 'tool_use' || parsed.type === 'function_call') {
            const toolName = parsed.name || parsed.function?.name || 'Unknown tool';
            currentToolInfo = toolName;
            const displayText = explanatoryText
              ? `${explanatoryText}\n\n🔧 ${currentToolInfo}`
              : `🔧 ${currentToolInfo}`;
            onProgress(currentToolInfo, displayText, explanatoryText, 'tool_use');
          } else if (parsed.type === 'text' || parsed.type === 'assistant') {
            const text = parsed.text || parsed.content || '';
            if (text) {
              accumulated += text;
              explanatoryText = accumulated;
              currentToolInfo = '';
              onProgress(text, explanatoryText, explanatoryText, 'text');
            }
          } else if (parsed.type === 'thread.started') {
            // Extract thread_id for session continuation
            if (parsed.thread_id) {
              extractedSessionId = parsed.thread_id;
              log('INFO', 'Extracted thread ID from Codex thread.started event', {
                threadId: extractedSessionId,
              });
            }
          } else if (parsed.type === 'turn.started' || parsed.type === 'turn.completed') {
            log('DEBUG', `Codex lifecycle event: ${parsed.type}`);
          }
        } catch {
          log('DEBUG', 'Skipping non-JSON line in Codex streaming output', {
            lineLength: line.length,
            linePreview: line.substring(0, 100),
          });
        }
      }
    }

    // Process any remaining content in lineBuffer
    if (lineBuffer.trim()) {
      log('DEBUG', 'Processing remaining lineBuffer content', {
        bufferLength: lineBuffer.length,
        bufferPreview: lineBuffer.substring(0, 200),
      });
      try {
        const parsed = JSON.parse(lineBuffer);
        // Handle remaining JSON (same logic as above, simplified)
        if (parsed.type === 'item.completed' && parsed.item?.text) {
          accumulated += parsed.item.text;
        }
      } catch {
        log('DEBUG', 'Could not parse remaining lineBuffer as JSON');
      }
    }

    // Wait for subprocess to complete
    const result = await subprocess;

    // Wait for stderr collection to complete
    await stderrPromise;

    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active Codex streaming process (success) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    // Extract JSON response from accumulated output
    const extractedOutput = extractJsonResponse(accumulated);

    log('INFO', 'Codex CLI streaming execution succeeded', {
      executionTimeMs,
      stdoutChunkCount,
      accumulatedLength: accumulated.length,
      extractedLength: extractedOutput.length,
      wasExtracted: extractedOutput !== accumulated,
      sessionId: extractedSessionId,
      stderrLength: stderrOutput.length,
      resultStdoutLength: result.stdout.length,
      resultStderrLength: result.stderr.length,
    });

    // Debug: Log raw output if nothing was accumulated
    if (accumulated.length === 0) {
      log('WARN', 'No output accumulated from Codex streaming', {
        resultStdout: result.stdout.substring(0, 1000),
        resultStderr: result.stderr.substring(0, 1000),
        stderrOutput: stderrOutput.substring(0, 1000),
      });
    }

    return {
      success: true,
      output: extractedOutput || result.stdout.trim(),
      executionTimeMs,
      sessionId: extractedSessionId,
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
      exitCode: isSubprocessError(error) ? error.exitCode : undefined,
      stderr: isSubprocessError(error) ? error.stderr?.substring(0, 500) : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Handle SubprocessError from nano-spawn
    if (isSubprocessError(error)) {
      const isTimeout =
        (error.isTerminated && error.signalName === 'SIGTERM') || error.exitCode === 143;

      if (isTimeout) {
        log('WARN', 'Codex CLI streaming execution timed out', {
          timeoutMs,
          executionTimeMs,
          exitCode: error.exitCode,
          accumulatedLength: accumulated.length,
        });

        return {
          success: false,
          output: accumulated,
          error: {
            code: 'TIMEOUT',
            message: `AI generation timed out after ${Math.floor(timeoutMs / 1000)} seconds.`,
            details: `Timeout after ${timeoutMs}ms`,
          },
          executionTimeMs,
          sessionId: extractedSessionId,
        };
      }

      // Command not found (ENOENT)
      if (error.code === 'ENOENT') {
        return {
          success: false,
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
            details: error.message,
          },
          executionTimeMs,
          sessionId: extractedSessionId,
        };
      }

      // npx fallback failed
      if (error.stderr?.includes('could not determine executable to run')) {
        log('WARN', 'Codex CLI not installed (npx fallback failed)', {
          stderr: error.stderr,
        });
        return {
          success: false,
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
            details: error.stderr,
          },
          executionTimeMs,
          sessionId: extractedSessionId,
        };
      }

      // Non-zero exit code
      return {
        success: false,
        output: accumulated,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Generation failed - please try again or rephrase your description',
          details: `Exit code: ${error.exitCode ?? 'unknown'}, stderr: ${error.stderr ?? 'none'}`,
        },
        executionTimeMs,
        sessionId: extractedSessionId,
      };
    }

    // Unknown error type
    return {
      success: false,
      output: accumulated,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
      sessionId: extractedSessionId,
    };
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

  // nano-spawn v2.0.0: nodeChildProcess is a Promise that resolves to ChildProcess
  const childProcess = await subprocess.nodeChildProcess;

  log('INFO', `Cancelling Codex process for requestId: ${requestId}`, {
    pid: childProcess.pid,
    elapsedMs: executionTimeMs,
  });

  // Kill the process (cross-platform compatible)
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
 * Extract JSON response from mixed text that may contain AI reasoning
 * Codex CLI may output reasoning text followed by JSON response
 * When multiple JSON objects exist, returns the LAST valid one (final response)
 *
 * @param text - Mixed text potentially containing reasoning and JSON
 * @returns Extracted JSON string if found, or original text
 */
function extractJsonResponse(text: string): string {
  // Find ALL occurrences of JSON objects with {"status": pattern
  const statusPattern = /\{"status"\s*:\s*"(?:success|clarification|error)"/g;
  let lastValidJson = '';
  let match: RegExpExecArray | null = statusPattern.exec(text);

  while (match !== null) {
    const jsonStart = match.index;
    const potentialJson = text.substring(jsonStart);

    // Find the matching closing brace
    let braceCount = 0;
    let jsonEnd = -1;
    for (let i = 0; i < potentialJson.length; i++) {
      if (potentialJson[i] === '{') braceCount++;
      if (potentialJson[i] === '}') braceCount--;
      if (braceCount === 0) {
        jsonEnd = i + 1;
        break;
      }
    }

    if (jsonEnd > 0) {
      const jsonStr = potentialJson.substring(0, jsonEnd);
      try {
        JSON.parse(jsonStr); // Validate it's valid JSON
        lastValidJson = jsonStr; // Keep the last valid one
      } catch {
        // Skip invalid JSON
      }
    }
    match = statusPattern.exec(text);
  }

  if (lastValidJson) {
    log('DEBUG', 'Extracted last JSON response from Codex output', {
      originalLength: text.length,
      jsonLength: lastValidJson.length,
    });
    return lastValidJson;
  }

  return text;
}

/**
 * Extract thread_id from Codex CLI JSONL output for session continuation
 * Looks for the thread.started event which contains the thread_id
 *
 * @param output - Raw JSONL output from Codex CLI
 * @returns Extracted thread_id or undefined if not found
 */
function extractThreadIdFromOutput(output: string): string | undefined {
  const lines = output.trim().split('\n');

  for (const line of lines) {
    if (!line.trim()) continue;

    try {
      const parsed = JSON.parse(line);

      if (parsed.type === 'thread.started' && parsed.thread_id) {
        log('INFO', 'Extracted thread ID from Codex output (non-streaming)', {
          threadId: parsed.thread_id,
        });
        return parsed.thread_id;
      }
    } catch {
      // Ignore parse errors
    }
  }

  return undefined;
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
      if (parsed.type === 'item.completed' && parsed.item) {
        const item = parsed.item;
        if (item.content && Array.isArray(item.content)) {
          const textBlocks = item.content
            .filter((b: { type: string }) => b.type === 'text')
            .map((b: { text: string }) => b.text)
            .join('\n');
          if (textBlocks) {
            finalContent += textBlocks;
          }
        } else if (typeof item.content === 'string') {
          finalContent += item.content;
        }
        if (item.output && typeof item.output === 'string') {
          finalContent += item.output;
        }
        if (item.text && typeof item.text === 'string') {
          finalContent += item.text;
        }
      } else if (parsed.type === 'message' && parsed.content) {
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

  return finalContent || output;
}
