/**
 * Refinement Chat Panel Component
 *
 * Sidebar panel for AI-assisted workflow refinement chat interface.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.1 - Changed from modal dialog to sidebar format
 * Updated: Phase 3.3 - Added resizable width functionality
 * Updated: Phase 3.7 - Added immediate loading message display
 */

import { useEffect } from 'react';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { useTranslation } from '../../i18n/i18n-context';
import { refineWorkflow, WorkflowRefinementError } from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { useWorkflowStore } from '../../stores/workflow-store';
import { IterationCounter } from '../chat/IterationCounter';
import { MessageInput } from '../chat/MessageInput';
import { MessageList } from '../chat/MessageList';
import { ResizeHandle } from '../common/ResizeHandle';

export function RefinementChatPanel() {
  const { t } = useTranslation();
  const { width, handleMouseDown } = useResizablePanel();
  const {
    isOpen,
    closeChat,
    conversationHistory,
    loadConversationHistory,
    addUserMessage,
    startProcessing,
    handleRefinementSuccess,
    handleRefinementFailed,
    addLoadingAiMessage,
    updateMessageLoadingState,
    updateMessageContent,
    updateMessageErrorState,
    removeMessage,
  } = useRefinementStore();
  const { activeWorkflow, updateWorkflow } = useWorkflowStore();

  // Load conversation history when panel opens
  useEffect(() => {
    if (isOpen && activeWorkflow) {
      loadConversationHistory(activeWorkflow.conversationHistory);
    }
  }, [isOpen, activeWorkflow, loadConversationHistory]);

  if (!isOpen || !activeWorkflow) {
    return null;
  }

  const handleSend = async (message: string) => {
    if (!conversationHistory) {
      return;
    }

    // Phase 3.7: Add user message and loading AI message immediately for instant feedback
    addUserMessage(message);

    const requestId = `refine-${Date.now()}-${Math.random()}`;
    const aiMessageId = `ai-${Date.now()}-${Math.random()}`;

    // Add loading AI message bubble immediately
    addLoadingAiMessage(aiMessageId);
    startProcessing(requestId);

    try {
      const result = await refineWorkflow(
        activeWorkflow.id,
        message,
        activeWorkflow,
        conversationHistory,
        requestId
      );

      // Update workflow in store
      updateWorkflow(result.refinedWorkflow);

      // Update loading message with actual AI response content
      updateMessageContent(aiMessageId, result.aiMessage.content);
      updateMessageLoadingState(aiMessageId, false);

      // Update refinement store with AI response
      handleRefinementSuccess(result.aiMessage, result.updatedConversationHistory);
    } catch (error) {
      // Phase 3.11: Handle cancellation - remove loading message and reset state
      if (error instanceof WorkflowRefinementError && error.code === 'CANCELLED') {
        removeMessage(aiMessageId);
        handleRefinementFailed();
        return;
      }

      // Phase 3.9: Set error state on AI message (loading state is cleared automatically)
      if (error instanceof WorkflowRefinementError) {
        updateMessageErrorState(
          aiMessageId,
          true,
          error.code as
            | 'COMMAND_NOT_FOUND'
            | 'TIMEOUT'
            | 'PARSE_ERROR'
            | 'VALIDATION_ERROR'
            | 'UNKNOWN_ERROR'
        );
      } else {
        updateMessageErrorState(aiMessageId, true, 'UNKNOWN_ERROR');
      }

      console.error('Refinement failed:', error);
      handleRefinementFailed();
    }
  };

  const handleClose = () => {
    closeChat();
  };

  // Phase 3.8: Retry handler for failed refinements
  const handleRetry = async (messageId: string) => {
    if (!conversationHistory) {
      return;
    }

    // Find the user message that triggered this AI response
    const messages = conversationHistory.messages;
    const errorMessageIndex = messages.findIndex((msg) => msg.id === messageId);

    if (errorMessageIndex <= 0) {
      // No user message found before this AI message
      return;
    }

    // Get the user message immediately before the error message
    const userMessage = messages[errorMessageIndex - 1];

    if (userMessage.sender !== 'user') {
      // Unexpected state - should always have a user message before AI message
      return;
    }

    // Phase 3.9: Reuse existing AI message for retry (don't create new message)
    const aiMessageId = messageId;

    // Reset error state and set loading state
    updateMessageErrorState(aiMessageId, false);
    updateMessageLoadingState(aiMessageId, true);

    const requestId = `refine-${Date.now()}-${Math.random()}`;
    startProcessing(requestId);

    try {
      const result = await refineWorkflow(
        activeWorkflow.id,
        userMessage.content,
        activeWorkflow,
        conversationHistory,
        requestId
      );

      // Update workflow in store
      updateWorkflow(result.refinedWorkflow);

      // Update existing message with actual AI response content
      updateMessageContent(aiMessageId, result.aiMessage.content);
      updateMessageLoadingState(aiMessageId, false);

      // Update refinement store with AI response
      handleRefinementSuccess(result.aiMessage, result.updatedConversationHistory);
    } catch (error) {
      // Phase 3.11: Handle cancellation - remove loading message and reset state
      if (error instanceof WorkflowRefinementError && error.code === 'CANCELLED') {
        removeMessage(aiMessageId);
        handleRefinementFailed();
        return;
      }

      // Phase 3.9: Set error state on AI message (loading state is cleared automatically)
      if (error instanceof WorkflowRefinementError) {
        updateMessageErrorState(
          aiMessageId,
          true,
          error.code as
            | 'COMMAND_NOT_FOUND'
            | 'TIMEOUT'
            | 'PARSE_ERROR'
            | 'VALIDATION_ERROR'
            | 'UNKNOWN_ERROR'
        );
      } else {
        updateMessageErrorState(aiMessageId, true, 'UNKNOWN_ERROR');
      }

      console.error('Refinement retry failed:', error);
      handleRefinementFailed();
    }
  };

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
      <ResizeHandle onMouseDown={handleMouseDown} />
      {/* Header */}
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <h2
          id="refinement-title"
          style={{
            margin: 0,
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          {t('refinement.title')}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <IterationCounter />

          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: 'var(--vscode-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Message List */}
      <MessageList onRetry={handleRetry} />

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
}
