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
      // Phase 3.7: Remove loading message on error
      updateMessageLoadingState(aiMessageId, false);

      // Handle cancellation - don't show error, just reset loading state
      if (error instanceof WorkflowRefinementError && error.code === 'CANCELLED') {
        // Loading state will be reset in handleRefinementFailed
        handleRefinementFailed();
        return;
      }

      console.error('Refinement failed:', error);
      handleRefinementFailed();
      // TODO: Show error notification
    }
  };

  const handleClose = () => {
    closeChat();
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
      <MessageList />

      {/* Input */}
      <MessageInput onSend={handleSend} />
    </div>
  );
}
