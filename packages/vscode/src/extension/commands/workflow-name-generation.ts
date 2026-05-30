/**
 * Workflow Name Generation Command Handler
 *
 * Handles GENERATE_WORKFLOW_NAME messages from Webview.
 * Uses Claude Code CLI to generate concise workflow names in kebab-case format.
 */

import type * as vscode from 'vscode';
import type {
  GenerateWorkflowNamePayload,
  WorkflowNameFailedPayload,
  WorkflowNameSuccessPayload,
} from '../../shared/types/messages';
import { log } from '../extension';
import { executeClaudeCodeCLI } from '../services/claude-code-service';
import { WorkflowNamePromptBuilder } from '../services/workflow-name-prompt-builder';

/** Default timeout for name generation (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

/** Maximum name length */
const MAX_NAME_LENGTH = 64;

/**
 * Handle workflow name generation request
 *
 * @param payload - Generation request payload
 * @param webview - Webview to send response to
 * @param requestId - Request ID for correlation
 * @param workspaceRoot - Optional workspace root directory for CLI execution
 */
export async function handleGenerateWorkflowName(
  payload: GenerateWorkflowNamePayload,
  webview: vscode.Webview,
  requestId: string,
  workspaceRoot?: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'Workflow name generation started', {
    requestId,
    promptFormat: 'toon',
    targetLanguage: payload.targetLanguage,
    workflowJsonLength: payload.workflowJson.length,
  });

  try {
    // Construct the prompt
    const prompt = constructNamePrompt(payload.workflowJson, payload.targetLanguage);

    // Execute Claude Code CLI
    const timeoutMs = payload.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result = await executeClaudeCodeCLI(prompt, timeoutMs, requestId, workspaceRoot, 'haiku');

    const executionTimeMs = Date.now() - startTime;

    if (!result.success || !result.output) {
      log('ERROR', 'Workflow name generation failed', {
        requestId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        executionTimeMs,
      });

      sendNameFailed(webview, requestId, {
        error: {
          code: result.error?.code ?? 'UNKNOWN_ERROR',
          message: result.error?.message ?? 'Failed to generate name',
          details: result.error?.details,
        },
        executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Parse and clean the name
    const name = parseName(result.output);

    log('INFO', 'Workflow name generation succeeded', {
      requestId,
      nameLength: name.length,
      generatedName: name,
      executionTimeMs,
    });

    sendNameSuccess(webview, requestId, {
      name,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error during workflow name generation', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    sendNameFailed(webview, requestId, {
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
 * Construct the prompt for name generation
 *
 * @param workflowJson - Serialized workflow JSON
 * @param targetLanguage - Target language for the name
 * @returns Constructed prompt string
 */
function constructNamePrompt(workflowJson: string, targetLanguage: string): string {
  const builder = new WorkflowNamePromptBuilder(workflowJson, targetLanguage);
  return builder.buildPrompt();
}

/**
 * Parse and clean the AI output to extract the name
 *
 * @param output - Raw output from Claude Code CLI
 * @returns Cleaned name string (kebab-case, truncated to max length)
 */
function parseName(output: string): string {
  // Remove any markdown code blocks if present
  let name = output.replace(/```[\s\S]*?```/g, '').trim();

  // Remove any leading/trailing quotes
  name = name.replace(/^["']|["']$/g, '').trim();

  // Remove any markdown formatting
  name = name
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
    .replace(/\*([^*]+)\*/g, '$1') // Italic
    .replace(/_([^_]+)_/g, '$1') // Underscore italic
    .replace(/`([^`]+)`/g, '$1') // Inline code
    .trim();

  // Normalize to kebab-case
  name = name
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-') // Replace non-alphanumeric with hyphen
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, ''); // Remove leading/trailing hyphens

  // Truncate to max length if needed
  if (name.length > MAX_NAME_LENGTH) {
    name = name.substring(0, MAX_NAME_LENGTH).replace(/-$/, '');
  }

  // Fallback if empty
  return name || 'untitled-workflow';
}

/**
 * Send success response to webview
 */
function sendNameSuccess(
  webview: vscode.Webview,
  requestId: string,
  payload: WorkflowNameSuccessPayload
): void {
  webview.postMessage({
    type: 'WORKFLOW_NAME_SUCCESS',
    requestId,
    payload,
  });
}

/**
 * Send failure response to webview
 */
function sendNameFailed(
  webview: vscode.Webview,
  requestId: string,
  payload: WorkflowNameFailedPayload
): void {
  webview.postMessage({
    type: 'WORKFLOW_NAME_FAILED',
    requestId,
    payload,
  });
}
