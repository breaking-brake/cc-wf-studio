/**
 * AI Generation Service
 *
 * Handles AI-assisted workflow name generation requests to the Extension Host.
 */

import type { ExtensionMessage, GenerateWorkflowNamePayload } from '@shared/types/messages';
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
 * Generate a workflow name using AI from the workflow JSON
 *
 * @param workflowJson - Serialized workflow JSON for AI analysis
 * @param targetLanguage - Target language for the name (en, ja, ko, zh-CN, zh-TW)
 * @param timeoutMs - Optional timeout in milliseconds (default: 30000)
 * @returns Promise that resolves to the generated name (kebab-case)
 * @throws {AIGenerationError} If generation fails
 */
export function generateWorkflowName(
  workflowJson: string,
  targetLanguage: string,
  timeoutMs = 30000
): Promise<string> {
  return new Promise((resolve, reject) => {
    const requestId = `req-name-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'WORKFLOW_NAME_SUCCESS' && message.payload) {
          resolve(message.payload.name);
        } else if (message.type === 'WORKFLOW_NAME_FAILED' && message.payload) {
          reject(
            new AIGenerationError(
              message.payload.error.message,
              message.payload.error.code,
              message.payload.error.details
            )
          );
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload?.message || 'Failed to generate workflow name'));
        }
      }
    };

    window.addEventListener('message', handler);

    const payload: GenerateWorkflowNamePayload = {
      workflowJson,
      targetLanguage,
      timeoutMs,
    };

    vscode.postMessage({
      type: 'GENERATE_WORKFLOW_NAME',
      requestId,
      payload,
    });

    // Client-side timeout (slightly longer than server-side)
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new AIGenerationError('Request timed out', 'TIMEOUT'));
    }, timeoutMs + 5000);
  });
}
