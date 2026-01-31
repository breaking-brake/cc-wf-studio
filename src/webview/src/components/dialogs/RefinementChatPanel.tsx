/**
 * Refinement Chat Panel Component
 *
 * Sidebar panel for AI-assisted workflow refinement chat interface.
 * Supports both main workflow and SubAgentFlow editing modes.
 *
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.1 - Changed from modal dialog to sidebar format
 * Updated: Phase 3.3 - Added resizable width functionality
 * Updated: Phase 3.7 - Added immediate loading message display
 * Updated: SubAgentFlow support - Unified panel for both workflow types
 */

import { PanelRightClose } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ResponsiveFontProvider } from '../../contexts/ResponsiveFontContext';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { useResponsiveFontSizes } from '../../hooks/useResponsiveFontSizes';
import { useTranslation } from '../../i18n/i18n-context';
import {
  clearConversation,
  type RefinementProgressCallback,
  refineSubAgentFlow,
  refineWorkflow,
  type ValidationErrorInfo,
  WorkflowRefinementError,
} from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { useWorkflowStore } from '../../stores/workflow-store';
import type { RefinementChatState } from '../../types/refinement-chat-state';
import { MessageInput } from '../chat/MessageInput';
import { MessageList } from '../chat/MessageList';
import { SettingsDropdown } from '../chat/SettingsDropdown';
import { WarningBanner } from '../chat/WarningBanner';
import { ResizeHandle } from '../common/ResizeHandle';
import { AlertDialog } from './AlertDialog';
import { ConfirmDialog } from './ConfirmDialog';

// Resizable panel configuration
const PANEL_MIN_WIDTH = 280;
const PANEL_MAX_WIDTH = 600;
const PANEL_DEFAULT_WIDTH = 320;
const PANEL_STORAGE_KEY = 'cc-wf-studio.refinementPanelWidth';

/**
 * Props for RefinementChatPanel
 *
 * @param chatState - Refinement chat state (controlled component pattern)
 * @param mode - Target mode: 'workflow' (default) or 'subAgentFlow'
 * @param subAgentFlowId - Required when mode is 'subAgentFlow'
 * @param onClose - Close callback
 */
interface RefinementChatPanelProps {
  chatState: RefinementChatState;
  mode?: 'workflow' | 'subAgentFlow';
  subAgentFlowId?: string;
  onClose: () => void;
}

