/**
 * Message Input Component
 *
 * Text input area with send button and character counter for refinement requests.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.2 - Added progress bar during processing
 * Updated: Phase 3.7 - Removed progress bar (moved to message bubble)
 */

import type React from 'react';
import { useId } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { cancelWorkflowRefinement } from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { TimeoutSelector } from './TimeoutSelector';

const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 1;

interface MessageInputProps {
  onSend: (message: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const { t } = useTranslation();
  const textareaId = useId();
  const { currentInput, setInput, canSend, isProcessing, currentRequestId } = useRefinementStore();

  const handleSend = () => {
    if (canSend()) {
      onSend(currentInput);
    }
  };

  const handleCancel = () => {
    if (isProcessing && currentRequestId) {
      // Send cancellation request to Extension Host
      cancelWorkflowRefinement(currentRequestId);
      // UI will update when REFINEMENT_CANCELLED message is received
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl/Cmd + Enter to send
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  const remainingChars = MAX_MESSAGE_LENGTH - currentInput.length;
  const isTooLong = currentInput.length > MAX_MESSAGE_LENGTH;
  const isTooShort = currentInput.trim().length < MIN_MESSAGE_LENGTH;

  return (
    <div
      style={{
        borderTop: '1px solid var(--vscode-panel-border)',
        padding: '16px',
      }}
    >
      <textarea
        id={textareaId}
        value={currentInput}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('refinement.inputPlaceholder')}
        disabled={isProcessing}
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '8px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: `1px solid var(--vscode-input-border)`,
          borderRadius: '4px',
          fontSize: '13px',
          fontFamily: 'var(--vscode-font-family)',
          resize: 'vertical',
        }}
        aria-label={t('refinement.inputPlaceholder')}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
          }}
        >
          <div
            style={{
              fontSize: '12px',
              color: isTooLong
                ? 'var(--vscode-errorForeground)'
                : 'var(--vscode-descriptionForeground)',
            }}
          >
            {t('refinement.charactersRemaining', { count: remainingChars })}
          </div>

          <TimeoutSelector />
        </div>

        {isProcessing ? (
          <button
            type="button"
            onClick={handleCancel}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            {t('refinement.cancelButton')}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSend}
            disabled={!canSend() || isTooLong || isTooShort}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: canSend() && !isTooLong && !isTooShort ? 'pointer' : 'not-allowed',
              opacity: canSend() && !isTooLong && !isTooShort ? 1 : 0.5,
            }}
          >
            {t('refinement.sendButton')}
          </button>
        )}
      </div>
    </div>
  );
}
