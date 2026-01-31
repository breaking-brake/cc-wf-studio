/**
 * Workflow Refinement Command Handler
 *
 * Handles REFINE_WORKFLOW and CLEAR_CONVERSATION messages from Webview.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 2.2
 */

import type * as vscode from 'vscode';
import type {
  CancelRefinementPayload,
  ClearConversationPayload,
  ConversationClearedPayload,
  RefinementCancelledPayload,
  RefinementClarificationPayload,
  RefinementFailedPayload,
  RefinementProgressPayload,
  RefinementSuccessPayload,
  RefineWorkflowPayload,
  SubAgentFlowRefinementSuccessPayload,
} from '../../shared/types/messages';
import type { ConversationMessage } from '../../shared/types/workflow-definition';
import { log } from '../extension';
import { cancelAiRequest } from '../services/ai-provider';
import {
  DEFAULT_REFINEMENT_TIMEOUT_MS,
  refineSubAgentFlow,
  refineWorkflow,
} from '../services/refinement-service';

/**
 * Handle workflow refinement request
 *
 * @param payload - Refinement request from Webview
 * @param webview - Webview to send response messages to
 * @param requestId - Request ID for correlation
 * @param extensionPath - VSCode extension path for schema loading
 * @param workspaceRoot - The workspace root path for CLI execution
 */
