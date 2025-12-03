/**
 * Slack Description Generation Command Handler
 *
 * Handles GENERATE_SLACK_DESCRIPTION messages from Webview.
 * Uses Claude Code CLI to generate concise workflow descriptions for Slack sharing.
 */

import type * as vscode from 'vscode';
import type {
  GenerateSlackDescriptionPayload,
  SlackDescriptionFailedPayload,
  SlackDescriptionSuccessPayload,
} from '../../shared/types/messages';
import { log } from '../extension';
import { executeClaudeCodeCLI } from '../services/claude-code-service';

/** Default timeout for description generation (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

/** Maximum description length (matches Slack share dialog limit) */
const MAX_DESCRIPTION_LENGTH = 500;

/** Language instructions for AI prompt */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: 'Write the description in English.',
  ja: 'Write the description in Japanese (日本語で記述してください).',
  ko: 'Write the description in Korean (한국어로 작성하세요).',
  'zh-CN': 'Write the description in Simplified Chinese (用简体中文撰写).',
  'zh-TW': 'Write the description in Traditional Chinese (用繁體中文撰寫).',
};

/**
 * Handle Slack description generation request
 *
 * @param payload - Generation request payload
 * @param webview - Webview to send response to
 * @param requestId - Request ID for correlation
 * @param workspaceRoot - Optional workspace root directory for CLI execution
 */
export async function handleGenerateSlackDescription(
  payload: GenerateSlackDescriptionPayload,
  webview: vscode.Webview,
  requestId: string,
  workspaceRoot?: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'Slack description generation started', {
    requestId,
    targetLanguage: payload.targetLanguage,
    workflowJsonLength: payload.workflowJson.length,
  });

  try {
    // Construct the prompt
    const prompt = constructDescriptionPrompt(payload.workflowJson, payload.targetLanguage);

    // Execute Claude Code CLI
    const timeoutMs = payload.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result = await executeClaudeCodeCLI(prompt, timeoutMs, requestId, workspaceRoot);

    const executionTimeMs = Date.now() - startTime;

    if (!result.success || !result.output) {
      log('ERROR', 'Slack description generation failed', {
        requestId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        executionTimeMs,
      });

      sendDescriptionFailed(webview, requestId, {
        error: {
          code: result.error?.code ?? 'UNKNOWN_ERROR',
          message: result.error?.message ?? 'Failed to generate description',
          details: result.error?.details,
        },
        executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Parse and clean the description
    const description = parseDescription(result.output);

    log('INFO', 'Slack description generation succeeded', {
      requestId,
      descriptionLength: description.length,
      executionTimeMs,
    });

    sendDescriptionSuccess(webview, requestId, {
      description,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error during Slack description generation', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    sendDescriptionFailed(webview, requestId, {
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Construct the prompt for description generation
 *
 * @param workflowJson - Serialized workflow JSON
 * @param targetLanguage - Target language for the description
 * @returns Constructed prompt string
 */
function constructDescriptionPrompt(workflowJson: string, targetLanguage: string): string {
  const languageInstruction = LANGUAGE_INSTRUCTIONS[targetLanguage] ?? LANGUAGE_INSTRUCTIONS.en;

  return `You are a technical writer creating a brief workflow description for Slack sharing.

**Task**: Analyze the following workflow JSON and generate a concise description.

**Workflow JSON**:
${workflowJson}

**Requirements**:
1. ${languageInstruction}
2. Maximum 200 characters (aim for 100-150 for readability)
3. Focus on what the workflow accomplishes, not technical implementation details
4. Use active voice and clear language
5. Do NOT include markdown, code blocks, or formatting
6. Output ONLY the description text, nothing else

**Output**: A single line of plain text describing the workflow purpose.`;
}

/**
 * Parse and clean the AI output to extract the description
 *
 * @param output - Raw output from Claude Code CLI
 * @returns Cleaned description string (truncated to max length)
 */
function parseDescription(output: string): string {
  // Remove any markdown code blocks if present
  let description = output.replace(/```[\s\S]*?```/g, '').trim();

  // Remove any leading/trailing quotes
  description = description.replace(/^["']|["']$/g, '').trim();

  // Remove any markdown formatting
  description = description
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/_([^_]+)_/g, '$1') // Underscore italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .trim();

  // Truncate to max length if needed
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    description = `${description.substring(0, MAX_DESCRIPTION_LENGTH - 3)}...`;
  }

  return description;
}

/**
 * Send success response to webview
 */
function sendDescriptionSuccess(
  webview: vscode.Webview,
  requestId: string,
  payload: SlackDescriptionSuccessPayload
): void {
  webview.postMessage({
    type: 'SLACK_DESCRIPTION_SUCCESS',
    requestId,
    payload,
  });
}

/**
 * Send failure response to webview
 */
function sendDescriptionFailed(
  webview: vscode.Webview,
  requestId: string,
  payload: SlackDescriptionFailedPayload
): void {
  webview.postMessage({
    type: 'SLACK_DESCRIPTION_FAILED',
    requestId,
    payload,
  });
}
