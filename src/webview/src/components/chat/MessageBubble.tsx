/**
 * Message Bubble Component
 *
 * Displays a single message in the refinement chat.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.7 - Added loading state for AI messages
 * Updated: Phase 3.8 - Added error state display
 */

import type { ConversationMessage } from '@shared/types/workflow-definition';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';
import { getErrorMessageInfo } from '../../utils/error-messages';
import { ProgressBar } from './ProgressBar';

interface MessageBubbleProps {
  message: ConversationMessage;
  onRetry?: () => void;
}

export function MessageBubble({ message, onRetry }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.sender === 'user';
  const isError = message.isError ?? false;
  const errorCode = message.errorCode;

  // Phase 3.9: Don't show loading when error state is active
  const isLoading = (message.isLoading ?? false) && !isError;

  // Get error message info if this is an error message
  const errorMessageInfo = isError && errorCode ? getErrorMessageInfo(errorCode) : null;
  const errorMessage = errorMessageInfo ? t(errorMessageInfo.messageKey) : '';
  const isRetryable = errorMessageInfo?.isRetryable ?? false;

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
      }}
    >
      <div
        style={{
          maxWidth: '70%',
          padding: '8px 12px',
          borderRadius: '8px',
          backgroundColor: isError
            ? 'var(--vscode-inputValidation-errorBackground)'
            : isUser
              ? 'var(--vscode-button-background)'
              : 'var(--vscode-editor-inactiveSelectionBackground)',
          color: isError
            ? 'var(--vscode-inputValidation-errorForeground)'
            : isUser
              ? 'var(--vscode-button-foreground)'
              : 'var(--vscode-editor-foreground)',
          border: isError ? '1px solid var(--vscode-inputValidation-errorBorder)' : 'none',
          wordWrap: 'break-word',
        }}
      >
        <div
          style={{
            fontSize: '11px',
            opacity: 0.7,
            marginBottom: '4px',
          }}
        >
          {isUser ? 'User' : 'AI'}
        </div>

        {/* Error state: show error icon and message */}
        {isError && (
          <>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                marginBottom: '4px',
              }}
            >
              <span style={{ fontSize: '16px' }}>⚠️</span>
              <span style={{ fontWeight: 500 }}>{errorMessage}</span>
            </div>
            {/* Retry button for retryable errors */}
            {isRetryable && onRetry && (
              <button
                type="button"
                onClick={onRetry}
                style={{
                  marginTop: '8px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                }}
              >
                {t('refinement.error.retryButton')}
              </button>
            )}
          </>
        )}

        {/* Normal content */}
        {!isError && message.content && (
          <div style={{ whiteSpace: 'pre-wrap' }}>
            {message.translationKey
              ? t(message.translationKey as keyof WebviewTranslationKeys)
              : message.content}
          </div>
        )}

        {/* Loading state */}
        {isLoading && <ProgressBar isProcessing={true} label={t('refinement.aiProcessing')} />}

        {/* Timestamp (hide when loading or error) */}
        {!isLoading && !isError && (
          <div
            style={{
              fontSize: '10px',
              opacity: 0.5,
              marginTop: '4px',
              textAlign: 'right',
            }}
          >
            {new Date(message.timestamp).toLocaleString()}
          </div>
        )}
      </div>
    </div>
  );
}
