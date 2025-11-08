/**
 * AI Generation Service
 *
 * Handles AI-assisted workflow generation requests to the Extension Host.
 * Based on: /specs/001-ai-workflow-generation/quickstart.md Phase 4
 */

import type { ExtensionMessage, GenerateWorkflowPayload, Workflow } from '@shared/types/messages';
import { vscode } from '../main';

/**
 * Error class for AI generation failures
 */
export class AIGenerationError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: string
  ) {
    super(message);
    this.name = 'AIGenerationError';
  }
}

/**
 * Generate a workflow using AI from a natural language description
 *
 * @param userDescription - Natural language description of the desired workflow (max 2000 characters)
 * @param requestId - Request ID for this generation (used for cancellation)
 * @param timeoutMs - Optional timeout in milliseconds (default: 95000, which is 5 seconds more than server timeout)
 * @returns Promise that resolves to the generated workflow
 * @throws {AIGenerationError} If generation fails
 */
export function generateWorkflow(
  userDescription: string,
  requestId: string,
  timeoutMs = 95000
): Promise<Workflow> {
  return new Promise((resolve, reject) => {
    // Register response handler
    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'GENERATION_SUCCESS' && message.payload) {
          resolve(message.payload.workflow);
        } else if (message.type === 'GENERATION_CANCELLED') {
          // Handle cancellation
          reject(new AIGenerationError('Generation cancelled by user', 'CANCELLED'));
        } else if (message.type === 'GENERATION_FAILED' && message.payload) {
          reject(
            new AIGenerationError(
              message.payload.error.message,
              message.payload.error.code,
              message.payload.error.details
            )
          );
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload?.message || 'Failed to generate workflow'));
        }
      }
    };

    window.addEventListener('message', handler);

    // Send request
    const payload: GenerateWorkflowPayload = {
      userDescription,
      timeoutMs: 90000, // Server-side timeout (Extension will timeout after 90s)
    };
    vscode.postMessage({
      type: 'GENERATE_WORKFLOW',
      requestId,
      payload,
    });

    // Local timeout (5 seconds more than server timeout to allow for response)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(
        new AIGenerationError(
          'Request timed out. Please try again or simplify your description.',
          'TIMEOUT'
        )
      );
    }, timeoutMs);
  });
}

/**
 * Cancel an ongoing workflow generation
 *
 * @param requestId - Request ID of the generation to cancel
 */
export function cancelWorkflowGeneration(requestId: string): void {
  vscode.postMessage({
    type: 'CANCEL_GENERATION',
    payload: { requestId },
  });
}
