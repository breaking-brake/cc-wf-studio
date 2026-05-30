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
import { SlackDescriptionPromptBuilder } from '../services/slack-description-prompt-builder';

/** Default timeout for description generation (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

/** Maximum description length (matches Slack share dialog limit) */
const MAX_DESCRIPTION_LENGTH = 500;

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
    promptFormat: 'toon',
    targetLanguage: payload.targetLanguage,
    workflowJsonLength: payload.workflowJson.length,
  });

  try {
    // Construct the prompt
    const prompt = constructDescriptionPrompt(payload.workflowJson, payload.targetLanguage);

    // Execute Claude Code CLI
    const timeoutMs = payload.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result = await executeClaudeCodeCLI(prompt, timeoutMs, requestId, workspaceRoot, 'haiku');

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
  const builder = new SlackDescriptionPromptBuilder(workflowJson, targetLanguage);
  return builder.buildPrompt();
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
