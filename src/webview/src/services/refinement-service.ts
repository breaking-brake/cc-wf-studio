/**
 * Workflow Refinement Service
 *
 * Handles AI-assisted workflow refinement requests to the Extension Host.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md T009
 */

import type {
  ExtensionMessage,
  RefinementClarificationPayload,
  RefinementSuccessPayload,
  RefineWorkflowPayload,
} from '@shared/types/messages';
import type { ConversationHistory, Workflow } from '@shared/types/workflow-definition';
import { vscode } from '../main';

/**
 * Error class for workflow refinement failures
 */
export class WorkflowRefinementError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
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
 * Refine a workflow using AI based on user feedback
 *
 * @param workflowId - ID of the workflow being refined
 * @param userMessage - User's refinement request (1-5000 characters)
 * @param currentWorkflow - Current workflow state
 * @param conversationHistory - Current conversation history
 * @param requestId - Request ID for this refinement
 * @param useSkills - Whether to include skills in refinement (default: true)
 * @param timeoutMs - Optional timeout in milliseconds (default: 65000, which is 5 seconds more than server timeout)
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
  timeoutMs = 65000
): Promise<RefinementResult> {
  return new Promise((resolve, reject) => {
    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
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
              message.payload.error.details
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
      timeoutMs: 90000, // Server-side timeout (Extension will timeout after 90s)
    };

    vscode.postMessage({
      type: 'REFINE_WORKFLOW',
      requestId,
      payload,
    });

    // Local timeout (5 seconds more than server timeout to allow for response)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(
        new WorkflowRefinementError(
          'Refinement request timed out. Please try again or rephrase your request.',
          'TIMEOUT'
        )
      );
    }, timeoutMs);
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
