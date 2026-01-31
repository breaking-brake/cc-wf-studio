/**
 * Workflow Refinement Service
 *
 * Handles AI-assisted workflow refinement requests to the Extension Host.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md T009
 */

import type {
  AiCliProvider,
  ClaudeModel,
  CodexModel,
  CodexReasoningEffort,
  CopilotModel,
  ExtensionMessage,
  RefinementClarificationPayload,
  RefinementProgressPayload,
  RefinementSuccessPayload,
  RefineWorkflowPayload,
  SubAgentFlowRefinementSuccessPayload,
} from '@shared/types/messages';
import type { ConversationHistory, Workflow } from '@shared/types/workflow-definition';
import { vscode } from '../main';

/**
 * Maximum client-side timeout as a system guard (10 minutes)
 * This ensures refinement requests don't hang indefinitely even when "unlimited" is selected
 */
const MAX_CLIENT_TIMEOUT_MS = 600000; // 10 minutes

/**
 * Calculate client-side timeout with system guard
 * @param serverTimeoutMs - Server timeout in milliseconds (0 = unlimited, undefined = default)
 * @returns Client timeout capped at MAX_CLIENT_TIMEOUT_MS
 */
function calculateClientTimeout(serverTimeoutMs?: number): number {
  if (serverTimeoutMs && serverTimeoutMs > 0) {
    return Math.min(serverTimeoutMs + 5000, MAX_CLIENT_TIMEOUT_MS);
  }
  return MAX_CLIENT_TIMEOUT_MS;
}

/** Validation error info for retry context */
export interface ValidationErrorInfo {
  code: string;
  message: string;
  field?: string;
}

/**
 * Error class for workflow refinement failures
 */
export class WorkflowRefinementError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string,
    public validationErrors?: ValidationErrorInfo[]
  ) {
    super(message);
    this.name = 'WorkflowRefinementError';
  }
}

/**
 * Result type for workflow refinement (success or clarification)
 */
export type RefinementResult =
  | { type: 'success'; payload: RefinementSuccessPayload }
  | { type: 'clarification'; payload: RefinementClarificationPayload };

/**
 * Result type for SubAgentFlow refinement (success or clarification)
 */
export type SubAgentFlowRefinementResult =
  | { type: 'success'; payload: SubAgentFlowRefinementSuccessPayload }
  | { type: 'clarification'; payload: RefinementClarificationPayload };

/**
 * Progress callback for streaming refinement updates
 */
export type RefinementProgressCallback = (payload: RefinementProgressPayload) => void;

/**
 * Refine a workflow using AI based on user feedback
 *
 * @param workflowId - ID of the workflow being refined
 * @param userMessage - User's refinement request (1-5000 characters)
 * @param currentWorkflow - Current workflow state
 * @param conversationHistory - Current conversation history
 * @param requestId - Request ID for this refinement
 * @param useSkills - Whether to include skills in refinement (default: true)
 * @param serverTimeoutMs - Server-side timeout in milliseconds (default: undefined, uses settings)
 * @param onProgress - Optional callback for streaming progress updates
 * @param model - Claude model to use (default: 'sonnet')
 * @param allowedTools - Optional array of allowed tool names
 * @param previousValidationErrors - Validation errors from previous failed attempt (for retry)
 * @param provider - AI CLI provider to use (default: 'claude-code')
 * @param copilotModel - Copilot model to use when provider is 'copilot' (default: 'gpt-4o')
 * @param codexModel - Codex model to use when provider is 'codex' (default: '' = inherit)
 * @returns Promise that resolves to the refinement result (success or clarification)
 * @throws {WorkflowRefinementError} If refinement fails
 */
