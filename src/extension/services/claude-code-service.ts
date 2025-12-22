/**
 * Claude Code CLI Service
 *
 * Executes Claude Code CLI commands for AI-assisted workflow generation.
 * Based on: /specs/001-ai-workflow-generation/research.md Q1
 *
 * Updated to use nano-spawn for cross-platform compatibility (Windows/Unix)
 * See: Issue #79 - Windows environment compatibility
 */

import type { ChildProcess } from 'node:child_process';
import nanoSpawn from 'nano-spawn';
import type { ClaudeModel } from '../../shared/types/messages';
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
  // nano-spawn v2.0.0: nodeChildProcess is a Promise that resolves to ChildProcess
  // (spawnSubprocess is an async function)
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
 * Map ClaudeModel type to Claude CLI model alias
 * See: https://code.claude.com/docs/en/model-config.md
 */
function getCliModelName(model: ClaudeModel): string {
  // Claude CLI accepts model aliases: 'sonnet', 'opus', 'haiku'
  return model;
}

/**
 * Execute Claude Code CLI with a prompt and return the output
 *
 * @param prompt - The prompt to send to Claude Code CLI
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution (defaults to current directory)
 * @param model - Claude model to use (default: 'sonnet')
 * @param allowedTools - Optional array of allowed tool names (e.g., ['Read', 'Grep', 'Glob'])
 * @returns Execution result with success status and output/error
 */
