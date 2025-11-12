/**
 * Workflow Refinement Command Handler
 *
 * Handles REFINE_WORKFLOW and CLEAR_CONVERSATION messages from Webview.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 2.2
 */

import type * as vscode from 'vscode';
import type {
  ClearConversationPayload,
  ConversationClearedPayload,
  RefineWorkflowPayload,
  RefinementFailedPayload,
  RefinementSuccessPayload,
} from '../../shared/types/messages';
import type { ConversationMessage } from '../../shared/types/workflow-definition';
import { log } from '../extension';
import { refineWorkflow } from '../services/refinement-service';

/**
 * Handle workflow refinement request
 *
 * @param payload - Refinement request from Webview
 * @param webview - Webview to send response messages to
 * @param requestId - Request ID for correlation
 */
export async function handleRefineWorkflow(
  payload: RefineWorkflowPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const { workflowId, userMessage, currentWorkflow, conversationHistory, timeoutMs } = payload;
  const startTime = Date.now();

  log('INFO', 'Workflow refinement request received', {
    requestId,
    workflowId,
    messageLength: userMessage.length,
    currentIteration: conversationHistory.currentIteration,
    maxIterations: conversationHistory.maxIterations,
  });

  try {
    // Check iteration limit
    if (conversationHistory.currentIteration >= conversationHistory.maxIterations) {
      log('WARN', 'Iteration limit reached', {
        requestId,
        workflowId,
        currentIteration: conversationHistory.currentIteration,
        maxIterations: conversationHistory.maxIterations,
      });

      sendRefinementFailed(webview, requestId, {
        error: {
          code: 'ITERATION_LIMIT_REACHED',
          message: `Maximum iteration limit (${conversationHistory.maxIterations}) reached. Please clear conversation history to continue.`,
        },
        executionTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Execute refinement
    const result = await refineWorkflow(
      currentWorkflow,
      conversationHistory,
      userMessage,
      timeoutMs,
      requestId
    );

    if (!result.success || !result.refinedWorkflow) {
      // Refinement failed
      log('ERROR', 'Workflow refinement failed', {
        requestId,
        workflowId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        executionTimeMs: result.executionTimeMs,
      });

      sendRefinementFailed(webview, requestId, {
        error: result.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during refinement',
        },
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Create AI message
    // TODO: Future enhancement - extract summary from AI response
    const aiMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'ai',
      content: 'Workflow has been refined based on your request.',
      timestamp: new Date().toISOString(),
    };

    // Create user message
    const userMessageObj: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Update conversation history
    const updatedHistory = {
      ...conversationHistory,
      messages: [...conversationHistory.messages, userMessageObj, aiMessage],
      currentIteration: conversationHistory.currentIteration + 1,
      updatedAt: new Date().toISOString(),
    };

    // Attach updated conversation history to refined workflow
    result.refinedWorkflow.conversationHistory = updatedHistory;

    log('INFO', 'Workflow refinement successful', {
      requestId,
      workflowId,
      executionTimeMs: result.executionTimeMs,
      newIteration: updatedHistory.currentIteration,
      totalMessages: updatedHistory.messages.length,
    });

    // Send success response
    sendRefinementSuccess(webview, requestId, {
      refinedWorkflow: result.refinedWorkflow,
      aiMessage,
      updatedConversationHistory: updatedHistory,
      executionTimeMs: result.executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error in handleRefineWorkflow', {
      requestId,
      workflowId,
      errorMessage: error instanceof Error ? error.message : String(error),
      executionTimeMs,
    });

    sendRefinementFailed(webview, requestId, {
      error: {
        code: 'UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Handle conversation history clear request
 *
 * @param payload - Clear conversation request from Webview
 * @param webview - Webview to send response messages to
 * @param requestId - Request ID for correlation
 */
export async function handleClearConversation(
  payload: ClearConversationPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const { workflowId } = payload;

  log('INFO', 'Clear conversation request received', {
    requestId,
    workflowId,
  });

  try {
    // Send success response
    // Note: The actual conversation history clearing is handled in the Webview store
    // The Extension Host just acknowledges the request
    sendConversationCleared(webview, requestId, {
      workflowId,
    });

    log('INFO', 'Conversation cleared successfully', {
      requestId,
      workflowId,
    });
  } catch (error) {
    log('ERROR', 'Unexpected error in handleClearConversation', {
      requestId,
      workflowId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // For simplicity, we still send success even if there's an error
    // since clearing is a local operation
    sendConversationCleared(webview, requestId, {
      workflowId,
    });
  }
}

/**
 * Send refinement success message to Webview
 */
function sendRefinementSuccess(
  webview: vscode.Webview,
  requestId: string,
  payload: RefinementSuccessPayload
): void {
  webview.postMessage({
    type: 'REFINEMENT_SUCCESS',
    requestId,
    payload,
  });
}

/**
 * Send refinement failed message to Webview
 */
function sendRefinementFailed(
  webview: vscode.Webview,
  requestId: string,
  payload: RefinementFailedPayload
): void {
  webview.postMessage({
    type: 'REFINEMENT_FAILED',
    requestId,
    payload,
  });
}

/**
 * Send conversation cleared message to Webview
 */
function sendConversationCleared(
  webview: vscode.Webview,
  requestId: string,
  payload: ConversationClearedPayload
): void {
  webview.postMessage({
    type: 'CONVERSATION_CLEARED',
    requestId,
    payload,
  });
}