export function refineWorkflow(
  workflowId: string,
  userMessage: string,
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  requestId: string,
  useSkills = true,
  serverTimeoutMs?: number,
  onProgress?: RefinementProgressCallback,
  model: ClaudeModel = 'sonnet',
  allowedTools?: string[],
  previousValidationErrors?: ValidationErrorInfo[],
  provider: AiCliProvider = 'claude-code',
  copilotModel: CopilotModel = 'gpt-4o',
  codexModel: CodexModel = '',
  codexReasoningEffort: CodexReasoningEffort = 'low',
  useCodex = false
): Promise<RefinementResult> {
  return new Promise((resolve, reject) => {
    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        // Handle streaming progress (don't remove listener)
        if (message.type === 'REFINEMENT_PROGRESS' && message.payload && onProgress) {
          onProgress(message.payload);
          return; // Keep listening for more messages
        }

        // Handle completion messages (remove listener)
        window.removeEventListener('message', handler);

        if (message.type === 'REFINEMENT_SUCCESS' && message.payload) {
          resolve({ type: 'success', payload: message.payload });
        } else if (message.type === 'REFINEMENT_CLARIFICATION' && message.payload) {
          resolve({ type: 'clarification', payload: message.payload });
        } else if (message.type === 'REFINEMENT_CANCELLED') {
          // Handle cancellation
          reject(new WorkflowRefinementError('Refinement cancelled by user', 'CANCELLED'));
        } else if (message.type === 'REFINEMENT_FAILED' && message.payload) {
          reject(
            new WorkflowRefinementError(
              message.payload.error.message,
              message.payload.error.code,
              message.payload.error.details,
              message.payload.validationErrors
            )
          );
        } else if (message.type === 'ERROR') {
          reject(
            new WorkflowRefinementError(
              message.payload?.message || 'Failed to refine workflow',
              'UNKNOWN_ERROR'
            )
          );
        }
      }
    };

    window.addEventListener('message', handler);

    // Send refinement request
    const payload: RefineWorkflowPayload = {
      workflowId,
      userMessage,
      currentWorkflow,
      conversationHistory,
      useSkills,
      timeoutMs: serverTimeoutMs, // Pass timeout to server (undefined = use settings)
      model,
      allowedTools,
      previousValidationErrors,
      provider,
      copilotModel,
      codexModel,
      codexReasoningEffort,
      useCodex,
    };

    vscode.postMessage({
      type: 'REFINE_WORKFLOW',
      requestId,
      payload,
    });

    // Client-side timeout with system guard (max 10 minutes)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(
        new WorkflowRefinementError(
          'Refinement request timed out. Please try again or rephrase your request.',
          'TIMEOUT'
        )
      );
    }, calculateClientTimeout(serverTimeoutMs));
  });
}

/**
 * Clear conversation history for a workflow
 *
 * @param workflowId - ID of the workflow
 * @param requestId - Request ID for this operation
 * @returns Promise that resolves when conversation is cleared
 * @throws {Error} If clearing fails
 */
export function clearConversation(workflowId: string, requestId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'CONVERSATION_CLEARED') {
          resolve();
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload?.message || 'Failed to clear conversation'));
        }
      }
    };

    window.addEventListener('message', handler);

    // Send clear conversation request
    vscode.postMessage({
      type: 'CLEAR_CONVERSATION',
      requestId,
      payload: { workflowId },
    });

    // Timeout after 5 seconds
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Clear conversation request timed out'));
    }, 5000);
  });
}

/**
 * Cancel an ongoing workflow refinement
 *
 * @param requestId - Request ID of the refinement to cancel
 */
export function cancelWorkflowRefinement(requestId: string): void {
  vscode.postMessage({
    type: 'CANCEL_REFINEMENT',
    payload: { requestId },
  });
}

