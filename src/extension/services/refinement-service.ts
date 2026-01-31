/**
 * Workflow Refinement Service
 *
 * Executes AI-assisted workflow refinement based on user feedback and conversation history.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md
 */

import type {
  AiCliProvider,
  ClaudeModel,
  CodexModel,
  CodexReasoningEffort,
  CopilotModel,
  SkillReference,
} from '../../shared/types/messages';
import {
  type ConversationHistory,
  NodeType,
  type SkillNodeData,
  type SubAgentFlow,
  type SubAgentFlowNodeData,
  type Workflow,
} from '../../shared/types/workflow-definition';
import { log } from '../extension';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';
import {
  estimateTokens,
  getConfiguredSchemaFormat,
  isMetricsCollectionEnabled,
  recordMetrics,
} from './ai-metrics-service';
import { executeAi, executeAiStreaming } from './ai-provider';
import { parseClaudeCodeOutput, type StreamingProgressCallback } from './claude-code-service';
import { RefinementPromptBuilder } from './refinement-prompt-builder';
import { loadWorkflowSchemaByFormat, type SchemaLoadResult } from './schema-loader-service';
import { filterSkillsByRelevance, type SkillRelevanceScore } from './skill-relevance-matcher';
import { scanAllSkills } from './skill-service';

/** Validation error structure */
export interface ValidationErrorInfo {
  code: string;
  message: string;
  field?: string;
}

