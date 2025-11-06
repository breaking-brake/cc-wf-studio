/**
 * Claude Code CLI Service
 *
 * Executes Claude Code CLI commands for AI-assisted workflow generation.
 * Based on: /specs/001-ai-workflow-generation/research.md Q1
 */

import { spawn } from 'node:child_process';
import { log } from '../extension';

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
 * @returns Execution result with success status and output/error
 */
export async function executeClaudeCodeCLI(
  prompt: string,
  timeoutMs = 60000
): Promise<ClaudeCodeExecutionResult> {
  const startTime = Date.now();

  log('INFO', 'Starting Claude Code CLI execution', {
    promptLength: prompt.length,
    timeoutMs,
  });

  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Spawn Claude Code CLI process
    const process = spawn('claude', ['-p', prompt], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Set timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      process.kill();

      const executionTimeMs = Date.now() - startTime;
      log('WARN', 'Claude Code CLI execution timed out', {
        timeoutMs,
        executionTimeMs,
      });

      resolve({
        success: false,
        error: {
          code: 'TIMEOUT',
          message: 'AI generation timed out after 60 seconds. Try simplifying your description.',
          details: `Timeout after ${timeoutMs}ms`,
        },
        executionTimeMs,
      });
    }, timeoutMs);

    // Collect stdout
    process.stdout?.on('data', (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    // Collect stderr
    process.stderr?.on('data', (chunk: Buffer) => {
      stderr += chunk.toString();
    });

    // Handle process errors (e.g., ENOENT when command not found)
    process.on('error', (err: NodeJS.ErrnoException) => {
      clearTimeout(timeout);

      if (timedOut) return; // Already handled by timeout

      const executionTimeMs = Date.now() - startTime;

      if (err.code === 'ENOENT') {
        log('ERROR', 'Claude Code CLI not found', {
          errorCode: err.code,
          errorMessage: err.message,
          executionTimeMs,
        });

        resolve({
          success: false,
          error: {
            code: 'COMMAND_NOT_FOUND',
            message: 'Cannot connect to Claude Code - please ensure it is installed and running',
            details: err.message,
          },
          executionTimeMs,
        });
      } else {
        log('ERROR', 'Claude Code CLI execution error', {
          errorCode: err.code,
          errorMessage: err.message,
          executionTimeMs,
        });

        resolve({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'An unexpected error occurred. Please try again.',
            details: err.message,
          },
          executionTimeMs,
        });
      }
    });

    // Handle process exit
    process.on('exit', (code) => {
      clearTimeout(timeout);

      if (timedOut) return; // Already handled by timeout

      const executionTimeMs = Date.now() - startTime;

      if (code === 0) {
        // Success - return stdout
        log('INFO', 'Claude Code CLI execution succeeded', {
          executionTimeMs,
          outputLength: stdout.length,
        });

        resolve({
          success: true,
          output: stdout.trim(),
          executionTimeMs,
        });
      } else {
        // Non-zero exit code
        log('ERROR', 'Claude Code CLI execution failed', {
          exitCode: code,
          executionTimeMs,
          stderr: stderr.substring(0, 200), // Log first 200 chars of stderr
        });

        resolve({
          success: false,
          error: {
            code: 'UNKNOWN_ERROR',
            message: 'Generation failed - please try again or rephrase your description',
            details: `Exit code: ${code}, stderr: ${stderr}`,
          },
          executionTimeMs,
        });
      }
    });
  });
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
