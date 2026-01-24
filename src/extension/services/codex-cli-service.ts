/**
 * Codex CLI Service
 *
 * Executes OpenAI Codex CLI commands for AI-assisted workflow generation and refinement.
 * Based on Codex CLI documentation: https://developers.openai.com/codex/cli/reference/
 *
 * Uses Node.js child_process for stdin support.
 * Uses codex-cli-path.ts for cross-platform CLI path detection (handles GUI-launched VSCode).
 */

import { type ChildProcess, spawn as nodeSpawn } from 'node:child_process';
import type { CodexModel, CodexReasoningEffort } from '../../shared/types/messages';
import { log } from '../extension';
import { clearCodexCliPathCache, getCodexSpawnCommand } from './codex-cli-path';

// Re-export for external use
export { clearCodexCliPathCache };

/**
 * Active generation processes
 * Key: requestId, Value: child process and start time
 */
const activeProcesses = new Map<string, { process: ChildProcess; startTime: number }>();

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
 * Uses Node.js child_process.spawn with stdin piping to handle large prompts.
 *
 * @param prompt - The prompt to send to Codex CLI via stdin
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution
 * @param model - Codex model to use (default: '' = inherit from CLI config)
 * @param reasoningEffort - Reasoning effort level (default: 'minimal')
 * @returns Execution result with success status and output/error
 */
export async function executeCodexCLI(
  prompt: string,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: CodexModel = DEFAULT_CODEX_MODEL,
  reasoningEffort: CodexReasoningEffort = 'low'
): Promise<CodexExecutionResult> {
  const startTime = Date.now();

  log('INFO', 'Starting Codex CLI execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    reasoningEffort,
    cwd: workingDirectory ?? process.cwd(),
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

  return new Promise((resolve) => {
    // Build CLI arguments with '-' to read prompt from stdin
    // --skip-git-repo-check: bypass trust check since user is explicitly using extension
    const args = ['exec', '--json', '--skip-git-repo-check'];
    if (model) {
      args.push('-m', model);
    }
    // Add reasoning effort configuration
    if (reasoningEffort) {
      args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
    }
    args.push('--full-auto', '-');

    log('DEBUG', 'Spawning Codex CLI process', {
      command: codexPath,
      args,
    });

    const childProcess = nodeSpawn(codexPath, args, {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Register as active process if requestId is provided
    if (requestId) {
      activeProcesses.set(requestId, { process: childProcess, startTime });
      log('INFO', `Registered active Codex process for requestId: ${requestId}`);
    }

    let stdout = '';
    let stderr = '';
    let timeoutId: NodeJS.Timeout | undefined;
    let timedOut = false;

    // Set up timeout
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        // On Windows: kill() sends an unconditional termination
        // On Unix: kill() sends SIGTERM (graceful termination)
        childProcess.kill();
        log('WARN', 'Codex CLI execution timed out', { timeoutMs });
      }, timeoutMs);
    }

    // Collect stdout
    childProcess.stdout?.on('data', (data: Buffer) => {
      stdout += data.toString();
    });

    // Collect stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Handle process completion
    childProcess.on('close', (code, signal) => {
      if (timeoutId) clearTimeout(timeoutId);

      // Remove from active processes
      if (requestId) {
        activeProcesses.delete(requestId);
        log('INFO', `Removed active Codex process for requestId: ${requestId}`);
      }

      const executionTimeMs = Date.now() - startTime;

      // Check for timeout (use flag instead of signal for cross-platform compatibility)
      if (timedOut) {
        resolve({
          success: false,
          error: {
            code: 'TIMEOUT',
            message: `AI generation timed out after ${Math.floor(timeoutMs / 1000)} seconds.`,
            details: `Timeout after ${timeoutMs}ms`,
          },
          executionTimeMs,
        });
        return;
      }

      // Check for success
      if (code === 0) {
        const parsedOutput = parseCodexOutput(stdout);
        // Extract JSON response from mixed output (may contain AI reasoning)
        const output = extractJsonResponse(parsedOutput);

        log('INFO', 'Codex CLI execution succeeded', {
          executionTimeMs,
          outputLength: output.length,
          wasExtracted: output !== parsedOutput,
        });
        resolve({
          success: true,
          output: output.trim(),
          executionTimeMs,
        });
      } else {
        log('ERROR', 'Codex CLI execution failed', {
          exitCode: code,
          signal,
          stderr: stderr.substring(0, 500),
          stdout: stdout.substring(0, 500),
          executionTimeMs,
        });
        resolve({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Generation failed - please try again or rephrase your description',
            details: `Exit code: ${code ?? 'unknown'}, stderr: ${stderr || 'none'}`,
          },
          executionTimeMs,
        });
      }
    });

    // Handle spawn errors
    childProcess.on('error', (error: NodeJS.ErrnoException) => {
      if (timeoutId) clearTimeout(timeoutId);

      // Remove from active processes
      if (requestId) {
        activeProcesses.delete(requestId);
      }

      const executionTimeMs = Date.now() - startTime;

      if (error.code === 'ENOENT') {
        log('ERROR', 'Codex CLI not found', { error: error.message });
        resolve({
          success: false,
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
            details: error.message,
          },
          executionTimeMs,
        });
      } else {
        log('ERROR', 'Codex CLI spawn error', { error: error.message });
        resolve({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to start Codex CLI',
            details: error.message,
          },
          executionTimeMs,
        });
      }
    });

    // Write prompt to stdin and close
    childProcess.stdin?.write(prompt);
    childProcess.stdin?.end();
  });
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
 * Uses Node.js child_process.spawn with stdin piping to handle large prompts.
 *
 * @param prompt - The prompt to send to Codex CLI via stdin
 * @param onProgress - Callback invoked with each text chunk
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @param workingDirectory - Working directory for CLI execution
 * @param model - Codex model to use (default: '' = inherit from CLI config)
 * @param reasoningEffort - Reasoning effort level (default: 'minimal')
 * @returns Execution result with success status and output/error
 */
