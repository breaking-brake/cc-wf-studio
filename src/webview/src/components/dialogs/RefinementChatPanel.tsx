/**
 * Refinement Chat Panel Component
 *
 * Modal panel for AI-assisted workflow refinement chat interface.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 */

import type React from 'react';
import { useEffect } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { refineWorkflow } from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { useWorkflowStore } from '../../stores/workflow-store';
import { IterationCounter } from '../chat/IterationCounter';
import { MessageInput } from '../chat/MessageInput';
import { MessageList } from '../chat/MessageList';

export function RefinementChatPanel() {
  const { t } = useTranslation();
  const {
    isOpen,
    closeChat,
    conversationHistory,
    loadConversationHistory,
    startProcessing,
    handleRefinementSuccess,
    handleRefinementFailed,
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

    const requestId = `refine-${Date.now()}-${Math.random()}`;
    startProcessing();

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

      // Update refinement store
      handleRefinementSuccess(result.aiMessage, result.updatedConversationHistory);
    } catch (error) {
      console.error('Refinement failed:', error);
      handleRefinementFailed();
      // TODO: Show error notification
    }
  };

  const handleClose = () => {
    closeChat();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="refinement-title"
    >
      <div
        style={{
          width: '80%',
          maxWidth: '800px',
          height: '80%',
          backgroundColor: 'var(--vscode-editor-background)',
          borderRadius: '8px',
          border: '1px solid var(--vscode-panel-border)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2
            id="refinement-title"
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 'bold',
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
    </div>
  );
}
