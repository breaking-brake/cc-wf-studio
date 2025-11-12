/**
 * Workflow Refinement Service
 *
 * Executes AI-assisted workflow refinement based on user feedback and conversation history.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md
 */

import type { ConversationHistory, Workflow } from '../../shared/types/workflow-definition';
import { log } from '../extension';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';
import { executeClaudeCodeCLI, parseClaudeCodeOutput } from './claude-code-service';

export interface RefinementResult {
  success: boolean;
  refinedWorkflow?: Workflow;
  error?: {
    code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
}

/**
 * Construct refinement prompt with conversation context
 *
 * @param currentWorkflow - The current workflow state
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @returns Prompt string for Claude Code CLI
 */
export function constructRefinementPrompt(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string
): string {
  // Get last 6 messages (3 rounds of user-AI conversation)
  // This provides sufficient context without overwhelming the prompt
  const recentMessages = conversationHistory.messages.slice(-6);

  const conversationContext =
    recentMessages.length > 0
      ? `**Conversation History** (last ${recentMessages.length} messages):
${recentMessages.map((msg) => `[${msg.sender.toUpperCase()}]: ${msg.content}`).join('\n')}\n`
      : '**Conversation History**: (This is the first message)\n';

  return `You are an expert workflow designer for Claude Code Workflow Studio.

**Task**: Refine the existing workflow based on user's feedback.

**Current Workflow**:
${JSON.stringify(currentWorkflow, null, 2)}

${conversationContext}
**User's Refinement Request**:
${userMessage}

**Refinement Guidelines**:
1. Preserve existing nodes unless explicitly requested to remove
2. Add new nodes ONLY if user asks for new functionality
3. Modify node properties (labels, descriptions, prompts) based on feedback
4. Maintain workflow connectivity and validity
5. Respect node IDs - do not regenerate IDs for unchanged nodes
6. Update only what the user requested - minimize unnecessary changes

**Output Format**: Output ONLY valid JSON matching the Workflow interface. Do not include markdown code blocks or explanations.`;
}

/**
 * Execute workflow refinement via Claude Code CLI
 *
 * @param currentWorkflow - The current workflow state
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param timeoutMs - Timeout in milliseconds (default: 60000)
 * @param requestId - Optional request ID for cancellation support
 * @returns Refinement result with success status and refined workflow or error
 */
export async function refineWorkflow(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  timeoutMs = 60000,
  requestId?: string
): Promise<RefinementResult> {
  const startTime = Date.now();

  log('INFO', 'Starting workflow refinement', {
    requestId,
    workflowId: currentWorkflow.id,
    messageLength: userMessage.length,
    historyLength: conversationHistory.messages.length,
    currentIteration: conversationHistory.currentIteration,
    timeoutMs,
  });

  try {
    // Step 1: Construct refinement prompt
    const prompt = constructRefinementPrompt(currentWorkflow, conversationHistory, userMessage);

    // Step 2: Execute Claude Code CLI
    const cliResult = await executeClaudeCodeCLI(prompt, timeoutMs, requestId);

    if (!cliResult.success || !cliResult.output) {
      // CLI execution failed
      log('ERROR', 'Refinement failed during CLI execution', {
        requestId,
        errorCode: cliResult.error?.code,
        errorMessage: cliResult.error?.message,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: cliResult.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during CLI execution',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    log('INFO', 'CLI execution successful, parsing output', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
    });

    // Step 3: Parse CLI output
    const parsedOutput = parseClaudeCodeOutput(cliResult.output);

    if (!parsedOutput) {
      // Parsing failed
      log('ERROR', 'Failed to parse CLI output', {
        requestId,
        outputPreview: cliResult.output.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Refinement failed - please try again or rephrase your request',
          details: 'Failed to parse JSON from Claude Code output',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Type check: ensure parsed output is a Workflow
    const refinedWorkflow = parsedOutput as Workflow;

    if (!refinedWorkflow.id || !refinedWorkflow.nodes || !refinedWorkflow.connections) {
      log('ERROR', 'Parsed output is not a valid Workflow', {
        requestId,
        hasId: !!refinedWorkflow.id,
        hasNodes: !!refinedWorkflow.nodes,
        hasConnections: !!refinedWorkflow.connections,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Refinement failed - AI output does not match Workflow format',
          details: 'Missing required workflow fields (id, nodes, or connections)',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 4: Validate refined workflow
    const validation = validateAIGeneratedWorkflow(refinedWorkflow);

    if (!validation.valid) {
      log('ERROR', 'Refined workflow failed validation', {
        requestId,
        validationErrors: validation.errors,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refined workflow failed validation - please try again',
          details: validation.errors.map((e) => e.message).join('; '),
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    const executionTimeMs = Date.now() - startTime;

    log('INFO', 'Workflow refinement successful', {
      requestId,
      executionTimeMs,
      nodeCount: refinedWorkflow.nodes.length,
      connectionCount: refinedWorkflow.connections.length,
    });

    return {
      success: true,
      refinedWorkflow,
      executionTimeMs,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error during workflow refinement', {
      requestId,
      errorMessage: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'An unexpected error occurred during refinement',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs,
    };
  }
}
