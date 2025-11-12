/**
 * Message List Component
 *
 * Displays the conversation history with auto-scroll to bottom.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.8 - Added retry handler support
 * Updated: Phase 3.12 - Added initial instructional message
 */

import { useEffect, useRef } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { useRefinementStore } from '../../stores/refinement-store';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  onRetry?: (messageId: string) => void;
}

export function MessageList({ onRetry }: MessageListProps) {
  const { t } = useTranslation();
  const { conversationHistory } = useRefinementStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  });

  // Phase 3.12: Show initial instructional message when no messages
  if (!conversationHistory || conversationHistory.messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
        }}
      >
        <div
          style={{
            color: 'var(--vscode-foreground)',
            fontSize: '13px',
            lineHeight: '1.6',
            marginBottom: '16px',
            textAlign: 'center',
          }}
        >
          {t('refinement.initialMessage.description')}
        </div>
        <div
          style={{
            color: 'var(--vscode-descriptionForeground)',
            fontSize: '12px',
            lineHeight: '1.6',
            textAlign: 'center',
          }}
        >
          {t('refinement.initialMessage.note')}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}
      role="log"
      aria-live="polite"
    >
      {conversationHistory.messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          onRetry={onRetry ? () => onRetry(message.id) : undefined}
        />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