export async function executeCodexCLIStreaming(
  prompt: string,
  onProgress: StreamingProgressCallback,
  timeoutMs = 60000,
  requestId?: string,
  workingDirectory?: string,
  model: CodexModel = DEFAULT_CODEX_MODEL,
  reasoningEffort: CodexReasoningEffort = 'low'
): Promise<CodexExecutionResult> {
  const startTime = Date.now();

  log('INFO', 'Starting Codex CLI streaming execution', {
    promptLength: prompt.length,
    timeoutMs,
    model,
    reasoningEffort,
    cwd: workingDirectory ?? process.cwd(),
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

  return new Promise((resolve) => {
    let accumulated = '';
    let explanatoryText = '';
    let currentToolInfo = '';

    // Build CLI arguments with '-' to read prompt from stdin
    // --skip-git-repo-check: bypass trust check since user is explicitly using extension
    const args = ['exec', '--json', '--skip-git-repo-check'];
    if (model) {
      args.push('-m', model);
    }
    // Add reasoning effort configuration
    if (reasoningEffort) {
      args.push('-c', `model_reasoning_effort="${reasoningEffort}"`);
    }
    args.push('--full-auto', '-');

    log('DEBUG', 'Spawning Codex CLI streaming process', {
      command: codexPath,
      args,
    });

    const childProcess = nodeSpawn(codexPath, args, {
      cwd: workingDirectory,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // Register as active process if requestId is provided
    if (requestId) {
      activeProcesses.set(requestId, { process: childProcess, startTime });
      log('INFO', `Registered active Codex streaming process for requestId: ${requestId}`);
    }

    let stderr = '';
    let timeoutId: NodeJS.Timeout | undefined;
    let lineBuffer = '';
    let timedOut = false;

    // Set up timeout
    if (timeoutMs > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        // On Windows: kill() sends an unconditional termination
        // On Unix: kill() sends SIGTERM (graceful termination)
        childProcess.kill();
        log('WARN', 'Codex CLI streaming execution timed out', { timeoutMs });
      }, timeoutMs);
    }

    // Process streaming stdout (JSONL format)
    childProcess.stdout?.on('data', (data: Buffer) => {
      const chunk = data.toString();
      lineBuffer += chunk;

      // Split by newlines (JSONL format)
      const lines = lineBuffer.split('\n');
      // Keep the last potentially incomplete line in buffer
      lineBuffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.trim()) continue;

        try {
          const parsed = JSON.parse(line);

          // Debug log with full structure for unknown event types
          log('DEBUG', 'Codex streaming JSON line parsed', {
            type: parsed.type,
            hasContent: !!parsed.content,
            hasItem: !!parsed.item,
            keys: Object.keys(parsed).join(','),
          });

          // Handle Codex CLI JSONL event types
          // Format: {"type": "item.completed", "item": {"type": "message", "content": [...]}}
          if (parsed.type === 'item.completed' && parsed.item) {
            const item = parsed.item;

            // Enhanced logging to debug item structure
            log('DEBUG', 'Codex item.completed payload', {
              itemType: item.type,
              itemRole: item.role,
              itemKeys: Object.keys(item).join(','),
              hasItemContent: !!item.content,
              itemContentType: item.content
                ? Array.isArray(item.content)
                  ? 'array'
                  : typeof item.content
                : 'none',
              itemContentLength: item.content
                ? Array.isArray(item.content)
                  ? item.content.length
                  : String(item.content).length
                : 0,
              hasOutput: !!item.output,
              hasOutputText: !!item.output_text,
              hasText: !!item.text,
              fullItemJson: JSON.stringify(item).substring(0, 1000),
            });
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
            // Also check for output field (some Codex versions use this)
            if (item.output && typeof item.output === 'string') {
              accumulated += item.output;
              explanatoryText = accumulated;
              currentToolInfo = '';
              onProgress(item.output, explanatoryText, explanatoryText, 'text');
            }
            // Codex CLI uses item.text for agent_message type
            // item.text may be a JSON string containing the actual response
            if (item.text && typeof item.text === 'string') {
              const textContent = item.text;
              let displayContent = item.text;

              // Try to parse item.text as JSON (Codex often returns JSON in text field)
              try {
                const textJson = JSON.parse(item.text);
                if (textJson.status && textJson.message) {
                  // This is a structured response, keep the full JSON for parsing
                  // but use the message for display
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
          } else if (
            parsed.type === 'thread.started' ||
            parsed.type === 'turn.started' ||
            parsed.type === 'turn.completed'
          ) {
            // These are lifecycle events, no content to extract
            log('DEBUG', `Codex lifecycle event: ${parsed.type}`);
          } else {
            // Unknown event type - log for debugging
            log('DEBUG', 'Codex unknown event type', {
              type: parsed.type,
              fullPayload: JSON.stringify(parsed).substring(0, 500),
            });
          }
        } catch {
          // Ignore JSON parse errors (partial chunks or non-JSON output)
          log('DEBUG', 'Skipping non-JSON line in Codex streaming output', {
            lineLength: line.length,
          });
        }
      }
    });

    // Collect stderr
    childProcess.stderr?.on('data', (data: Buffer) => {
      stderr += data.toString();
    });

    // Handle process completion
    childProcess.on('close', (code, signal) => {
      if (timeoutId) clearTimeout(timeoutId);

      // Remove from active processes
      if (requestId) {
        activeProcesses.delete(requestId);
        log('INFO', `Removed active Codex streaming process for requestId: ${requestId}`);
      }

      const executionTimeMs = Date.now() - startTime;

      // Check for timeout (use flag instead of signal for cross-platform compatibility)
      if (timedOut) {
        resolve({
          success: false,
          output: accumulated,
          error: {
            code: 'TIMEOUT',
            message: `AI generation timed out after ${Math.floor(timeoutMs / 1000)} seconds.`,
            details: `Timeout after ${timeoutMs}ms`,
          },
          executionTimeMs,
        });
        return;
      }

      // Check for success
      if (code === 0) {
        // Extract JSON response from mixed output (may contain AI reasoning)
        const extractedOutput = extractJsonResponse(accumulated);

        log('INFO', 'Codex CLI streaming execution succeeded', {
          executionTimeMs,
          accumulatedLength: accumulated.length,
          extractedLength: extractedOutput.length,
          wasExtracted: extractedOutput !== accumulated,
        });
        resolve({
          success: true,
          output: extractedOutput,
          executionTimeMs,
        });
      } else {
        log('ERROR', 'Codex CLI streaming execution failed', {
          exitCode: code,
          signal,
          stderr: stderr.substring(0, 500),
          accumulatedLength: accumulated.length,
          executionTimeMs,
        });
        resolve({
          success: false,
          output: accumulated,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Generation failed - please try again or rephrase your description',
            details: `Exit code: ${code ?? 'unknown'}, stderr: ${stderr || 'none'}`,
          },
          executionTimeMs,
        });
      }
    });

    // Handle spawn errors
    childProcess.on('error', (error: NodeJS.ErrnoException) => {
      if (timeoutId) clearTimeout(timeoutId);

      // Remove from active processes
      if (requestId) {
        activeProcesses.delete(requestId);
      }

      const executionTimeMs = Date.now() - startTime;

      if (error.code === 'ENOENT') {
        log('ERROR', 'Codex CLI not found', { error: error.message });
        resolve({
          success: false,
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: 'Codex CLI not found. Please install Codex CLI to use this provider.',
            details: error.message,
          },
          executionTimeMs,
        });
      } else {
        log('ERROR', 'Codex CLI spawn error', { error: error.message });
        resolve({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Failed to start Codex CLI',
            details: error.message,
          },
          executionTimeMs,
        });
      }
    });

    // Write prompt to stdin and close
    childProcess.stdin?.write(prompt);
    childProcess.stdin?.end();
  });
}

