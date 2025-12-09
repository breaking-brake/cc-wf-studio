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

import { useCallback, useEffect, useState } from 'react';
import { ResponsiveFontProvider } from '../../contexts/ResponsiveFontContext';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { getPanelSizeMode, useResponsiveFontSizes } from '../../hooks/useResponsiveFontSizes';
import { useTranslation } from '../../i18n/i18n-context';
import {
  clearConversation,
  refineSubAgentFlow,
  refineWorkflow,
  WorkflowRefinementError,
} from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { useWorkflowStore } from '../../stores/workflow-store';
import { IterationCounter } from '../chat/IterationCounter';
import { MessageInput } from '../chat/MessageInput';
import { MessageList } from '../chat/MessageList';
import { WarningBanner } from '../chat/WarningBanner';
import { Checkbox } from '../common/Checkbox';
import { ResizeHandle } from '../common/ResizeHandle';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Props for RefinementChatPanel
 *
 * @param mode - Target mode: 'workflow' (default) or 'subAgentFlow'
 * @param subAgentFlowId - Required when mode is 'subAgentFlow'
 * @param onClose - Close callback for SubAgentFlow mode (workflow mode uses internal closeChat)
 */
interface RefinementChatPanelProps {
  mode?: 'workflow' | 'subAgentFlow';
  subAgentFlowId?: string;
  onClose?: () => void;
}