/**
 * Refine a SubAgentFlow using AI based on user feedback
 *
 * @param workflowId - ID of the parent workflow
 * @param subAgentFlowId - ID of the SubAgentFlow being refined
 * @param userMessage - User's refinement request (1-5000 characters)
 * @param currentWorkflow - Current workflow state (including subAgentFlows)
 * @param conversationHistory - Current conversation history for this SubAgentFlow
 * @param requestId - Request ID for this refinement
 * @param useSkills - Whether to include skills in refinement (default: true)
 * @param serverTimeoutMs - Server-side timeout in milliseconds (default: undefined, uses settings)
 * @param model - Claude model to use (default: 'sonnet')
 * @param allowedTools - Optional array of allowed tool names
 * @param provider - AI CLI provider to use (default: 'claude-code')
 * @param copilotModel - Copilot model to use when provider is 'copilot' (default: 'gpt-4o')
 * @param codexModel - Codex model to use when provider is 'codex' (default: '' = inherit)
 * @returns Promise that resolves to the refinement result (success or clarification)
 * @throws {WorkflowRefinementError} If refinement fails
 */
export function refineSubAgentFlow(
  workflowId: string,
  subAgentFlowId: string,
  userMessage: string,
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  requestId: string,
  useSkills = true,
  serverTimeoutMs?: number,
  model: ClaudeModel = 'sonnet',
  allowedTools?: string[],
  provider: AiCliProvider = 'claude-code',
  copilotModel: CopilotModel = 'gpt-4o',
  codexModel: CodexModel = '',
  codexReasoningEffort: CodexReasoningEffort = 'low',
  useCodex = false
): Promise<SubAgentFlowRefinementResult> {
  return new Promise((resolve, reject) => {
    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SUBAGENTFLOW_REFINEMENT_SUCCESS' && message.payload) {
          resolve({ type: 'success', payload: message.payload });
        } else if (message.type === 'REFINEMENT_CLARIFICATION' && message.payload) {
          resolve({ type: 'clarification', payload: message.payload });
        } else if (message.type === 'REFINEMENT_CANCELLED') {
          // Handle cancellation
          reject(new WorkflowRefinementError('Refinement cancelled by user', 'CANCELLED'));
        } else if (message.type === 'REFINEMENT_FAILED' && message.payload) {
          reject(
            new WorkflowRefinementError(
              message.payload.error.message,
              message.payload.error.code,
              message.payload.error.details,
              message.payload.validationErrors
            )
          );
        } else if (message.type === 'ERROR') {
          reject(
            new WorkflowRefinementError(
              message.payload?.message || 'Failed to refine SubAgentFlow',
              'UNKNOWN_ERROR'
            )
          );
        }
      }
    };

    window.addEventListener('message', handler);

    // Send refinement request with SubAgentFlow targeting
    const payload: RefineWorkflowPayload = {
      workflowId,
      userMessage,
      currentWorkflow,
      conversationHistory,
      useSkills,
      timeoutMs: serverTimeoutMs,
      targetType: 'subAgentFlow',
      subAgentFlowId,
      model,
      allowedTools,
      provider,
      copilotModel,
      codexModel,
      codexReasoningEffort,
      useCodex,
    };

    vscode.postMessage({
      type: 'REFINE_WORKFLOW',
      requestId,
      payload,
    });

    // Client-side timeout with system guard (max 10 minutes)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(
        new WorkflowRefinementError(
          'SubAgentFlow refinement request timed out. Please try again or rephrase your request.',
          'TIMEOUT'
        )
      );
    }, calculateClientTimeout(serverTimeoutMs));
  });
}

/**
 * Result type for listing Copilot models
 */
export interface CopilotModelsResult {
  models: Array<{
    id: string;
    name: string;
    family: string;
    vendor: string;
  }>;
  available: boolean;
  unavailableReason?: string;
}

/**
 * List available Copilot models from VS Code LM API
 *
 * @returns Promise that resolves to the list of available models
 */
export function listCopilotModels(): Promise<CopilotModelsResult> {
  return new Promise((resolve) => {
    const requestId = `list-copilot-models-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId && message.type === 'COPILOT_MODELS_LIST') {
        window.removeEventListener('message', handler);
        resolve(message.payload as CopilotModelsResult);
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'LIST_COPILOT_MODELS',
      requestId,
    });

    // Timeout after 5 seconds (should be fast)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({
        models: [],
        available: false,
        unavailableReason: 'Request timed out',
      });
    }, 5000);
  });
}
