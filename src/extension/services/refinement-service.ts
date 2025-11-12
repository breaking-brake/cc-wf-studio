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
import { getDefaultSchemaPath, loadWorkflowSchema } from './schema-loader-service';

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
 * @param schema - Workflow schema for node type validation
 * @returns Prompt string for Claude Code CLI
 */
export function constructRefinementPrompt(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  schema: unknown
): string {
  // Get last 6 messages (3 rounds of user-AI conversation)
  // This provides sufficient context without overwhelming the prompt
  const recentMessages = conversationHistory.messages.slice(-6);

  const conversationContext =
    recentMessages.length > 0
      ? `**Conversation History** (last ${recentMessages.length} messages):
${recentMessages.map((msg) => `[${msg.sender.toUpperCase()}]: ${msg.content}`).join('\n')}\n`
      : '**Conversation History**: (This is the first message)\n';

  const schemaJSON = JSON.stringify(schema, null, 2);

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

**Skill Node Constraints**:
- Skill nodes MUST have exactly 1 output port (outputPorts: 1)
- If branching is needed after Skill execution, add an ifElse or switch node after the Skill node
- Never modify Skill node's outputPorts field

**Branching Node Selection**:
- Use ifElse node for 2-way conditional branching (true/false)
- Use switch node for 3+ way branching or multiple conditions
- Each branch output should connect to exactly one downstream node - never create serial connections from different branch outputs

**Workflow Schema** (reference for valid node types and structure):
${schemaJSON}

**Output Format**: Output ONLY valid JSON matching the Workflow interface. Do not include markdown code blocks or explanations.`;
}

/**
 * Maximum timeout for workflow refinement (90 seconds)
 * Aligned with AI generation timeout for consistency
 */
const MAX_REFINEMENT_TIMEOUT_MS = 90000;

/**
 * Execute workflow refinement via Claude Code CLI
 *
 * @param currentWorkflow - The current workflow state
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param extensionPath - VSCode extension path for schema loading
 * @param timeoutMs - Timeout in milliseconds (default: 90000)
 * @param requestId - Optional request ID for cancellation support
 * @returns Refinement result with success status and refined workflow or error
 */
export async function refineWorkflow(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  extensionPath: string,
  timeoutMs = MAX_REFINEMENT_TIMEOUT_MS,
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
    // Step 1: Load workflow schema
    const schemaPath = getDefaultSchemaPath(extensionPath);
    const schemaResult = await loadWorkflowSchema(schemaPath);

    if (!schemaResult.success || !schemaResult.schema) {
      log('ERROR', 'Failed to load workflow schema', {
        requestId,
        errorMessage: schemaResult.error?.message,
      });

      return {
        success: false,
        error: {
          code: 'UNKNOWN_ERROR',
          message: 'Failed to load workflow schema',
          details: schemaResult.error?.message,
        },
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Step 2: Construct refinement prompt
    const prompt = constructRefinementPrompt(
      currentWorkflow,
      conversationHistory,
      userMessage,
      schemaResult.schema
    );

    // Step 3: Execute Claude Code CLI
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
