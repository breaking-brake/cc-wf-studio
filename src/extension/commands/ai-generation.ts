/**
 * AI Generation Command Handler
 *
 * Handles GENERATE_WORKFLOW messages from Webview and orchestrates AI workflow generation.
 * Based on: /specs/001-ai-workflow-generation/plan.md
 */

import type * as vscode from 'vscode';
import type {
  GenerateWorkflowPayload,
  GenerationFailedPayload,
  GenerationSuccessPayload,
  Workflow,
} from '../../shared/types/messages';
import { log } from '../extension';
import { executeClaudeCodeCLI, parseClaudeCodeOutput } from '../services/claude-code-service';
import { getDefaultSchemaPath, loadWorkflowSchema } from '../services/schema-loader-service';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';

/**
 * Handle AI workflow generation request
 *
 * @param payload - The generation request from Webview
 * @param webview - The webview to send response messages to
 * @param extensionPath - The extension's root path
 * @param requestId - The request ID for correlation
 */
export async function handleGenerateWorkflow(
  payload: GenerateWorkflowPayload,
  webview: vscode.Webview,
  extensionPath: string,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'AI Workflow Generation started', {
    requestId,
    descriptionLength: payload.userDescription.length,
    timeoutMs: payload.timeoutMs,
  });

  try {
    // Step 1: Load workflow schema
    const schemaPath = getDefaultSchemaPath(extensionPath);
    const schemaResult = await loadWorkflowSchema(schemaPath);

    if (!schemaResult.success || !schemaResult.schema) {
      // Schema loading failed
      log('ERROR', 'Failed to load workflow schema', {
        requestId,
        errorMessage: schemaResult.error?.message,
      });

      sendGenerationFailed(webview, requestId, {
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to load workflow schema',
          details: schemaResult.error?.message,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'Workflow schema loaded successfully', { requestId });

    // Step 2: Construct prompt
    const prompt = constructPrompt(payload.userDescription, schemaResult.schema);

    // Step 3: Execute Claude Code CLI
    const timeout = payload.timeoutMs ?? 60000;
    const cliResult = await executeClaudeCodeCLI(prompt, timeout);

    if (!cliResult.success || !cliResult.output) {
      // CLI execution failed
      log('ERROR', 'AI generation failed during CLI execution', {
        requestId,
        errorCode: cliResult.error?.code,
        errorMessage: cliResult.error?.message,
        executionTimeMs: cliResult.executionTimeMs,
      });

      sendGenerationFailed(webview, requestId, {
        error: cliResult.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during CLI execution',
        },
        executionTimeMs: cliResult.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'CLI execution successful, parsing output', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
    });

    // Step 4: Parse CLI output
    const parsedOutput = parseClaudeCodeOutput(cliResult.output);

    if (!parsedOutput) {
      // Parsing failed
      log('ERROR', 'Failed to parse CLI output', {
        requestId,
        outputPreview: cliResult.output.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      sendGenerationFailed(webview, requestId, {
        error: {
          code: 'PARSE_ERROR',
          message: 'Generation failed - please try again or rephrase your description',
          details: 'Failed to parse JSON from Claude Code output',
        },
        executionTimeMs: cliResult.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'Output parsed successfully, validating workflow', { requestId });

    // Step 5: Validate workflow
    const validationResult = validateAIGeneratedWorkflow(parsedOutput);

    if (!validationResult.valid) {
      // Validation failed
      const errorMessages = validationResult.errors.map((e) => e.message).join('; ');
      log('ERROR', 'Generated workflow failed validation', {
        requestId,
        errorCount: validationResult.errors.length,
        errors: validationResult.errors,
        executionTimeMs: cliResult.executionTimeMs,
      });

      sendGenerationFailed(webview, requestId, {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Generated workflow failed validation',
          details: errorMessages,
        },
        executionTimeMs: cliResult.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    log('INFO', 'Workflow validated successfully', {
      requestId,
      nodeCount: (parsedOutput as Workflow).nodes?.length ?? 0,
      connectionCount: (parsedOutput as Workflow).connections?.length ?? 0,
    });

    // Step 6: Success - send generated workflow
    log('INFO', 'AI Workflow Generation completed successfully', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
      workflowName: (parsedOutput as Workflow).name,
    });

    sendGenerationSuccess(webview, requestId, {
      workflow: parsedOutput as Workflow,
      executionTimeMs: cliResult.executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Unexpected error
    const executionTimeMs = Date.now() - startTime;
    log('ERROR', 'Unexpected error during AI Workflow Generation', {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      executionTimeMs,
    });

    sendGenerationFailed(webview, requestId, {
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred. Please try again.',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Construct prompt for Claude Code CLI
 *
 * Based on: /specs/001-ai-workflow-generation/research.md Q4
 */
function constructPrompt(userDescription: string, schema: unknown): string {
  const schemaJSON = JSON.stringify(schema, null, 2);

  return `You are an expert workflow designer for Claude Code Workflow Studio.

**Task**: Generate a valid workflow JSON based on the user's natural language description.

**User Description**:
${userDescription}

**Workflow Schema**:
${schemaJSON}

**Output Requirements**:
- Output ONLY valid JSON matching the Workflow interface
- Do NOT include explanations, markdown, or additional text
- Ensure the workflow has exactly one Start node and at least one End node
- Respect the maximum node limit of 50
- All connections must be valid (no connections from End nodes, no connections to Start nodes)
- Node IDs must be unique
- All required fields for each node type must be present
- Use semantic version for workflow version (e.g., "1.0.0")
- Set createdAt and updatedAt to current ISO 8601 timestamp

**Output Format**:
\`\`\`json
{
  "id": "generated-workflow-${Date.now()}",
  "name": "...",
  "version": "1.0.0",
  "nodes": [...],
  "connections": [...],
  "createdAt": "${new Date().toISOString()}",
  "updatedAt": "${new Date().toISOString()}"
}
\`\`\``;
}

/**
 * Send GENERATION_SUCCESS message to Webview
 */
function sendGenerationSuccess(
  webview: vscode.Webview,
  requestId: string,
  payload: GenerationSuccessPayload
): void {
  webview.postMessage({
    type: 'GENERATION_SUCCESS',
    requestId,
    payload,
  });
}

/**
 * Send GENERATION_FAILED message to Webview
 */
function sendGenerationFailed(
  webview: vscode.Webview,
  requestId: string,
  payload: GenerationFailedPayload
): void {
  webview.postMessage({
    type: 'GENERATION_FAILED',
    requestId,
    payload,
  });
}