/**
 * Cancel an active Codex process
 *
 * @param requestId - Request ID of the process to cancel
 * @returns Result indicating if cancellation was successful
 */
export function cancelCodexProcess(requestId: string): {
  cancelled: boolean;
  executionTimeMs?: number;
} {
  const activeGen = activeProcesses.get(requestId);

  if (!activeGen) {
    log('WARN', `No active Codex process found for requestId: ${requestId}`);
    return { cancelled: false };
  }

  const { process: childProcess, startTime } = activeGen;
  const executionTimeMs = Date.now() - startTime;

  log('INFO', `Cancelling Codex process for requestId: ${requestId}`, {
    pid: childProcess.pid,
    elapsedMs: executionTimeMs,
  });

  // Kill the process
  // On Windows: kill() sends an unconditional termination
  // On Unix: kill() sends SIGTERM (graceful termination)
  childProcess.kill();

  // Force kill after 500ms if process doesn't terminate
  setTimeout(() => {
    if (!childProcess.killed) {
      // On Unix: this would be SIGKILL, but kill() without signal works on both platforms
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
      // Handle Codex CLI format: {"type": "item.completed", "item": {"content": [...]}}
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
        // Codex CLI uses item.text for agent_message type
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

  // If no structured content found, return raw output
  return finalContent || output;
}