export async function executeClaudeCodeCLI(
  prompt: string,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: ClaudeModel = 'sonnet',
  allowedTools?: string[]
): Promise<ClaudeCodeExecutionResult> {
  const startTime = Date.now();

  const modelName = getCliModelName(model);

  log('INFO', 'Starting Claude Code CLI execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    modelName,
    allowedTools,
    cwd: workingDirectory ?? process.cwd(),
  });

  try {
    // Build CLI arguments
    const args = ['claude', '-p', '-', '--model', modelName];

    // Add --tools and --allowed-tools flags if provided
    // --tools: whitelist restriction (only these tools available)
    // --allowed-tools: no permission prompt for these tools
    if (allowedTools && allowedTools.length > 0) {
      args.push('--tools', allowedTools.join(','));
      args.push('--allowed-tools', allowedTools.join(','));
    }

    // Spawn Claude Code CLI process using nano-spawn (cross-platform compatible)
    // Use stdin for prompt instead of -p argument to avoid Windows command line length limits
    // Use npx to ensure cross-platform compatibility (Windows PATH issues with global npm installs)
    const subprocess = spawn('npx', args, {
      cwd: workingDirectory,
      timeout: timeoutMs,
      stdin: { string: prompt },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Register as active process if requestId is provided
    if (requestId) {
      activeProcesses.set(requestId, { subprocess, startTime });
      log('INFO', `Registered active process for requestId: ${requestId}`);
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
      // Timeout error detection:
      // - nano-spawn may set isTerminated=true and signalName='SIGTERM'
      // - OR it may only set exitCode=143 (128 + 15 = SIGTERM)
      const isTimeout =
        (error.isTerminated && error.signalName === 'SIGTERM') || error.exitCode === 143;

      if (isTimeout) {
        log('WARN', 'Claude Code CLI execution timed out', {
          timeoutMs,
          executionTimeMs,
          exitCode: error.exitCode,
          isTerminated: error.isTerminated,
          signalName: error.signalName,
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
 * Handles multiple output formats:
 * 1. Markdown-wrapped: ```json { ... } ```
 * 2. Raw JSON: { ... }
 * 3. Text with embedded JSON block: "Some text...\n```json\n{...}\n```"
 *
 * Note: Uses string position-based extraction (not regex) to handle cases
 * where the JSON content itself contains markdown code blocks.
 *
 * @param output - Raw output string from CLI
 * @returns Parsed JSON object or null if parsing fails
 */
export function parseClaudeCodeOutput(output: string): unknown {
  try {
    const trimmed = output.trim();

    // Strategy 1: If wrapped in ```json...```, remove outer markers only
    if (trimmed.startsWith('```json') && trimmed.endsWith('```')) {
      const jsonContent = trimmed
        .slice(7) // Remove ```json
        .slice(0, -3) // Remove trailing ```
        .trim();
      return JSON.parse(jsonContent);
    }

    // Strategy 2: Try parsing as-is (raw JSON)
    if (trimmed.startsWith('{')) {
      return JSON.parse(trimmed);
    }

    // Strategy 3: Find ```json block within text (e.g., explanation + JSON)
    const jsonBlockStart = trimmed.indexOf('```json');
    if (jsonBlockStart !== -1) {
      // Find the closing ``` after the json block
      const contentStart = jsonBlockStart + 7; // Skip ```json
      const jsonBlockEnd = trimmed.lastIndexOf('```');
      if (jsonBlockEnd > contentStart) {
        const jsonContent = trimmed.slice(contentStart, jsonBlockEnd).trim();
        return JSON.parse(jsonContent);
      }
    }

    // Strategy 4: Try parsing as-is (fallback)
    return JSON.parse(trimmed);
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
export async function cancelGeneration(requestId: string): Promise<{
  cancelled: boolean;
  executionTimeMs?: number;
}> {
  const activeGen = activeProcesses.get(requestId);

  if (!activeGen) {
    log('WARN', `No active generation found for requestId: ${requestId}`);
    return { cancelled: false };
  }

  const { subprocess, startTime } = activeGen;
  const executionTimeMs = Date.now() - startTime;

  // nano-spawn v2.0.0: nodeChildProcess is a Promise that resolves to ChildProcess
  // We need to await it before calling kill()
  const childProcess = await subprocess.nodeChildProcess;

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
 * Progress callback for streaming CLI execution
 * @param chunk - Current text chunk
 * @param displayText - Display text (may include tool usage info) - for streaming display
 * @param explanatoryText - Explanatory text only (no tool info) - for preserving in chat history
 */
export type StreamingProgressCallback = (
  chunk: string,
  displayText: string,
  explanatoryText: string,
  contentType?: 'tool_use' | 'text'
) => void;

/**
 * Execute Claude Code CLI with streaming output
 *
 * Uses --output-format stream-json to receive real-time output from Claude Code CLI.
 * The onProgress callback is invoked for each text chunk received.
 *
 * @param prompt - The prompt to send to Claude Code CLI
 * @param onProgress - Callback invoked with each text chunk and accumulated text
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution
 * @param model - Claude model to use (default: 'sonnet')
 * @param allowedTools - Array of allowed tool names for CLI (optional)
 * @returns Execution result with success status and output/error
 */
export async function executeClaudeCodeCLIStreaming(
  prompt: string,
  onProgress: StreamingProgressCallback,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: ClaudeModel = 'sonnet',
  allowedTools?: string[]
): Promise<ClaudeCodeExecutionResult> {
  const startTime = Date.now();
  let accumulated = '';

  const modelName = getCliModelName(model);

  log('INFO', 'Starting Claude Code CLI streaming execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    modelName,
    allowedTools,
    cwd: workingDirectory ?? process.cwd(),
  });

  try {
    // Build CLI arguments
    const args = [
      'claude',
      '-p',
      '-',
      '--output-format',
      'stream-json',
      '--verbose',
      '--model',
      modelName,
    ];

    // Add --tools and --allowed-tools flags if provided
    // --tools: whitelist restriction (only these tools available)
    // --allowed-tools: no permission prompt for these tools
    if (allowedTools && allowedTools.length > 0) {
      args.push('--tools', allowedTools.join(','));
      args.push('--allowed-tools', allowedTools.join(','));
    }

    // Spawn Claude Code CLI with streaming output format
    // Note: --verbose is required when using --output-format=stream-json with -p (print mode)
    const subprocess = spawn('npx', args, {
      cwd: workingDirectory,
      timeout: timeoutMs,
      stdin: { string: prompt },
      stdout: 'pipe',
      stderr: 'pipe',
    });

    // Register as active process if requestId is provided
    if (requestId) {
      activeProcesses.set(requestId, { subprocess, startTime });
      log('INFO', `Registered active streaming process for requestId: ${requestId}`);
    }

    // Track explanatory text (non-JSON text from AI, for chat history)
    let explanatoryText = '';
    // Track current tool info for display (not preserved in history)
    let currentToolInfo = '';

    // Process streaming output using AsyncIterable
    for await (const chunk of subprocess.stdout) {
      // Split by newlines (JSON Lines format)
      const lines = chunk.split('\n').filter((line: string) => line.trim());

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line);

          // Log parsed streaming JSON for debugging
          log('DEBUG', 'Streaming JSON line parsed', {
            type: parsed.type,
            hasMessage: !!parsed.message,
            contentTypes: parsed.message?.content?.map((c: { type: string }) => c.type),
            // Show content preview (truncated to 500 chars)
            contentPreview:
              parsed.type === 'assistant' && parsed.message?.content
                ? parsed.message.content
                    .filter((c: { type: string }) => c.type === 'text')
                    .map((c: { text: string }) => c.text?.substring(0, 200))
                    .join('')
                : JSON.stringify(parsed).substring(0, 500),
          });

          // Extract content from assistant messages
          if (parsed.type === 'assistant' && parsed.message?.content) {
            for (const content of parsed.message.content) {
              // Handle tool_use content - show tool name and relevant details (display only)
              if (content.type === 'tool_use' && content.name) {
                const toolName = content.name;
                const input = content.input || {};
                let description = '';

                // Extract relevant info based on tool type
                if (toolName === 'Read' && input.file_path) {
                  description = input.file_path;
                } else if (toolName === 'Bash' && input.command) {
                  description = input.command.substring(0, 100);
                } else if (toolName === 'Task' && input.description) {
                  description = input.description;
                } else if (toolName === 'Glob' && input.pattern) {
                  description = input.pattern;
                } else if (toolName === 'Grep' && input.pattern) {
                  description = input.pattern;
                } else if (toolName === 'Edit' && input.file_path) {
                  description = input.file_path;
                } else if (toolName === 'Write' && input.file_path) {
                  description = input.file_path;
                }

                currentToolInfo = description ? `${toolName}: ${description}` : toolName;

                // Build display text (explanatory + tool info)
                const displayText = explanatoryText
                  ? `${explanatoryText}\n\n🔧 ${currentToolInfo}`
                  : `🔧 ${currentToolInfo}`;

                onProgress(currentToolInfo, displayText, explanatoryText, 'tool_use');
              }

              // Handle text content
              if (content.type === 'text' && content.text) {
                // Add separator between text chunks for better readability
                if (accumulated.length > 0 && !accumulated.endsWith('\n')) {
                  accumulated += '\n\n';
                }
                accumulated += content.text;

                // Check if accumulated text looks like JSON response
                const trimmedAccumulated = accumulated.trim();
                let strippedText = trimmedAccumulated;

                // Strip markdown code block markers
                if (strippedText.startsWith('```json')) {
                  strippedText = strippedText.slice(7).trimStart();
                } else if (strippedText.startsWith('```')) {
                  strippedText = strippedText.slice(3).trimStart();
                }
                if (strippedText.endsWith('```')) {
                  strippedText = strippedText.slice(0, -3).trimEnd();
                }

                // Try to parse as JSON - if successful, skip progress (let success handler show it)
                try {
                  const jsonResponse = JSON.parse(strippedText);
                  log('DEBUG', 'JSON parse succeeded in text content handler', {
                    hasStatus: !!jsonResponse.status,
                    hasMessage: !!jsonResponse.message,
                    hasValues: !!jsonResponse.values,
                  });
                  // JSON parsed successfully - don't call onProgress for JSON content
                } catch {
                  // JSON parsing failed - this is explanatory text or incomplete JSON
                  // Only show if it doesn't look like JSON being built
                  const looksLikeJsonStart =
                    strippedText.startsWith('{') || trimmedAccumulated.startsWith('```');

                  log('DEBUG', 'JSON parse failed in text content handler', {
                    looksLikeJsonStart,
                    strippedTextStartsWith: strippedText.substring(0, 20),
                    trimmedAccumulatedStartsWith: trimmedAccumulated.substring(0, 20),
                  });

                  if (!looksLikeJsonStart) {
                    // This is explanatory text from AI
                    // Check if text contains ```json block and extract text before it
                    const jsonBlockIndex = trimmedAccumulated.indexOf('```json');
                    if (jsonBlockIndex !== -1) {
                      explanatoryText = trimmedAccumulated.slice(0, jsonBlockIndex).trim();
                      log('DEBUG', 'Extracted explanatory text before ```json', {
                        explanatoryTextLength: explanatoryText.length,
                        explanatoryTextPreview: explanatoryText.substring(0, 200),
                      });
                    } else {
                      explanatoryText = trimmedAccumulated;
                    }

                    // Clear tool info when new text comes (text replaces tool display)
                    currentToolInfo = '';

                    // Display text is same as explanatory text when no tool is active
                    onProgress(content.text, explanatoryText, explanatoryText, 'text');
                  }
                }
              }
            }
          }
        } catch {
          // Ignore JSON parse errors (may be partial chunks)
          log('DEBUG', 'Skipping non-JSON line in streaming output', {
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
      log('INFO', `Removed active streaming process (success) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    log('INFO', 'Claude Code CLI streaming execution succeeded', {
      executionTimeMs,
      accumulatedLength: accumulated.length,
      rawOutputLength: result.stdout.length,
    });

    return {
      success: true,
      output: accumulated || result.stdout.trim(),
      executionTimeMs,
    };
  } catch (error) {
    // Remove from active processes
    if (requestId) {
      activeProcesses.delete(requestId);
      log('INFO', `Removed active streaming process (error) for requestId: ${requestId}`);
    }

    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Claude Code CLI streaming error caught', {
      errorType: typeof error,
      errorConstructor: error?.constructor?.name,
      executionTimeMs,
      accumulatedLength: accumulated.length,
      // Add detailed error info for debugging
      exitCode: isSubprocessError(error) ? error.exitCode : undefined,
      stderr: isSubprocessError(error) ? error.stderr?.substring(0, 500) : undefined,
      stdout: isSubprocessError(error) ? error.stdout?.substring(0, 500) : undefined,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Handle SubprocessError from nano-spawn
    if (isSubprocessError(error)) {
      const isTimeout =
        (error.isTerminated && error.signalName === 'SIGTERM') || error.exitCode === 143;

      if (isTimeout) {
        log('WARN', 'Claude Code CLI streaming execution timed out', {
          timeoutMs,
          executionTimeMs,
          exitCode: error.exitCode,
          accumulatedLength: accumulated.length,
        });

        return {
          success: false,
          output: accumulated, // Return accumulated content even on timeout
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
      return {
        success: false,
        output: accumulated, // Return accumulated content even on error
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Generation failed - please try again or rephrase your description',
          details: `Exit code: ${error.exitCode ?? 'unknown'}, stderr: ${error.stderr ?? 'none'}`,
        },
        executionTimeMs,
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
    };
  }
}

/**
 * Cancel an active refinement process
 *
 * @param requestId - Request ID of the refinement to cancel
 * @returns True if process was found and killed, false otherwise
 */
export async function cancelRefinement(requestId: string): Promise<{
  cancelled: boolean;
  executionTimeMs?: number;
}> {
  const activeGen = activeProcesses.get(requestId);

  if (!activeGen) {
    log('WARN', `No active refinement found for requestId: ${requestId}`);
    return { cancelled: false };
  }

  const { subprocess, startTime } = activeGen;
  const executionTimeMs = Date.now() - startTime;

  // nano-spawn v2.0.0: nodeChildProcess is a Promise that resolves to ChildProcess
  // We need to await it before calling kill()
  const childProcess = await subprocess.nodeChildProcess;

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