export interface RefinementResult {
  success: boolean;
  refinedWorkflow?: Workflow;
  clarificationMessage?: string;
  aiMessage?: string; // AI's response message for display in chat UI
  error?: {
    code:
      | 'COMMAND_NOT_FOUND'
      | 'MODEL_NOT_SUPPORTED'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  /** Validation errors when code is VALIDATION_ERROR */
  validationErrors?: ValidationErrorInfo[];
  executionTimeMs: number;
  /** New session ID from CLI (for session continuation) */
  newSessionId?: string;
  /** Whether session was reconnected due to session expiration (fallback occurred) */
  sessionReconnected?: boolean;
}

/**
 * AI response structure for workflow refinement
 * Forces AI to return structured JSON instead of plain text
 */
interface AIRefinementResponse {
  status: 'success' | 'error' | 'clarification';
  values?: {
    workflow: Workflow;
  };
  message?: string; // For clarification or error messages
}

/**
 * AI response structure for SubAgentFlow refinement
 */
interface AISubAgentFlowResponse {
  status: 'success' | 'error' | 'clarification';
  values?: {
    nodes: Workflow['nodes'];
    connections: Workflow['connections'];
  };
  message?: string;
}

/**
 * Parse AI refinement response with structured format
 *
 * Includes fallback handling for non-JSON text responses:
 * When AI responds with conversational text instead of JSON
 * (especially common when user sends vague/initial messages),
 * treat it as a clarification response to maintain UX.
 *
 * @param output - Raw CLI output string
 * @returns Parsed AIRefinementResponse or null if parsing fails
 */
function parseRefinementResponse(output: string): AIRefinementResponse | null {
  const parsed = parseClaudeCodeOutput(output);

  // Fallback: If parsing fails but we have text content, treat it as clarification
  // This handles cases where AI responds with conversational text instead of JSON
  // (common with non-English locales or vague initial user messages)
  if (!parsed || typeof parsed !== 'object') {
    const trimmedOutput = output.trim();
    if (trimmedOutput.length > 0) {
      log('INFO', 'Treating non-JSON AI response as clarification message', {
        outputLength: trimmedOutput.length,
        outputPreview: trimmedOutput.substring(0, 100),
      });
      return {
        status: 'clarification',
        message: trimmedOutput,
      };
    }
    return null;
  }

  const response = parsed as AIRefinementResponse;

  // Validate required status field
  if (!response.status || !['success', 'error', 'clarification'].includes(response.status)) {
    return null;
  }

  return response;
}

/**
 * Parse AI SubAgentFlow refinement response with structured format
 *
 * Includes fallback handling for non-JSON text responses (same as parseRefinementResponse).
 *
 * @param output - Raw CLI output string
 * @returns Parsed AISubAgentFlowResponse or null if parsing fails
 */
function parseSubAgentFlowResponse(output: string): AISubAgentFlowResponse | null {
  const parsed = parseClaudeCodeOutput(output);

  // Fallback: If parsing fails but we have text content, treat it as clarification
  if (!parsed || typeof parsed !== 'object') {
    const trimmedOutput = output.trim();
    if (trimmedOutput.length > 0) {
      log('INFO', 'Treating non-JSON SubAgentFlow AI response as clarification message', {
        outputLength: trimmedOutput.length,
        outputPreview: trimmedOutput.substring(0, 100),
      });
      return {
        status: 'clarification',
        message: trimmedOutput,
      };
    }
    return null;
  }

  const response = parsed as AISubAgentFlowResponse;

  // Validate required status field
  if (!response.status || !['success', 'error', 'clarification'].includes(response.status)) {
    return null;
  }

  return response;
}

/**
 * Construct refinement prompt with conversation context
 *
 * @param currentWorkflow - The current workflow state
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param schemaResult - Schema load result (JSON or TOON)
 * @param filteredSkills - Skills filtered by relevance (optional)
 * @param previousValidationErrors - Validation errors from previous failed attempt (optional, for retry)
 * @returns Object with prompt string and schema size
 */
export function constructRefinementPrompt(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  schemaResult: SchemaLoadResult,
  filteredSkills: SkillRelevanceScore[] = [],
  previousValidationErrors?: ValidationErrorInfo[],
  isCodexEnabled = false
): { prompt: string; schemaSize: number } {
  const schemaFormat = getConfiguredSchemaFormat();

  log('INFO', 'Constructing refinement prompt', {
    promptFormat: 'toon',
    schemaFormat: schemaFormat,
    userMessageLength: userMessage.length,
    conversationHistoryLength: conversationHistory.messages.length,
    filteredSkillsCount: filteredSkills.length,
    hasPreviousErrors: !!previousValidationErrors && previousValidationErrors.length > 0,
    previousErrorCount: previousValidationErrors?.length ?? 0,
  });

  const builder = new RefinementPromptBuilder(
    currentWorkflow,
    conversationHistory,
    userMessage,
    schemaResult,
    filteredSkills,
    previousValidationErrors,
    isCodexEnabled
  );

  const prompt = builder.buildPrompt();
  const schemaSize = schemaResult.sizeBytes;

  log('INFO', 'Refinement prompt constructed', {
    promptFormat: 'toon',
    promptSizeChars: prompt.length,
    estimatedTokens: estimateTokens(prompt.length),
  });

  return { prompt, schemaSize };
}

/**
 * Default timeout for workflow refinement (90 seconds)
 * Can be overridden by user selection in the Refinement Chat Panel settings
 */
export const DEFAULT_REFINEMENT_TIMEOUT_MS = 90000;

/**
 * Execute workflow refinement via Claude Code CLI
 *
 * @param currentWorkflow - The current workflow state
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param extensionPath - VSCode extension path for schema loading
 * @param useSkills - Whether to include skills in refinement (default: true)
 * @param timeoutMs - Timeout in milliseconds (default: 90000, can be configured via settings)
 * @param requestId - Optional request ID for cancellation support
 * @param workspaceRoot - The workspace root path for CLI execution
 * @param onProgress - Optional callback for streaming progress updates
 * @param model - Claude model to use (default: 'sonnet')
 * @param allowedTools - Array of allowed tool names for CLI (optional)
 * @param previousValidationErrors - Validation errors from previous failed attempt (for retry with error context)
 * @param provider - AI CLI provider to use (default: 'claude-code')
 * @param copilotModel - Copilot model to use when provider is 'copilot' (default: 'gpt-4o')
 * @param codexModel - Codex model to use when provider is 'codex' (default: '' = inherit)
 * @param codexReasoningEffort - Reasoning effort level for Codex (default: 'minimal')
 * @returns Refinement result with success status and refined workflow or error
 */
export async function refineWorkflow(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  extensionPath: string,
  useSkills = true,
  timeoutMs = DEFAULT_REFINEMENT_TIMEOUT_MS,
  requestId?: string,
  workspaceRoot?: string,
  onProgress?: StreamingProgressCallback,
  model: ClaudeModel = 'sonnet',
  allowedTools?: string[],
  previousValidationErrors?: ValidationErrorInfo[],
  provider: AiCliProvider = 'claude-code',
  copilotModel: CopilotModel = 'gpt-4o',
  codexModel: CodexModel = '',
  codexReasoningEffort: CodexReasoningEffort = 'low',
  useCodex = false
): Promise<RefinementResult> {
  const startTime = Date.now();

  // Get configured schema format and metrics settings
  const schemaFormat = getConfiguredSchemaFormat();
  const collectMetrics = isMetricsCollectionEnabled();

  log('INFO', 'Starting workflow refinement', {
    requestId,
    workflowId: currentWorkflow.id,
    messageLength: userMessage.length,
    historyLength: conversationHistory.messages.length,
    currentIteration: conversationHistory.currentIteration,
    useSkills,
    timeoutMs,
    schemaFormat,
    promptFormat: 'toon',
    collectMetrics,
  });

  try {
    // Step 1: Load workflow schema in configured format (and optionally scan skills)
    let schemaResult: SchemaLoadResult;
    let availableSkills: SkillReference[] = [];
    let filteredSkills: SkillRelevanceScore[] = [];

    if (useSkills) {
      // Scan skills in parallel with schema loading
      const [loadedSchema, skillsResult] = await Promise.all([
        loadWorkflowSchemaByFormat(extensionPath, schemaFormat),
        scanAllSkills(),
      ]);

      schemaResult = loadedSchema;

      if (!schemaResult.success || (!schemaResult.schema && !schemaResult.schemaString)) {
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

      // Combine user, project, and local skills
      availableSkills = [...skillsResult.user, ...skillsResult.project, ...skillsResult.local];

      log('INFO', 'Skills scanned successfully', {
        requestId,
        userCount: skillsResult.user.length,
        projectCount: skillsResult.project.length,
        localCount: skillsResult.local.length,
        totalCount: availableSkills.length,
        userSkills: skillsResult.user.map((s) => s.name),
        projectSkills: skillsResult.project.map((s) => s.name),
        localSkills: skillsResult.local.map((s) => s.name),
      });

      // Step 2: Filter skills by relevance to user's message
      filteredSkills = filterSkillsByRelevance(userMessage, availableSkills);

      log('INFO', 'Skills filtered by relevance', {
        requestId,
        filteredCount: filteredSkills.length,
        topSkills: filteredSkills.slice(0, 5).map((s) => ({ name: s.skill.name, score: s.score })),
      });
    } else {
      // Skip skill scanning
      schemaResult = await loadWorkflowSchemaByFormat(extensionPath, schemaFormat);

      if (!schemaResult.success || (!schemaResult.schema && !schemaResult.schemaString)) {
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

      log('INFO', 'Skipping skill scan (useSkills=false)', { requestId });
    }

    log('INFO', 'Workflow schema loaded successfully', {
      requestId,
      format: schemaResult.format,
      sizeBytes: schemaResult.sizeBytes,
    });

    // Step 3: Construct refinement prompt (with or without skills/codex, and error context if retrying)
    const { prompt, schemaSize } = constructRefinementPrompt(
      currentWorkflow,
      conversationHistory,
      userMessage,
      schemaResult,
      filteredSkills,
      previousValidationErrors,
      useCodex
    );

    // Record prompt size for metrics
    const promptSizeChars = prompt.length;

    // Step 4: Execute AI (streaming if onProgress callback provided)
    let cliResult = onProgress
      ? await executeAiStreaming(
          prompt,
          provider,
          onProgress,
          timeoutMs,
          requestId,
          workspaceRoot,
          model,
          copilotModel,
          allowedTools,
          conversationHistory.sessionId,
          codexModel,
          codexReasoningEffort
        )
      : await executeAi(
          prompt,
          provider,
          timeoutMs,
          requestId,
          workspaceRoot,
          model,
          copilotModel,
          allowedTools,
          codexModel,
          codexReasoningEffort
        );

    // Track whether session was reconnected due to fallback
    let sessionReconnected = false;

    // Fallback: Retry without session ID if session resume failed
    if (!cliResult.success && conversationHistory.sessionId) {
      const errorDetails = cliResult.error?.details?.toLowerCase() || '';
      const errorMessage = cliResult.error?.message?.toLowerCase() || '';
      const isSessionError = [
        // Claude Code specific patterns
        'session not found',
        'session expired',
        'invalid session',
        'no such session',
        'no conversation found with session id',
        'not a valid uuid',
        // Codex CLI specific patterns (thread-based)
        'thread not found',
        'invalid thread',
        'no thread with id',
        'thread expired',
      ].some((pattern) => errorDetails.includes(pattern) || errorMessage.includes(pattern));

      if (isSessionError) {
        log('WARN', 'Session resume failed, retrying without session ID', {
          requestId,
          previousSessionId: conversationHistory.sessionId,
          errorCode: cliResult.error?.code,
          errorMessage: cliResult.error?.message,
        });

        // Mark that session reconnection occurred
        sessionReconnected = true;

        // Retry without session ID
        cliResult = onProgress
          ? await executeAiStreaming(
              prompt,
              provider,
              onProgress,
              timeoutMs,
              requestId,
              workspaceRoot,
              model,
              copilotModel,
              allowedTools,
              undefined, // No session ID for retry
              codexModel,
              codexReasoningEffort
            )
          : await executeAi(
              prompt,
              provider,
              timeoutMs,
              requestId,
              workspaceRoot,
              model,
              copilotModel,
              allowedTools,
              codexModel,
              codexReasoningEffort
            );
      }
    }

    // Detect silent session switch (CLI started new session without returning error)
    // This happens when CLI-side session was cleared (e.g., via /clear command)
    if (
      cliResult.success &&
      conversationHistory.sessionId &&
      cliResult.sessionId &&
      cliResult.sessionId !== conversationHistory.sessionId
    ) {
      log('WARN', 'Session was silently replaced by CLI', {
        requestId,
        previousSessionId: conversationHistory.sessionId,
        newSessionId: cliResult.sessionId,
      });
      sessionReconnected = true;
    }

    // Detect provider switch from Claude Code/Codex to Copilot
    // Copilot doesn't support session continuation, so previous session is lost
    // Note: Codex now supports session continuation via thread_id
    if (provider === 'copilot' && conversationHistory.sessionId) {
      log('WARN', 'Session discontinued due to provider switch to Copilot', {
        requestId,
        previousSessionId: conversationHistory.sessionId,
      });
      sessionReconnected = true;
    }

    if (!cliResult.success || !cliResult.output) {
      // CLI execution failed - record metrics
      if (collectMetrics) {
        recordMetrics({
          requestId: requestId || `refine-${Date.now()}`,
          schemaFormat: schemaResult.format,
          promptFormat: 'toon',
          promptSizeChars,
          schemaSizeChars: schemaSize,
          estimatedTokens: estimateTokens(promptSizeChars),
          executionTimeMs: cliResult.executionTimeMs,
          success: false,
          timestamp: new Date().toISOString(),
          userDescriptionLength: userMessage.length,
        });
      }

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
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    log('INFO', 'CLI execution successful, parsing structured response', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
      rawOutput: cliResult.output,
    });

    // Step 5: Parse structured AI response
    const aiResponse = parseRefinementResponse(cliResult.output);

    if (!aiResponse) {
      // Structured response parsing failed
      log('ERROR', 'Failed to parse structured AI response', {
        requestId,
        outputPreview: cliResult.output.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse AI response. Please try again or rephrase your request',
          details: 'AI response does not match expected structured format',
        },
        executionTimeMs: cliResult.executionTimeMs,
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    // Step 6: Handle response based on status
    if (aiResponse.status === 'clarification') {
      log('INFO', 'AI is requesting clarification', {
        requestId,
        message: aiResponse.message?.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: true,
        clarificationMessage: aiResponse.message || 'Please provide more details',
        executionTimeMs: cliResult.executionTimeMs,
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    if (aiResponse.status === 'error') {
      log('WARN', 'AI returned error status', {
        requestId,
        message: aiResponse.message,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: aiResponse.message || 'AI could not process the request',
          details: 'AI returned error status in response',
        },
        executionTimeMs: cliResult.executionTimeMs,
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    // status === 'success' - extract workflow
    if (!aiResponse.values?.workflow) {
      log('ERROR', 'AI success response missing workflow', {
        requestId,
        hasValues: !!aiResponse.values,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Refinement failed - AI response missing workflow data',
          details: 'Success response does not contain workflow in values',
        },
        executionTimeMs: cliResult.executionTimeMs,
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    let refinedWorkflow = aiResponse.values.workflow;

    // Fill in missing metadata from current workflow
    refinedWorkflow = {
      ...refinedWorkflow,
      id: refinedWorkflow.id || currentWorkflow.id,
      name: refinedWorkflow.name || currentWorkflow.name,
      version: refinedWorkflow.version || currentWorkflow.version || '1.0.0',
      createdAt: refinedWorkflow.createdAt || currentWorkflow.createdAt || new Date(),
      updatedAt: new Date(),
    };

    if (!refinedWorkflow.id || !refinedWorkflow.nodes || !refinedWorkflow.connections) {
      log('ERROR', 'Parsed workflow is not valid', {
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
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    // Step 7: Resolve skill paths for skill nodes (only if useSkills is true)
    if (useSkills) {
      refinedWorkflow = await resolveSkillPaths(refinedWorkflow, availableSkills);

      log('INFO', 'Skill paths resolved', {
        requestId,
        skillNodesCount: refinedWorkflow.nodes.filter((n) => n.type === 'skill').length,
      });
    } else {
      log('INFO', 'Skipping skill path resolution (useSkills=false)', { requestId });
    }

    // Step 7.5: Resolve SubAgentFlow references
    refinedWorkflow = resolveSubAgentFlows(refinedWorkflow);

    log('INFO', 'SubAgentFlow references resolved', {
      requestId,
      subAgentFlowNodesCount: refinedWorkflow.nodes.filter((n) => n.type === 'subAgentFlow').length,
      subAgentFlowsCount: refinedWorkflow.subAgentFlows?.length || 0,
    });

    // Step 8: Validate refined workflow
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
        validationErrors: validation.errors.map((e) => ({
          code: e.code,
          message: e.message,
          field: e.field,
        })),
        executionTimeMs: cliResult.executionTimeMs,
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    const executionTimeMs = Date.now() - startTime;

    // Record metrics for successful refinement
    if (collectMetrics) {
      recordMetrics({
        requestId: requestId || `refine-${Date.now()}`,
        schemaFormat: schemaResult.format,
        promptFormat: 'toon',
        promptSizeChars,
        schemaSizeChars: schemaSize,
        estimatedTokens: estimateTokens(promptSizeChars),
        executionTimeMs,
        success: true,
        timestamp: new Date().toISOString(),
        userDescriptionLength: userMessage.length,
      });
    }

    log('INFO', 'Workflow refinement successful', {
      requestId,
      executionTimeMs,
      nodeCount: refinedWorkflow.nodes.length,
      connectionCount: refinedWorkflow.connections.length,
      aiMessage: aiResponse.message,
    });

    return {
      success: true,
      refinedWorkflow,
      aiMessage: aiResponse.message,
      executionTimeMs,
      newSessionId: cliResult.sessionId,
      sessionReconnected,
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

/**
 * Resolve skill paths for skill nodes in the workflow
 *
 * @param workflow - The workflow containing skill nodes
 * @param availableSkills - List of available skills to match against
 * @returns Workflow with resolved skill paths
 */
async function resolveSkillPaths(
  workflow: Workflow,
  availableSkills: SkillReference[]
): Promise<Workflow> {
  const resolvedNodes = workflow.nodes.map((node) => {
    if (node.type !== 'skill') {
      return node; // Not a Skill node, no changes
    }

    const skillData = node.data as SkillNodeData;

    // First try: Find matching skill by name and scope
    let matchedSkill = availableSkills.find(
      (skill) => skill.name === skillData.name && skill.scope === skillData.scope
    );

    // Second try: Match by name only (AI may generate wrong scope)
    if (!matchedSkill) {
      matchedSkill = availableSkills.find((skill) => skill.name === skillData.name);
    }

    if (matchedSkill) {
      // Skill found - resolve path and correct scope if necessary
      return {
        ...node,
        data: {
          ...skillData,
          name: matchedSkill.name,
          description: matchedSkill.description,
          scope: matchedSkill.scope, // Use actual scope from matched skill
          skillPath: matchedSkill.skillPath,
          validationStatus: matchedSkill.validationStatus,
        } as SkillNodeData,
      };
    }

    // Skill not found - mark as missing with empty skillPath
    return {
      ...node,
      data: {
        ...skillData,
        skillPath: '', // Set empty to avoid validation error
        validationStatus: 'missing' as const,
      } as SkillNodeData,
    };
  });

  return {
    ...workflow,
    nodes: resolvedNodes,
  };
}

/**
 * Create a minimal SubAgentFlow structure (Start → End only)
 *
 * Used as fallback when AI generates a subAgentFlow node without
 * creating the corresponding SubAgentFlow definition.
 *
 * @param subAgentFlowId - ID for the SubAgentFlow (matches reference node's subAgentFlowId)
 * @param label - Display label from the reference node
 * @param description - Optional description from the reference node
 * @returns Minimal SubAgentFlow with Start and End nodes connected
 */
function createMinimalSubAgentFlow(
  subAgentFlowId: string,
  label: string,
  description?: string
): SubAgentFlow {
  return {
    id: subAgentFlowId,
    name: label,
    description: description || `Sub-Agent Flow: ${label}`,
    nodes: [
      {
        id: `${subAgentFlowId}-start`,
        type: NodeType.Start,
        name: 'Start',
        position: { x: 100, y: 200 },
        data: { label: 'Start' },
      },
      {
        id: `${subAgentFlowId}-end`,
        type: NodeType.End,
        name: 'End',
        position: { x: 400, y: 200 },
        data: { label: 'End' },
      },
    ],
    connections: [
      {
        id: `${subAgentFlowId}-conn`,
        from: `${subAgentFlowId}-start`,
        to: `${subAgentFlowId}-end`,
        fromPort: 'output',
        toPort: 'input',
      },
    ],
  };
}

/**
 * Resolve SubAgentFlow references in refined workflows
 *
 * For each subAgentFlow node, ensures a corresponding SubAgentFlow
 * definition exists in workflow.subAgentFlows. Creates minimal
 * structures (Start → End) for any missing definitions.
 *
 * @param workflow - Refined workflow (may have missing subAgentFlows)
 * @returns Modified workflow with resolved SubAgentFlow definitions
 */
function resolveSubAgentFlows(workflow: Workflow): Workflow {
  // Find all subAgentFlow nodes
  const subAgentFlowNodes = workflow.nodes.filter((n) => n.type === 'subAgentFlow');

  if (subAgentFlowNodes.length === 0) {
    return workflow; // No SubAgentFlow nodes, nothing to resolve
  }

  // Initialize subAgentFlows array if not present
  const existingSubAgentFlows = workflow.subAgentFlows || [];
  const existingIds = new Set(existingSubAgentFlows.map((sf) => sf.id));

  // Create missing SubAgentFlow definitions
  const newSubAgentFlows: SubAgentFlow[] = [];

  for (const node of subAgentFlowNodes) {
    const refData = node.data as SubAgentFlowNodeData;
    const targetId = refData.subAgentFlowId;

    if (!existingIds.has(targetId)) {
      // SubAgentFlow definition is missing - create minimal structure
      log('INFO', 'Creating minimal SubAgentFlow for missing definition (refinement)', {
        subAgentFlowId: targetId,
        nodeId: node.id,
        label: refData.label,
      });

      const minimalSubAgentFlow = createMinimalSubAgentFlow(
        targetId,
        refData.label,
        refData.description
      );

      newSubAgentFlows.push(minimalSubAgentFlow);
      existingIds.add(targetId); // Prevent duplicates
    }
  }

  return {
    ...workflow,
    subAgentFlows: [...existingSubAgentFlows, ...newSubAgentFlows],
  };
}

// ============================================================================
// SubAgentFlow Refinement Functions
// ============================================================================

/**
 * Inner workflow representation for SubAgentFlow refinement
 */
export interface InnerWorkflow {
  nodes: Workflow['nodes'];
  connections: Workflow['connections'];
}

/**
 * SubAgentFlow refinement result
 */
export interface SubAgentFlowRefinementResult {
  success: boolean;
  refinedInnerWorkflow?: InnerWorkflow;
  clarificationMessage?: string;
  aiMessage?: string; // AI's response message for display in chat UI
  error?: {
    code:
      | 'COMMAND_NOT_FOUND'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'PROHIBITED_NODE_TYPE'
      | 'UNKNOWN_ERROR';
    message: string;
    details?: string;
  };
  executionTimeMs: number;
  /** New session ID from CLI (for session continuation) */
  newSessionId?: string;
  /** Whether session was reconnected due to session expiration (fallback occurred) */
  sessionReconnected?: boolean;
}

/**
 * Prohibited node types in SubAgentFlow
 */
const SUBAGENTFLOW_PROHIBITED_NODE_TYPES = ['subAgent', 'subAgentFlow', 'askUserQuestion'];

/**
 * Maximum nodes allowed in SubAgentFlow
 */
const SUBAGENTFLOW_MAX_NODES = 30;

/**
 * Construct refinement prompt for SubAgentFlow
 *
 * @param innerWorkflow - The current inner workflow state (nodes + connections)
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param schemaResult - Schema load result (JSON or TOON)
 * @param filteredSkills - Skills filtered by relevance (optional)
 * @returns Object with prompt string and schema size
 */
export function constructSubAgentFlowRefinementPrompt(
  innerWorkflow: InnerWorkflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  schemaResult: SchemaLoadResult,
  filteredSkills: SkillRelevanceScore[] = [],
  isCodexEnabled = false
): { prompt: string; schemaSize: number } {
  // Get last 6 messages (3 rounds of user-AI conversation)
  const recentMessages = conversationHistory.messages.slice(-6);

  const conversationContext =
    recentMessages.length > 0
      ? `**Conversation History** (last ${recentMessages.length} messages):
${recentMessages.map((msg) => `[${msg.sender.toUpperCase()}]: ${msg.content}`).join('\n')}\n`
      : '**Conversation History**: (This is the first message)\n';

  // Format schema based on type
  let schemaSection: string;
  let schemaSize: number;

  if (schemaResult.format === 'toon' && schemaResult.schemaString) {
    // TOON format - use as-is with format indicator
    schemaSection = `**Workflow Schema** (TOON format - Token-Oriented Object Notation):
\`\`\`toon
${schemaResult.schemaString}
\`\`\``;
    schemaSize = schemaResult.schemaString.length;
  } else {
    // JSON format - existing behavior
    const schemaJSON = JSON.stringify(schemaResult.schema, null, 2);
    schemaSection = `**Workflow Schema** (reference for valid node types and structure):
${schemaJSON}`;
    schemaSize = schemaJSON.length;
  }

  // Construct skills section
  const skillsSection =
    filteredSkills.length > 0
      ? `

**Available Skills** (use when user description matches their purpose):
${JSON.stringify(
  filteredSkills.map((s) => ({
    name: s.skill.name,
    description: s.skill.description,
    scope: s.skill.scope,
  })),
  null,
  2
)}

**Instructions for Using Skills**:
- Use a Skill node when the user's description matches a Skill's documented purpose
- Copy the name, description, and scope exactly from the Available Skills list above
- Set validationStatus to "valid" and outputPorts to 1
- Do NOT include skillPath in your response (the system will resolve it automatically)
- If both personal and project Skills match, prefer the project Skill

`
      : '';

  // Construct Codex section (only when enabled)
  const codexSection = isCodexEnabled
    ? `

**Codex Agent Node Guidelines**:
Codex Agent is a specialized node for executing OpenAI Codex CLI within workflows.

**When to use Codex Agent**:
- Complex code generation requiring multiple files or architectural decisions
- Code analysis or refactoring tasks that benefit from deep reasoning
- Tasks requiring workspace-level operations (with appropriate sandbox settings)
- Multi-step coding tasks that benefit from reasoning effort configuration

**Codex Node Constraints**:
- Must have exactly 1 output port (outputPorts: 1)
- If branching needed, add ifElse/switch node after the Codex node
- Required fields: name, prompt (or promptGuidance for ai-generated mode), model, reasoningEffort
- Optional fields: sandbox (read-only/workspace-write/danger-full-access), skipGitRepoCheck

**Configuration Options**:
- model: "o3" (more capable) or "o4-mini" (faster, cost-effective)
- reasoningEffort: "low"/"medium"/"high" - controls depth of reasoning
- promptMode: "fixed" (user-defined prompt) or "ai-generated" (orchestrating AI provides prompt)
- sandbox: Optional - "read-only" (safest), "workspace-write" (can modify files), "danger-full-access"

`
    : '';

  const prompt = `You are an expert workflow designer for CC Workflow Studio.

**Task**: Refine a Sub-Agent Flow based on user's feedback.

**IMPORTANT - Sub-Agent Flow Constraints**:
Sub-Agent Flows have strict constraints that MUST be followed:
1. **Prohibited Node Types**: You MUST NOT use the following node types:
   - subAgent (Claude Code constraint for sequential execution)
   - subAgentFlow (no nesting allowed)
   - askUserQuestion (user interaction not supported in sub-agent context)
2. **Allowed Node Types**: start, end, prompt, ifElse, switch, skill, mcp
3. **Maximum Nodes**: ${SUBAGENTFLOW_MAX_NODES} nodes maximum
4. **Must have exactly one Start node and at least one End node**

**Current Sub-Agent Flow**:
${JSON.stringify(innerWorkflow, null, 2)}

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
7. **NEVER add subAgent, subAgentFlow, or askUserQuestion nodes**
8. **Node names must match pattern /^[a-zA-Z0-9_-]+$/** (ASCII alphanumeric, hyphens, underscores only - NO spaces or non-ASCII characters)

**Node Positioning Guidelines**:
1. Horizontal spacing between regular nodes: Use 300px (e.g., x: 350, 650, 950, 1250, 1550)
2. Spacing after Start node: Use 250px (e.g., Start at x: 100, next at x: 350)
3. Spacing before End node: Use 350px (e.g., previous at x: 1550, End at x: 1900)
4. Vertical spacing: Use 150px between nodes on different branches
5. When adding new nodes, calculate positions based on existing node positions and connections
6. Preserve existing node positions unless repositioning is explicitly requested
7. For branch nodes: offset vertically by 150px from the main path

**Skill Node Constraints**:
- Skill nodes MUST have exactly 1 output port (outputPorts: 1)
- If branching is needed after Skill execution, add an ifElse or switch node after the Skill node
- Never modify Skill node's outputPorts field

**Branching Node Selection**:
- Use ifElse node for 2-way conditional branching (true/false)
- Use switch node for 3+ way branching or multiple conditions
- Each branch output should connect to exactly one downstream node
${skillsSection}${codexSection}
${schemaSection}

**Output Format**: You MUST output a structured JSON response in exactly this format:

For successful refinement (or if no changes are needed):
{
  "status": "success",
  "message": "Brief description of what was changed or why no changes were needed",
  "values": {
    "nodes": [...],
    "connections": [...]
  }
}

If you need clarification from the user:
{
  "status": "clarification",
  "message": "Your question here"
}

If there's an error or the request cannot be fulfilled:
{
  "status": "error",
  "message": "Error description"
}

CRITICAL RULES:
- ALWAYS output valid JSON, NEVER plain text explanations
- NEVER include markdown code blocks or explanations outside the JSON structure
- Even if NO changes are required, you MUST wrap the original nodes/connections in the success response format
- The "status" field is REQUIRED in every response
- The "message" field is REQUIRED for all status types - describe what was done or why`;

  return { prompt, schemaSize };
}

/**
 * Validate that the inner workflow does not contain prohibited node types
 */
function validateSubAgentFlowNodes(innerWorkflow: InnerWorkflow): {
  valid: boolean;
  prohibitedNodes: string[];
} {
  const prohibitedNodes: string[] = [];

  for (const node of innerWorkflow.nodes) {
    if (SUBAGENTFLOW_PROHIBITED_NODE_TYPES.includes(node.type)) {
      prohibitedNodes.push(`${node.type} (${node.id})`);
    }
  }

  return {
    valid: prohibitedNodes.length === 0,
    prohibitedNodes,
  };
}

/**
 * Execute SubAgentFlow refinement via Claude Code CLI
 *
 * @param innerWorkflow - The current inner workflow state (nodes + connections)
 * @param conversationHistory - Full conversation history
 * @param userMessage - User's current refinement request
 * @param extensionPath - VSCode extension path for schema loading
 * @param useSkills - Whether to include skills in refinement (default: true)
 * @param timeoutMs - Timeout in milliseconds (default: 90000)
 * @param requestId - Optional request ID for cancellation support
 * @param workspaceRoot - The workspace root path for CLI execution
 * @param model - Claude model to use (default: 'sonnet')
 * @param allowedTools - Optional array of allowed tool names (e.g., ['Read', 'Grep', 'Glob'])
 * @param provider - AI CLI provider to use (default: 'claude-code')
 * @param copilotModel - Copilot model to use when provider is 'copilot' (default: 'gpt-4o')
 * @param codexModel - Codex model to use when provider is 'codex' (default: '' = inherit)
 * @param codexReasoningEffort - Reasoning effort level for Codex (default: 'minimal')
 * @returns SubAgentFlow refinement result
 */
export async function refineSubAgentFlow(
  innerWorkflow: InnerWorkflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  extensionPath: string,
  useSkills = true,
  timeoutMs = DEFAULT_REFINEMENT_TIMEOUT_MS,
  requestId?: string,
  workspaceRoot?: string,
  model: ClaudeModel = 'sonnet',
  allowedTools?: string[],
  provider: AiCliProvider = 'claude-code',
  copilotModel: CopilotModel = 'gpt-4o',
  codexModel: CodexModel = '',
  codexReasoningEffort: CodexReasoningEffort = 'low',
  useCodex = false
): Promise<SubAgentFlowRefinementResult> {
  const startTime = Date.now();

  // Get configured schema format and metrics settings
  const schemaFormat = getConfiguredSchemaFormat();
  const collectMetrics = isMetricsCollectionEnabled();

  log('INFO', 'Starting SubAgentFlow refinement', {
    requestId,
    nodeCount: innerWorkflow.nodes.length,
    messageLength: userMessage.length,
    historyLength: conversationHistory.messages.length,
    currentIteration: conversationHistory.currentIteration,
    useSkills,
    timeoutMs,
    schemaFormat,
    promptFormat: 'toon',
    collectMetrics,
  });

  try {
    // Step 1: Load workflow schema in configured format (and optionally scan skills)
    let schemaResult: SchemaLoadResult;
    let availableSkills: SkillReference[] = [];
    let filteredSkills: SkillRelevanceScore[] = [];

    if (useSkills) {
      const [loadedSchema, skillsResult] = await Promise.all([
        loadWorkflowSchemaByFormat(extensionPath, schemaFormat),
        scanAllSkills(),
      ]);

      schemaResult = loadedSchema;

      if (!schemaResult.success || (!schemaResult.schema && !schemaResult.schemaString)) {
        log('ERROR', 'Failed to load workflow schema for SubAgentFlow', {
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

      availableSkills = [...skillsResult.user, ...skillsResult.project, ...skillsResult.local];
      filteredSkills = filterSkillsByRelevance(userMessage, availableSkills);

      log('INFO', 'Skills filtered for SubAgentFlow refinement', {
        requestId,
        filteredCount: filteredSkills.length,
      });
    } else {
      schemaResult = await loadWorkflowSchemaByFormat(extensionPath, schemaFormat);

      if (!schemaResult.success || (!schemaResult.schema && !schemaResult.schemaString)) {
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
    }

    log('INFO', 'Workflow schema loaded for SubAgentFlow', {
      requestId,
      format: schemaResult.format,
      sizeBytes: schemaResult.sizeBytes,
    });

    // Step 2: Construct SubAgentFlow-specific refinement prompt
    const { prompt, schemaSize } = constructSubAgentFlowRefinementPrompt(
      innerWorkflow,
      conversationHistory,
      userMessage,
      schemaResult,
      filteredSkills,
      useCodex
    );

    // Record prompt size for metrics
    const promptSizeChars = prompt.length;

    // Step 3: Execute AI
    const cliResult = await executeAi(
      prompt,
      provider,
      timeoutMs,
      requestId,
      workspaceRoot,
      model,
      copilotModel,
      allowedTools,
      codexModel,
      codexReasoningEffort
    );

    // Track whether session was reconnected due to provider switch
    let sessionReconnected = false;

    // Detect provider switch from Claude Code/Codex to Copilot
    // Copilot doesn't support session continuation, so previous session is lost
    // Note: Codex now supports session continuation via thread_id
    if (provider === 'copilot' && conversationHistory.sessionId) {
      log('WARN', 'Session discontinued due to provider switch to Copilot (SubAgentFlow)', {
        requestId,
        previousSessionId: conversationHistory.sessionId,
      });
      sessionReconnected = true;
    }

    if (!cliResult.success || !cliResult.output) {
      // Record metrics for failed CLI execution
      if (collectMetrics) {
        recordMetrics({
          requestId: requestId || `subagentflow-refine-${Date.now()}`,
          schemaFormat: schemaResult.format,
          promptFormat: 'toon',
          promptSizeChars,
          schemaSizeChars: schemaSize,
          estimatedTokens: estimateTokens(promptSizeChars),
          executionTimeMs: cliResult.executionTimeMs,
          success: false,
          timestamp: new Date().toISOString(),
          userDescriptionLength: userMessage.length,
        });
      }

      log('ERROR', 'SubAgentFlow refinement failed during CLI execution', {
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

    log('INFO', 'SubAgentFlow CLI execution successful, parsing structured response', {
      requestId,
      executionTimeMs: cliResult.executionTimeMs,
      rawOutput: cliResult.output,
    });

    // Step 4: Parse structured AI response
    const aiResponse = parseSubAgentFlowResponse(cliResult.output);

    if (!aiResponse) {
      // Structured response parsing failed
      log('ERROR', 'Failed to parse structured SubAgentFlow AI response', {
        requestId,
        outputPreview: cliResult.output.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse AI response. Please try again or rephrase your request',
          details: 'AI response does not match expected structured format',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 5: Handle response based on status
    if (aiResponse.status === 'clarification') {
      log('INFO', 'AI is requesting clarification for SubAgentFlow', {
        requestId,
        message: aiResponse.message?.substring(0, 200),
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: true,
        clarificationMessage: aiResponse.message || 'Please provide more details',
        executionTimeMs: cliResult.executionTimeMs,
        newSessionId: cliResult.sessionId,
        sessionReconnected,
      };
    }

    if (aiResponse.status === 'error') {
      log('WARN', 'AI returned error status for SubAgentFlow', {
        requestId,
        message: aiResponse.message,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: aiResponse.message || 'AI could not process the request',
          details: 'AI returned error status in response',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // status === 'success' - extract inner workflow
    if (!aiResponse.values?.nodes || !aiResponse.values?.connections) {
      log('ERROR', 'AI success response missing nodes/connections', {
        requestId,
        hasValues: !!aiResponse.values,
        hasNodes: !!aiResponse.values?.nodes,
        hasConnections: !!aiResponse.values?.connections,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Refinement failed - AI response missing workflow data',
          details: 'Success response does not contain nodes/connections in values',
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    const refinedInnerWorkflow: InnerWorkflow = {
      nodes: aiResponse.values.nodes,
      connections: aiResponse.values.connections,
    };

    // Step 6: Validate prohibited node types
    const nodeValidation = validateSubAgentFlowNodes(refinedInnerWorkflow);

    if (!nodeValidation.valid) {
      log('ERROR', 'SubAgentFlow contains prohibited node types', {
        requestId,
        prohibitedNodes: nodeValidation.prohibitedNodes,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'PROHIBITED_NODE_TYPE',
          message: 'Sub-Agent Flow cannot contain SubAgent, SubAgentFlow, or AskUserQuestion nodes',
          details: `Prohibited nodes found: ${nodeValidation.prohibitedNodes.join(', ')}`,
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 7: Validate node count
    if (refinedInnerWorkflow.nodes.length > SUBAGENTFLOW_MAX_NODES) {
      log('ERROR', 'SubAgentFlow exceeds maximum node count', {
        requestId,
        nodeCount: refinedInnerWorkflow.nodes.length,
        maxNodes: SUBAGENTFLOW_MAX_NODES,
        executionTimeMs: cliResult.executionTimeMs,
      });

      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: `Sub-Agent Flow cannot exceed ${SUBAGENTFLOW_MAX_NODES} nodes`,
          details: `Current count: ${refinedInnerWorkflow.nodes.length}`,
        },
        executionTimeMs: cliResult.executionTimeMs,
      };
    }

    // Step 8: Resolve skill paths if using skills
    if (useSkills) {
      // Create a temporary workflow object for skill path resolution
      const tempWorkflow: Workflow = {
        id: 'temp',
        name: 'temp',
        version: '1.0.0',
        nodes: refinedInnerWorkflow.nodes,
        connections: refinedInnerWorkflow.connections,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const resolvedWorkflow = await resolveSkillPaths(tempWorkflow, availableSkills);
      refinedInnerWorkflow.nodes = resolvedWorkflow.nodes;

      log('INFO', 'Skill paths resolved for SubAgentFlow', {
        requestId,
        skillNodesCount: refinedInnerWorkflow.nodes.filter((n) => n.type === 'skill').length,
      });
    }

    const executionTimeMs = Date.now() - startTime;

    // Record metrics for successful SubAgentFlow refinement
    if (collectMetrics) {
      recordMetrics({
        requestId: requestId || `subagentflow-refine-${Date.now()}`,
        schemaFormat: schemaResult.format,
        promptFormat: 'toon',
        promptSizeChars,
        schemaSizeChars: schemaSize,
        estimatedTokens: estimateTokens(promptSizeChars),
        executionTimeMs,
        success: true,
        timestamp: new Date().toISOString(),
        userDescriptionLength: userMessage.length,
      });
    }

    log('INFO', 'SubAgentFlow refinement successful', {
      requestId,
      executionTimeMs,
      nodeCount: refinedInnerWorkflow.nodes.length,
      connectionCount: refinedInnerWorkflow.connections.length,
      aiMessage: aiResponse.message,
    });

    return {
      success: true,
      refinedInnerWorkflow,
      aiMessage: aiResponse.message,
      executionTimeMs,
      newSessionId: cliResult.sessionId,
      sessionReconnected,
    };
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error during SubAgentFlow refinement', {
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
