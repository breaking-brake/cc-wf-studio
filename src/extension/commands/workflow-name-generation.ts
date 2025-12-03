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

/** Default timeout for name generation (30 seconds) */
const DEFAULT_TIMEOUT_MS = 30000;

/** Maximum name length */
const MAX_NAME_LENGTH = 64;

/** Language instructions for AI prompt */
const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  en: 'Generate the name in English.',
  ja: 'Generate the name in English but it can reflect Japanese concepts.',
  ko: 'Generate the name in English but it can reflect Korean concepts.',
  'zh-CN': 'Generate the name in English but it can reflect Chinese concepts.',
  'zh-TW': 'Generate the name in English but it can reflect Chinese concepts.',
};

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
    targetLanguage: payload.targetLanguage,
    workflowJsonLength: payload.workflowJson.length,
  });

  try {
    // Construct the prompt
    const prompt = constructNamePrompt(payload.workflowJson, payload.targetLanguage);

    // Execute Claude Code CLI
    const timeoutMs = payload.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const result = await executeClaudeCodeCLI(prompt, timeoutMs, requestId, workspaceRoot);

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
  const languageInstruction = LANGUAGE_INSTRUCTIONS[targetLanguage] ?? LANGUAGE_INSTRUCTIONS.en;

  return `You are a workflow naming specialist.

**Task**: Analyze the following workflow JSON and generate a concise, descriptive name.

**Workflow JSON**:
${workflowJson}

**Requirements**:
1. ${languageInstruction}
2. Use kebab-case format (e.g., "data-analysis-pipeline", "user-auth-flow")
3. Maximum 50 characters
4. Focus on the workflow's primary purpose or function
5. Do NOT include generic words like "workflow" or "process" unless necessary
6. Do NOT include markdown, code blocks, or formatting
7. Output ONLY the name, nothing else

**Output**: A single kebab-case name describing the workflow purpose.`;
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