export async function handleRefineWorkflow(
  payload: RefineWorkflowPayload,
  webview: vscode.Webview,
  requestId: string,
  extensionPath: string,
  workspaceRoot?: string
): Promise<void> {
  const {
    workflowId,
    userMessage,
    currentWorkflow,
    conversationHistory,
    useSkills = true,
    timeoutMs,
    targetType = 'workflow',
    subAgentFlowId,
    model = 'sonnet',
    allowedTools,
    previousValidationErrors,
    provider = 'claude-code',
    copilotModel = 'gpt-4o',
    codexModel = '',
    codexReasoningEffort = 'low',
    useCodex = false,
  } = payload;
  const startTime = Date.now();

  // Use provided timeout or default
  const effectiveTimeoutMs = timeoutMs ?? DEFAULT_REFINEMENT_TIMEOUT_MS;

  log('INFO', 'Workflow refinement request received', {
    requestId,
    workflowId,
    messageLength: userMessage.length,
    currentIteration: conversationHistory.currentIteration,
    maxIterations: conversationHistory.maxIterations,
    useSkills,
    useCodex,
    timeoutMs: effectiveTimeoutMs,
    targetType,
    subAgentFlowId,
    model,
    allowedTools,
    hasPreviousErrors: !!previousValidationErrors && previousValidationErrors.length > 0,
    previousErrorCount: previousValidationErrors?.length ?? 0,
    provider,
    copilotModel,
    codexModel,
    codexReasoningEffort,
  });

  // Route to SubAgentFlow refinement if targetType is 'subAgentFlow'
  if (targetType === 'subAgentFlow') {
    await handleRefineSubAgentFlow(payload, webview, requestId, extensionPath, workspaceRoot);
    return;
  }

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

    // Create streaming progress callback
    const onProgress = (
      chunk: string,
      displayText: string,
      explanatoryText: string,
      contentType?: 'tool_use' | 'text'
    ) => {
      log('INFO', 'onProgress callback invoked', {
        requestId,
        chunkLength: chunk.length,
        displayTextLength: displayText.length,
        explanatoryTextLength: explanatoryText.length,
        contentType,
      });

      sendRefinementProgress(webview, requestId, {
        chunk,
        accumulatedText: displayText,
        explanatoryText,
        contentType,
        timestamp: new Date().toISOString(),
      });
    };

    // Execute refinement with streaming
    const result = await refineWorkflow(
      currentWorkflow,
      conversationHistory,
      userMessage,
      extensionPath,
      useSkills,
      effectiveTimeoutMs,
      requestId,
      workspaceRoot,
      onProgress,
      model,
      allowedTools,
      previousValidationErrors,
      provider,
      copilotModel,
      codexModel,
      codexReasoningEffort,
      useCodex
    );

    // Check if AI is asking for clarification
    if (result.success && result.clarificationMessage && !result.refinedWorkflow) {
      // AI is requesting clarification
      log('INFO', 'AI requested clarification', {
        requestId,
        workflowId,
        messagePreview: result.clarificationMessage.substring(0, 100),
        executionTimeMs: result.executionTimeMs,
      });

      // Create AI clarification message
      const aiMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: result.clarificationMessage,
        timestamp: new Date().toISOString(),
      };

      // Create user message
      const userMessageObj: ConversationMessage = {
        id: crypto.randomUUID(),
        sender: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      // Update conversation history with session ID for continuity
      const updatedHistory = {
        ...conversationHistory,
        messages: [...conversationHistory.messages, userMessageObj, aiMessage],
        currentIteration: conversationHistory.currentIteration + 1,
        updatedAt: new Date().toISOString(),
        sessionId: result.newSessionId || conversationHistory.sessionId,
      };

      log('INFO', 'Sending clarification request to webview', {
        requestId,
        workflowId,
        newIteration: updatedHistory.currentIteration,
      });

      // Send clarification message
      sendRefinementClarification(webview, requestId, {
        aiMessage,
        updatedConversationHistory: updatedHistory,
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString(),
        sessionReconnected: result.sessionReconnected,
      });
      return;
    }

    if (!result.success || !result.refinedWorkflow) {
      // Refinement failed
      log('ERROR', 'Workflow refinement failed', {
        requestId,
        workflowId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        validationErrors: result.validationErrors,
        executionTimeMs: result.executionTimeMs,
      });

      sendRefinementFailed(webview, requestId, {
        error: result.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during refinement',
        },
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString(),
        validationErrors: result.validationErrors,
      });
      return;
    }

    // Create AI message - use AI's message if available, otherwise use translation key
    const aiMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'ai',
      content: result.aiMessage || 'Workflow has been updated.', // AI message or fallback
      translationKey: result.aiMessage ? undefined : 'refinement.success.defaultMessage',
      timestamp: new Date().toISOString(),
    };

    // Create user message
    const userMessageObj: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Update conversation history with session ID for continuity
    const updatedHistory = {
      ...conversationHistory,
      messages: [...conversationHistory.messages, userMessageObj, aiMessage],
      currentIteration: conversationHistory.currentIteration + 1,
      updatedAt: new Date().toISOString(),
      sessionId: result.newSessionId || conversationHistory.sessionId,
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

    sendRefinementSuccess(webview, requestId, {
      refinedWorkflow: result.refinedWorkflow,
      aiMessage,
      updatedConversationHistory: updatedHistory,
      executionTimeMs: result.executionTimeMs,
      timestamp: new Date().toISOString(),
      sessionReconnected: result.sessionReconnected,
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
 * Handle SubAgentFlow refinement request
 *
 * @param payload - Refinement request from Webview
 * @param webview - Webview to send response messages to
 * @param requestId - Request ID for correlation
 * @param extensionPath - VSCode extension path for schema loading
 * @param workspaceRoot - The workspace root path for CLI execution
 */
async function handleRefineSubAgentFlow(
  payload: RefineWorkflowPayload,
  webview: vscode.Webview,
  requestId: string,
  extensionPath: string,
  workspaceRoot?: string
): Promise<void> {
  const {
    workflowId,
    userMessage,
    currentWorkflow,
    conversationHistory,
    useSkills = true,
    timeoutMs,
    subAgentFlowId,
    model = 'sonnet',
    allowedTools,
    provider = 'claude-code',
    copilotModel = 'gpt-4o',
    codexModel = '',
    codexReasoningEffort = 'low',
    useCodex = false,
  } = payload;
  const startTime = Date.now();

  // Use provided timeout or default
  const effectiveTimeoutMs = timeoutMs ?? DEFAULT_REFINEMENT_TIMEOUT_MS;

  log('INFO', 'SubAgentFlow refinement request received', {
    requestId,
    workflowId,
    subAgentFlowId,
    messageLength: userMessage.length,
    currentIteration: conversationHistory.currentIteration,
    maxIterations: conversationHistory.maxIterations,
    useSkills,
    useCodex,
    timeoutMs: effectiveTimeoutMs,
    model,
    allowedTools,
    provider,
    copilotModel,
    codexModel,
    codexReasoningEffort,
  });

  // Validate subAgentFlowId
  if (!subAgentFlowId) {
    log('ERROR', 'SubAgentFlow ID is required for SubAgentFlow refinement', {
      requestId,
      workflowId,
    });

    sendRefinementFailed(webview, requestId, {
      error: {
        code: 'VALIDATION_ERROR',
        message: 'SubAgentFlow ID is required for SubAgentFlow refinement',
      },
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  // Find the SubAgentFlow
  const subAgentFlow = currentWorkflow.subAgentFlows?.find((saf) => saf.id === subAgentFlowId);

  if (!subAgentFlow) {
    log('ERROR', 'SubAgentFlow not found', {
      requestId,
      workflowId,
      subAgentFlowId,
    });

    sendRefinementFailed(webview, requestId, {
      error: {
        code: 'VALIDATION_ERROR',
        message: `SubAgentFlow with ID "${subAgentFlowId}" not found`,
      },
      executionTimeMs: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  try {
    // Check iteration limit
    if (conversationHistory.currentIteration >= conversationHistory.maxIterations) {
      log('WARN', 'Iteration limit reached for SubAgentFlow', {
        requestId,
        workflowId,
        subAgentFlowId,
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

    // Execute SubAgentFlow refinement
    const result = await refineSubAgentFlow(
      { nodes: subAgentFlow.nodes, connections: subAgentFlow.connections },
      conversationHistory,
      userMessage,
      extensionPath,
      useSkills,
      effectiveTimeoutMs,
      requestId,
      workspaceRoot,
      model,
      allowedTools,
      provider,
      copilotModel,
      codexModel,
      codexReasoningEffort,
      useCodex
    );

    // Check if AI is asking for clarification
    if (result.success && result.clarificationMessage && !result.refinedInnerWorkflow) {
      log('INFO', 'AI requested clarification for SubAgentFlow', {
        requestId,
        workflowId,
        subAgentFlowId,
        messagePreview: result.clarificationMessage.substring(0, 100),
        executionTimeMs: result.executionTimeMs,
      });

      // Create AI clarification message
      const aiMessage: ConversationMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        content: result.clarificationMessage,
        timestamp: new Date().toISOString(),
      };

      // Create user message
      const userMessageObj: ConversationMessage = {
        id: crypto.randomUUID(),
        sender: 'user',
        content: userMessage,
        timestamp: new Date().toISOString(),
      };

      // Update conversation history with session ID for continuity
      const updatedHistory = {
        ...conversationHistory,
        messages: [...conversationHistory.messages, userMessageObj, aiMessage],
        currentIteration: conversationHistory.currentIteration + 1,
        updatedAt: new Date().toISOString(),
        sessionId: result.newSessionId || conversationHistory.sessionId,
      };

      log('INFO', 'Sending clarification request for SubAgentFlow to webview', {
        requestId,
        workflowId,
        subAgentFlowId,
        newIteration: updatedHistory.currentIteration,
      });

      // Send clarification message (reuse existing message type)
      sendRefinementClarification(webview, requestId, {
        aiMessage,
        updatedConversationHistory: updatedHistory,
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString(),
        sessionReconnected: result.sessionReconnected,
      });
      return;
    }

    if (!result.success || !result.refinedInnerWorkflow) {
      // Refinement failed
      log('ERROR', 'SubAgentFlow refinement failed', {
        requestId,
        workflowId,
        subAgentFlowId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        executionTimeMs: result.executionTimeMs,
      });

      sendRefinementFailed(webview, requestId, {
        error: result.error ?? {
          code: 'UNKNOWN_ERROR',
          message: 'Unknown error occurred during SubAgentFlow refinement',
        },
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString(),
      });
      return;
    }

    // Create AI message - use AI's message if available, otherwise use translation key
    const aiMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'ai',
      content: result.aiMessage || 'Sub-Agent Flow has been updated.', // AI message or fallback
      translationKey: result.aiMessage
        ? undefined
        : 'subAgentFlow.refinement.success.defaultMessage',
      timestamp: new Date().toISOString(),
    };

    // Create user message
    const userMessageObj: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content: userMessage,
      timestamp: new Date().toISOString(),
    };

    // Update conversation history with session ID for continuity
    const updatedHistory = {
      ...conversationHistory,
      messages: [...conversationHistory.messages, userMessageObj, aiMessage],
      currentIteration: conversationHistory.currentIteration + 1,
      updatedAt: new Date().toISOString(),
      sessionId: result.newSessionId || conversationHistory.sessionId,
    };

    log('INFO', 'SubAgentFlow refinement successful', {
      requestId,
      workflowId,
      subAgentFlowId,
      executionTimeMs: result.executionTimeMs,
      newIteration: updatedHistory.currentIteration,
      totalMessages: updatedHistory.messages.length,
    });

    // Send SubAgentFlow-specific success response
    sendSubAgentFlowRefinementSuccess(webview, requestId, {
      subAgentFlowId,
      refinedInnerWorkflow: result.refinedInnerWorkflow,
      aiMessage,
      updatedConversationHistory: updatedHistory,
      executionTimeMs: result.executionTimeMs,
      timestamp: new Date().toISOString(),
      sessionReconnected: result.sessionReconnected,
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'Unexpected error in handleRefineSubAgentFlow', {
      requestId,
      workflowId,
      subAgentFlowId,
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
 * Send refinement progress message to Webview (streaming)
 */
function sendRefinementProgress(
  webview: vscode.Webview,
  requestId: string,
  payload: RefinementProgressPayload
): void {
  webview.postMessage({
    type: 'REFINEMENT_PROGRESS',
    requestId,
    payload,
  });
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
 * Send refinement clarification message to Webview
 */
function sendRefinementClarification(
  webview: vscode.Webview,
  requestId: string,
  payload: RefinementClarificationPayload
): void {
  webview.postMessage({
    type: 'REFINEMENT_CLARIFICATION',
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

/**
 * Send SubAgentFlow refinement success message to Webview
 */
function sendSubAgentFlowRefinementSuccess(
  webview: vscode.Webview,
  requestId: string,
  payload: SubAgentFlowRefinementSuccessPayload
): void {
  webview.postMessage({
    type: 'SUBAGENTFLOW_REFINEMENT_SUCCESS',
    requestId,
    payload,
  });
}

/**
 * Handle workflow refinement cancellation request
 *
 * @param payload - Cancellation request from Webview
 * @param webview - Webview to send response messages to
 * @param requestId - Request ID for correlation
 */
export async function handleCancelRefinement(
  payload: CancelRefinementPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const { requestId: targetRequestId } = payload;

  log('INFO', 'Refinement cancellation request received', {
    requestId,
    targetRequestId,
  });

  try {
    // Cancel the active refinement process
    // Try all providers since we don't know which one is active
    const [claudeResult, copilotResult, codexResult] = await Promise.all([
      cancelAiRequest('claude-code', targetRequestId),
      cancelAiRequest('copilot', targetRequestId),
      cancelAiRequest('codex', targetRequestId),
    ]);

    const cancelled = claudeResult.cancelled || copilotResult.cancelled || codexResult.cancelled;
    const executionTimeMs =
      claudeResult.executionTimeMs ??
      copilotResult.executionTimeMs ??
      codexResult.executionTimeMs ??
      0;

    if (cancelled) {
      const cancelledBy = claudeResult.cancelled
        ? 'claude-code'
        : copilotResult.cancelled
          ? 'copilot'
          : 'codex';
      log('INFO', 'Refinement cancelled successfully', {
        requestId,
        targetRequestId,
        executionTimeMs,
        cancelledBy,
      });

      // Send cancellation confirmation
      sendRefinementCancelled(webview, targetRequestId, {
        executionTimeMs,
        timestamp: new Date().toISOString(),
      });
    } else {
      log('WARN', 'Refinement process not found or already completed', {
        requestId,
        targetRequestId,
      });

      // Still send cancellation message (process may have already completed)
      sendRefinementCancelled(webview, targetRequestId, {
        executionTimeMs: 0,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    log('ERROR', 'Unexpected error in handleCancelRefinement', {
      requestId,
      targetRequestId,
      errorMessage: error instanceof Error ? error.message : String(error),
    });

    // Send cancellation message anyway
    sendRefinementCancelled(webview, targetRequestId, {
      executionTimeMs: 0,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Send refinement cancelled message to Webview
 */
function sendRefinementCancelled(
  webview: vscode.Webview,
  requestId: string,
  payload: RefinementCancelledPayload
): void {
  webview.postMessage({
    type: 'REFINEMENT_CANCELLED',
    requestId,
    payload,
  });
}