export function RefinementChatPanel({
  chatState,
  mode = 'workflow',
  subAgentFlowId,
  onClose,
}: RefinementChatPanelProps) {
  const { t } = useTranslation();
  const { width, handleMouseDown } = useResizablePanel({
    minWidth: PANEL_MIN_WIDTH,
    maxWidth: PANEL_MAX_WIDTH,
    defaultWidth: PANEL_DEFAULT_WIDTH,
    storageKey: PANEL_STORAGE_KEY,
  });
  const fontSizes = useResponsiveFontSizes(width);

  // Destructure chatState for easier access
  const {
    conversationHistory,
    isProcessing,
    sessionStatus,
    addUserMessage,
    addLoadingAiMessage,
    updateMessageContent,
    updateMessageLoadingState,
    updateMessageErrorState,
    updateMessageToolInfo,
    removeMessage,
    clearHistory,
    startProcessing,
    finishProcessing,
    handleRefinementSuccess,
    handleRefinementFailed,
    shouldShowWarning,
  } = chatState;

  // Settings from refinement store (shared across all panels)
  const {
    useSkills,
    useCodexNodes,
    timeoutSeconds,
    selectedModel,
    selectedCopilotModel,
    selectedCodexModel,
    selectedCodexReasoningEffort,
    allowedTools,
    selectedProvider,
  } = useRefinementStore();

  const { activeWorkflow, updateWorkflow, subAgentFlows, updateSubAgentFlow, setNodes, setEdges } =
    useWorkflowStore();

  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);
  const [isSessionWarningOpen, setIsSessionWarningOpen] = useState(false);

  // Track previous sessionStatus to detect changes to 'reconnected'
  const prevSessionStatusRef = useRef(sessionStatus);

  // Store validation errors by message ID for retry with error context
  const validationErrorsRef = useRef<Map<string, ValidationErrorInfo[]>>(new Map());

  // Get SubAgentFlow for subAgentFlow mode
  const subAgentFlow =
    mode === 'subAgentFlow' && subAgentFlowId
      ? subAgentFlows.find((sf) => sf.id === subAgentFlowId)
      : undefined;

  // Phase 7 (T034): Accessibility - Close panel on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, isProcessing]);

  // Show warning dialog when sessionStatus changes to 'reconnected'
  useEffect(() => {
    if (sessionStatus === 'reconnected' && prevSessionStatusRef.current !== 'reconnected') {
      setIsSessionWarningOpen(true);
    }
    prevSessionStatusRef.current = sessionStatus;
  }, [sessionStatus]);

  // Handle sending refinement request
  const handleSend = async (message: string) => {
    if (!conversationHistory || !activeWorkflow) {
      return;
    }

    // Phase 3.7: Add user message and loading AI message immediately for instant feedback
    addUserMessage(message);

    const requestId = `refine-${mode === 'subAgentFlow' ? 'subagentflow-' : ''}${Date.now()}-${Math.random()}`;
    const aiMessageId = `ai-${Date.now()}-${Math.random()}`;

    // Add loading AI message bubble immediately
    addLoadingAiMessage(aiMessageId);
    startProcessing(requestId);

    try {
      if (mode === 'subAgentFlow' && subAgentFlowId && subAgentFlow) {
        // SubAgentFlow refinement
        const result = await refineSubAgentFlow(
          activeWorkflow.id,
          subAgentFlowId,
          message,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          selectedModel,
          allowedTools,
          selectedProvider,
          selectedCopilotModel,
          selectedCodexModel,
          selectedCodexReasoningEffort,
          useCodexNodes
        );

        if (result.type === 'success') {
          const { refinedInnerWorkflow, aiMessage, updatedConversationHistory } = result.payload;

          // Update SubAgentFlow in store
          updateSubAgentFlow(subAgentFlowId, {
            nodes: refinedInnerWorkflow.nodes,
            connections: refinedInnerWorkflow.connections,
            conversationHistory: updatedConversationHistory,
          });

          // Update canvas nodes/edges
          const newNodes = refinedInnerWorkflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: { x: node.position.x, y: node.position.y },
            data: node.data,
          }));
          const newEdges = refinedInnerWorkflow.connections.map((conn) => ({
            id: conn.id,
            source: conn.from,
            target: conn.to,
            sourceHandle: conn.fromPort,
            targetHandle: conn.toPort,
          }));

          setNodes(newNodes);
          setEdges(newEdges);

          // Update loading message
          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        } else if (result.type === 'clarification') {
          const { aiMessage, updatedConversationHistory } = result.payload;

          // Update SubAgentFlow conversation history only
          updateSubAgentFlow(subAgentFlowId, {
            conversationHistory: updatedConversationHistory,
          });

          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        }
      } else {
        // Main workflow refinement with streaming progress
        let hasReceivedProgress = false;
        let latestExplanatoryText = '';

        const onProgress: RefinementProgressCallback = (payload) => {
          hasReceivedProgress = true;

          // Tool Loading Animation: Use contentType from Extension to detect tool execution
          if (payload.contentType === 'tool_use') {
            // Tool execution in progress
            updateMessageToolInfo(aiMessageId, payload.chunk);
          } else if (payload.contentType === 'text') {
            // Text content arrived = tool execution completed
            updateMessageToolInfo(aiMessageId, null);
          }

          // Update message content with explanatory text only (tool info shown separately by ToolExecutionIndicator)
          // Use accumulatedText as fallback if explanatoryText is undefined
          updateMessageContent(aiMessageId, payload.explanatoryText ?? payload.accumulatedText);
          // Track explanatory text separately (for preserving in chat history)
          // Note: explanatoryText can be empty string if AI only uses tools
          if (payload.explanatoryText !== undefined) {
            latestExplanatoryText = payload.explanatoryText;
          }
        };

        const result = await refineWorkflow(
          activeWorkflow.id,
          message,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          onProgress,
          selectedModel,
          allowedTools,
          undefined, // previousValidationErrors
          selectedProvider,
          selectedCopilotModel,
          selectedCodexModel,
          selectedCodexReasoningEffort,
          useCodexNodes
        );

        if (result.type === 'success') {
          updateWorkflow(result.payload.refinedWorkflow);

          if (hasReceivedProgress && latestExplanatoryText) {
            // Streaming occurred with explanatory text
            // Replace display text with explanatory text only (remove tool info)
            updateMessageContent(aiMessageId, latestExplanatoryText);
            updateMessageLoadingState(aiMessageId, false);

            // Only add completion message as new bubble if it differs from explanatory text
            // (Codex may return the same message for both, causing duplicates)
            if (result.payload.aiMessage.content !== latestExplanatoryText) {
              const completionMessageId = `ai-completion-${Date.now()}-${Math.random()}`;
              addLoadingAiMessage(completionMessageId);
              updateMessageContent(completionMessageId, result.payload.aiMessage.content);
              updateMessageLoadingState(completionMessageId, false);
            }

            // Preserve frontend messages (don't overwrite with server history)
            // Pass sessionId and sessionReconnected for session status tracking
            finishProcessing(
              result.payload.updatedConversationHistory?.sessionId,
              result.payload.sessionReconnected
            );
          } else {
            // No streaming or no explanatory text: just show completion message
            updateMessageContent(aiMessageId, result.payload.aiMessage.content);
            updateMessageLoadingState(aiMessageId, false);

            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        } else if (result.type === 'clarification') {
          // Always use the complete clarification message from result.payload
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);

          if (hasReceivedProgress) {
            // Streaming occurred, use finishProcessing to preserve frontend messages
            // Pass sessionId and sessionReconnected for session status tracking
            finishProcessing(
              result.payload.updatedConversationHistory?.sessionId,
              result.payload.sessionReconnected
            );
          } else {
            // No streaming, update conversation history normally
            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        }
      }
    } catch (error) {
      handleRefinementError(error, aiMessageId);
    }
  };

  // Handle retry for failed refinements
  const handleRetry = async (messageId: string) => {
    if (!conversationHistory || !activeWorkflow) {
      return;
    }

    // Find the user message that triggered this AI response
    const messages = conversationHistory.messages;
    const errorMessageIndex = messages.findIndex((msg) => msg.id === messageId);

    if (errorMessageIndex <= 0) {
      return;
    }

    const userMessage = messages[errorMessageIndex - 1];
    if (userMessage.sender !== 'user') {
      return;
    }

    // Get and clear validation errors for retry context
    const previousValidationErrors = validationErrorsRef.current.get(messageId);
    if (previousValidationErrors) {
      validationErrorsRef.current.delete(messageId);
      console.log('[RefinementChatPanel] Using validation errors for retry:', {
        messageId,
        errorCount: previousValidationErrors.length,
      });
    }

    // Reuse existing AI message for retry
    const aiMessageId = messageId;
    updateMessageErrorState(aiMessageId, false);
    updateMessageLoadingState(aiMessageId, true);

    const requestId = `refine-${mode === 'subAgentFlow' ? 'subagentflow-' : ''}${Date.now()}-${Math.random()}`;
    startProcessing(requestId);

    try {
      if (mode === 'subAgentFlow' && subAgentFlowId && subAgentFlow) {
        // SubAgentFlow retry
        const result = await refineSubAgentFlow(
          activeWorkflow.id,
          subAgentFlowId,
          userMessage.content,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          selectedModel,
          allowedTools,
          selectedProvider,
          selectedCopilotModel,
          selectedCodexModel,
          selectedCodexReasoningEffort,
          useCodexNodes
        );

        if (result.type === 'success') {
          const { refinedInnerWorkflow, aiMessage, updatedConversationHistory } = result.payload;

          updateSubAgentFlow(subAgentFlowId, {
            nodes: refinedInnerWorkflow.nodes,
            connections: refinedInnerWorkflow.connections,
            conversationHistory: updatedConversationHistory,
          });

          const newNodes = refinedInnerWorkflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: { x: node.position.x, y: node.position.y },
            data: node.data,
          }));
          const newEdges = refinedInnerWorkflow.connections.map((conn) => ({
            id: conn.id,
            source: conn.from,
            target: conn.to,
            sourceHandle: conn.fromPort,
            targetHandle: conn.toPort,
          }));

          setNodes(newNodes);
          setEdges(newEdges);

          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        } else if (result.type === 'clarification') {
          const { aiMessage, updatedConversationHistory } = result.payload;

          updateSubAgentFlow(subAgentFlowId, {
            conversationHistory: updatedConversationHistory,
          });

          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        }
      } else {
        // Main workflow retry with streaming progress
        let hasReceivedProgress = false;
        let latestExplanatoryText = '';

        const onProgress: RefinementProgressCallback = (payload) => {
          hasReceivedProgress = true;

          // Tool Loading Animation: Use contentType from Extension to detect tool execution
          if (payload.contentType === 'tool_use') {
            // Tool execution in progress
            updateMessageToolInfo(aiMessageId, payload.chunk);
          } else if (payload.contentType === 'text') {
            // Text content arrived = tool execution completed
            updateMessageToolInfo(aiMessageId, null);
          }

          // Update message content with explanatory text only (tool info shown separately by ToolExecutionIndicator)
          // Use accumulatedText as fallback if explanatoryText is undefined
          updateMessageContent(aiMessageId, payload.explanatoryText ?? payload.accumulatedText);
          // Track explanatory text separately (for preserving in chat history)
          // Note: explanatoryText can be empty string if AI only uses tools
          if (payload.explanatoryText !== undefined) {
            latestExplanatoryText = payload.explanatoryText;
          }
        };

        const result = await refineWorkflow(
          activeWorkflow.id,
          userMessage.content,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          onProgress,
          selectedModel,
          allowedTools,
          previousValidationErrors,
          selectedProvider,
          selectedCopilotModel,
          selectedCodexModel,
          selectedCodexReasoningEffort,
          useCodexNodes
        );

        if (result.type === 'success') {
          updateWorkflow(result.payload.refinedWorkflow);

          if (hasReceivedProgress && latestExplanatoryText) {
            // Streaming occurred with explanatory text
            // Replace display text with explanatory text only (remove tool info)
            updateMessageContent(aiMessageId, latestExplanatoryText);
            updateMessageLoadingState(aiMessageId, false);

            // Only add completion message as new bubble if it differs from explanatory text
            // (Codex may return the same message for both, causing duplicates)
            if (result.payload.aiMessage.content !== latestExplanatoryText) {
              const completionMessageId = `ai-completion-${Date.now()}-${Math.random()}`;
              addLoadingAiMessage(completionMessageId);
              updateMessageContent(completionMessageId, result.payload.aiMessage.content);
              updateMessageLoadingState(completionMessageId, false);
            }

            // Preserve frontend messages (don't overwrite with server history)
            // Pass sessionId for session continuation support
            finishProcessing(
              result.payload.updatedConversationHistory?.sessionId,
              result.payload.sessionReconnected
            );
          } else {
            // No streaming or no explanatory text: just show completion message
            updateMessageContent(aiMessageId, result.payload.aiMessage.content);
            updateMessageLoadingState(aiMessageId, false);

            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        } else if (result.type === 'clarification') {
          // Always use the complete clarification message from result.payload
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);

          if (hasReceivedProgress) {
            // Streaming occurred, use finishProcessing to preserve frontend messages
            // Pass sessionId and sessionReconnected for session status tracking
            finishProcessing(
              result.payload.updatedConversationHistory?.sessionId,
              result.payload.sessionReconnected
            );
          } else {
            // No streaming, update conversation history normally
            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        }
      }
    } catch (error) {
      handleRefinementError(error, aiMessageId);
    }
  };

  // Common error handling for refinement requests
  const handleRefinementError = (error: unknown, aiMessageId: string) => {
    // Handle cancellation
    if (error instanceof WorkflowRefinementError && error.code === 'CANCELLED') {
      removeMessage(aiMessageId);
      handleRefinementFailed();
      return;
    }

    // Set error state on AI message
    if (error instanceof WorkflowRefinementError) {
      updateMessageErrorState(
        aiMessageId,
        true,
        error.code as
          | 'COMMAND_NOT_FOUND'
          | 'TIMEOUT'
          | 'PARSE_ERROR'
          | 'VALIDATION_ERROR'
          | 'PROHIBITED_NODE_TYPE'
          | 'UNKNOWN_ERROR'
      );

      // Store validation errors for retry with error context
      if (error.code === 'VALIDATION_ERROR' && error.validationErrors) {
        validationErrorsRef.current.set(aiMessageId, error.validationErrors);
        console.log('[RefinementChatPanel] Stored validation errors for retry:', {
          messageId: aiMessageId,
          errorCount: error.validationErrors.length,
        });
      }
    } else {
      updateMessageErrorState(aiMessageId, true, 'UNKNOWN_ERROR');
    }

    console.error('Refinement failed:', error);
    handleRefinementFailed();
  };

  const handleClearHistoryClick = () => {
    setIsConfirmClearOpen(true);
  };

  const handleConfirmClear = async () => {
    if (!activeWorkflow) {
      return;
    }

    try {
      if (mode === 'subAgentFlow' && subAgentFlowId && conversationHistory) {
        // Clear SubAgentFlow conversation history locally
        clearHistory();
        updateSubAgentFlow(subAgentFlowId, {
          conversationHistory: {
            ...conversationHistory,
            messages: [],
            currentIteration: 0,
            updatedAt: new Date().toISOString(),
          },
        });
      } else {
        // Clear main workflow conversation via Extension Host
        const requestId = `clear-${Date.now()}-${Math.random()}`;
        await clearConversation(activeWorkflow.id, requestId);
        clearHistory();
      }

      setIsConfirmClearOpen(false);
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      setIsConfirmClearOpen(false);
    }
  };

  const handleCancelClear = () => {
    setIsConfirmClearOpen(false);
  };

  // Determine panel title based on mode
  const panelTitle =
    mode === 'subAgentFlow' ? t('subAgentFlow.aiEdit.title') : t('refinement.title');

  return (
    <div
      className="refinement-chat-panel"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderLeft: '1px solid var(--vscode-panel-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Resize Handle - draggable left edge */}
      <ResizeHandle onMouseDown={handleMouseDown} />

      <ResponsiveFontProvider width={width}>
        {/* Header - Single row layout (simplified after Settings dropdown consolidation) */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2
              id="refinement-title"
              style={{
                margin: 0,
                fontSize: `${fontSizes.title}px`,
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {panelTitle}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SettingsDropdown
              onClearHistoryClick={handleClearHistoryClick}
              hasMessages={conversationHistory ? conversationHistory.messages.length > 0 : false}
            />

            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              style={{
                width: '20px',
                height: '20px',
                padding: '2px',
                backgroundColor: 'transparent',
                color: 'var(--vscode-foreground)',
                border: 'none',
                borderRadius: '4px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                opacity: isProcessing ? 0.5 : 0.7,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              onMouseEnter={(e) => {
                if (!isProcessing) {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-toolbar-hoverBackground)';
                  e.currentTarget.style.opacity = '1';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.opacity = isProcessing ? '0.5' : '0.7';
              }}
              aria-label="Close"
            >
              <PanelRightClose size={14} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Warning Banner - Show when 20+ iterations */}
        {shouldShowWarning() && <WarningBanner />}

        {/* Message List (controlled mode - pass conversation history from chatState) */}
        <MessageList onRetry={handleRetry} conversationHistory={conversationHistory} />

        {/* Input (controlled mode - pass input state from chatState) */}
        <MessageInput
          onSend={handleSend}
          inputState={{
            currentInput: chatState.currentInput,
            setInput: chatState.setInput,
            isProcessing,
            currentRequestId: chatState.currentRequestId,
            canSend: chatState.canSend,
          }}
        />

        {/* Clear Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isConfirmClearOpen}
          title={t('refinement.clearDialog.title')}
          message={t('refinement.clearDialog.message')}
          confirmLabel={t('refinement.clearDialog.confirm')}
          cancelLabel={t('refinement.clearDialog.cancel')}
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />

        {/* Session Reconnection Warning Dialog */}
        <AlertDialog
          isOpen={isSessionWarningOpen}
          title={t('refinement.session.warningDialog.title')}
          message={t('refinement.session.warningDialog.message')}
          okLabel={t('refinement.session.warningDialog.ok')}
          onClose={() => setIsSessionWarningOpen(false)}
          icon={<span style={{ color: '#f59e0b', fontSize: '18px' }}>&#9888;</span>}
        />
      </ResponsiveFontProvider>
    </div>
  );
}
