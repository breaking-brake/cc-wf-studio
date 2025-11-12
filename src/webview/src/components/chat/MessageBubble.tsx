/**
 * Message Bubble Component
 *
 * Displays a single message in the refinement chat.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.7 - Added loading state for AI messages
 */

import type { ConversationMessage } from '@shared/types/workflow-definition';
import { useTranslation } from '../../i18n/i18n-context';
import { ProgressBar } from './ProgressBar';

interface MessageBubbleProps {
  message: ConversationMessage;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { t } = useTranslation();
  const isUser = message.sender === 'user';
  const isLoading = message.isLoading ?? false;

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
          backgroundColor: isUser
            ? 'var(--vscode-button-background)'
            : 'var(--vscode-editor-inactiveSelectionBackground)',
          color: isUser ? 'var(--vscode-button-foreground)' : 'var(--vscode-editor-foreground)',
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
        <div style={{ whiteSpace: 'pre-wrap' }}>{message.content}</div>
        {isLoading && <ProgressBar isProcessing={true} label={t('refinement.aiProcessing')} />}
        {!isLoading && (
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
