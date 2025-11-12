/**
 * Message Input Component
 *
 * Text input area with send button and character counter for refinement requests.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.2 - Added progress bar during processing
 */

import type React from 'react';
import { useEffect, useId, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { cancelWorkflowRefinement } from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';

const MAX_MESSAGE_LENGTH = 5000;
const MIN_MESSAGE_LENGTH = 1;
const MAX_PROCESSING_TIME_SECONDS = 90;

interface MessageInputProps {
  onSend: (message: string) => void;
}

export function MessageInput({ onSend }: MessageInputProps) {
  const { t } = useTranslation();
  const textareaId = useId();
  const { currentInput, setInput, canSend, isProcessing, currentRequestId } = useRefinementStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Progress timer - same as AI Generation
  useEffect(() => {
    if (!isProcessing) {
      setElapsedSeconds(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        if (prev >= MAX_PROCESSING_TIME_SECONDS) {
          return MAX_PROCESSING_TIME_SECONDS;
        }
        return prev + 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing]);

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

  // Calculate progress percentage (same ease-out function as AI Generation)
  const normalizedTime = elapsedSeconds / MAX_PROCESSING_TIME_SECONDS;
  const easedProgress = 1 - (1 - normalizedTime) ** 2;
  const progressPercentage = Math.min(Math.round(easedProgress * 100), 100);

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

      {/* Progress bar - shown during processing */}
      {isProcessing && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            backgroundColor: 'var(--vscode-inputValidation-infoBackground)',
            border: '1px solid var(--vscode-inputValidation-infoBorder)',
            borderRadius: '4px',
          }}
        >
          <div
            style={{
              marginBottom: '8px',
              fontSize: '12px',
              color: 'var(--vscode-foreground)',
              fontWeight: 500,
            }}
          >
            {t('refinement.processing')}
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: '100%',
              height: '6px',
              backgroundColor: 'var(--vscode-editor-background)',
              borderRadius: '3px',
              overflow: 'hidden',
              marginBottom: '6px',
              border: '1px solid var(--vscode-panel-border)',
            }}
          >
            <div
              style={{
                width: `${progressPercentage}%`,
                height: '100%',
                backgroundColor: 'var(--vscode-progressBar-background)',
                transition: 'width 0.5s ease-out',
              }}
            />
          </div>

          {/* Progress text */}
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              display: 'flex',
              justifyContent: 'space-between',
            }}
          >
            <span>{progressPercentage}%</span>
            <span>
              {elapsedSeconds}s / {MAX_PROCESSING_TIME_SECONDS}s
            </span>
          </div>
        </div>
      )}

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
            fontSize: '12px',
            color: isTooLong
              ? 'var(--vscode-errorForeground)'
              : 'var(--vscode-descriptionForeground)',
          }}
        >
          {t('refinement.charactersRemaining', { count: remainingChars })}
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