export function RefinementChatPanel({
  mode = 'workflow',
  subAgentFlowId,
  onClose,
}: RefinementChatPanelProps) {
  const { t } = useTranslation();
  const { width, handleMouseDown } = useResizablePanel();
  const fontSizes = useResponsiveFontSizes(width);
  const isCompact = getPanelSizeMode(width) === 'compact';

  const {
    isOpen,
    closeChat,
    conversationHistory,
    loadConversationHistory,
    setTargetContext,
    addUserMessage,
    startProcessing,
    handleRefinementSuccess,
    handleRefinementFailed,
    addLoadingAiMessage,
    updateMessageLoadingState,
    updateMessageContent,
    updateMessageErrorState,
    removeMessage,
    clearHistory,
    shouldShowWarning,
    isProcessing,
    useSkills,
    toggleUseSkills,
    timeoutSeconds,
  } = useRefinementStore();

  const { activeWorkflow, updateWorkflow, subAgentFlows, updateSubAgentFlow, setNodes, setEdges } =
    useWorkflowStore();

  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Get SubAgentFlow for subAgentFlow mode
  const subAgentFlow =
    mode === 'subAgentFlow' && subAgentFlowId
      ? subAgentFlows.find((sf) => sf.id === subAgentFlowId)
      : undefined;

  // Determine if panel should be visible
  const isVisible = mode === 'subAgentFlow' ? !!subAgentFlow : isOpen && !!activeWorkflow;

  // Phase 7 (T034): Define handleClose early for use in useEffect
  const handleClose = useCallback(() => {
    if (mode === 'subAgentFlow' && onClose) {
      onClose();
    } else {
      closeChat();
    }
  }, [mode, onClose, closeChat]);

  // Load conversation history and set target context when panel opens
  useEffect(() => {
    if (!isVisible) return;

    if (mode === 'subAgentFlow' && subAgentFlow && subAgentFlowId) {
      setTargetContext('subAgentFlow', subAgentFlowId);
      loadConversationHistory(subAgentFlow.conversationHistory);
    } else if (mode === 'workflow' && activeWorkflow) {
      setTargetContext('workflow');
      loadConversationHistory(activeWorkflow.conversationHistory);
    }

    // Reset context when unmounting (only for subAgentFlow mode)
    return () => {
      if (mode === 'subAgentFlow') {
        setTargetContext('workflow');
      }
    };
  }, [
    isVisible,
    mode,
    activeWorkflow,
    subAgentFlow,
    subAgentFlowId,
    setTargetContext,
    loadConversationHistory,
  ]);

  // Phase 7 (T034): Accessibility - Close panel on Escape key
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose, isProcessing]);

  // Early return if not visible
  if (!isVisible) {
    return null;
  }

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
          timeoutSeconds * 1000
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
        // Main workflow refinement
        const result = await refineWorkflow(
          activeWorkflow.id,
          message,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000
        );

        if (result.type === 'success') {
          updateWorkflow(result.payload.refinedWorkflow);
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(
            result.payload.aiMessage,
            result.payload.updatedConversationHistory
          );
        } else if (result.type === 'clarification') {
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(
            result.payload.aiMessage,
            result.payload.updatedConversationHistory
          );
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
          timeoutSeconds * 1000
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
        // Main workflow retry
        const result = await refineWorkflow(
          activeWorkflow.id,
          userMessage.content,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000
        );

        if (result.type === 'success') {
          updateWorkflow(result.payload.refinedWorkflow);
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(
            result.payload.aiMessage,
            result.payload.updatedConversationHistory
          );
        } else if (result.type === 'clarification') {
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(
            result.payload.aiMessage,
            result.payload.updatedConversationHistory
          );
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
      <ResponsiveFontProvider width={width}>
        <ResizeHandle onMouseDown={handleMouseDown} />
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            flexDirection: isCompact ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: isCompact ? 'stretch' : 'center',
            gap: isCompact ? '8px' : '0',
            flexShrink: 0,
          }}
        >
          {/* Row 1: Title + Close button (always visible) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
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

            {/* Close button - in compact mode, shown in row 1 */}
            {isCompact && (
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  color: 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: isProcessing ? 0.5 : 1,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>

          {/* Row 2 (compact) / Same row (normal): Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isCompact ? '8px' : '12px' }}>
            <IterationCounter />

            <Checkbox
              checked={useSkills}
              onChange={toggleUseSkills}
              disabled={isProcessing}
              label={t('refinement.chat.useSkillsCheckbox')}
              ariaLabel={t('refinement.chat.useSkillsCheckbox')}
            />

            {/* Clear button - in normal mode, shown inline */}
            {!isCompact && (
              <button
                type="button"
                onClick={handleClearHistoryClick}
                disabled={
                  !conversationHistory || conversationHistory.messages.length === 0 || isProcessing
                }
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  color: 'var(--vscode-foreground)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '4px',
                  cursor:
                    conversationHistory && conversationHistory.messages.length > 0 && !isProcessing
                      ? 'pointer'
                      : 'not-allowed',
                  fontSize: `${fontSizes.small}px`,
                  opacity:
                    conversationHistory && conversationHistory.messages.length > 0 && !isProcessing
                      ? 1
                      : 0.5,
                }}
                title={t('refinement.chat.clearButton.tooltip')}
                aria-label={t('refinement.chat.clearButton')}
              >
                {t('refinement.chat.clearButton')}
              </button>
            )}

            {/* Close button - in normal mode, shown at the end */}
            {!isCompact && (
              <button
                type="button"
                onClick={handleClose}
                disabled={isProcessing}
                style={{
                  padding: '4px 8px',
                  backgroundColor: 'transparent',
                  color: 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: isProcessing ? 'not-allowed' : 'pointer',
                  fontSize: '16px',
                  opacity: isProcessing ? 0.5 : 1,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            )}
          </div>

          {/* Row 3 (compact only): Clear button full width */}
          {isCompact && (
            <button
              type="button"
              onClick={handleClearHistoryClick}
              disabled={
                !conversationHistory || conversationHistory.messages.length === 0 || isProcessing
              }
              style={{
                padding: '4px 8px',
                width: '100%',
                backgroundColor: 'transparent',
                color: 'var(--vscode-foreground)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                cursor:
                  conversationHistory && conversationHistory.messages.length > 0 && !isProcessing
                    ? 'pointer'
                    : 'not-allowed',
                fontSize: `${fontSizes.small}px`,
                opacity:
                  conversationHistory && conversationHistory.messages.length > 0 && !isProcessing
                    ? 1
                    : 0.5,
              }}
              title={t('refinement.chat.clearButton.tooltip')}
              aria-label={t('refinement.chat.clearButton')}
            >
              {t('refinement.chat.clearButton')}
            </button>
          )}
        </div>

        {/* Warning Banner - Show when 20+ iterations */}
        {shouldShowWarning() && <WarningBanner />}

        {/* Message List */}
        <MessageList onRetry={handleRetry} />

        {/* Input */}
        <MessageInput onSend={handleSend} />

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
      </ResponsiveFontProvider>
    </div>
  );
}
