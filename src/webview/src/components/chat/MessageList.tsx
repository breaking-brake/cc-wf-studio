/**
 * Message List Component
 *
 * Displays the conversation history with auto-scroll to bottom.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.8 - Added retry handler support
 * Updated: Phase 3.12 - Added initial instructional message
 * Updated: Controlled Component - Accept conversationHistory from props
 */

import type { ConversationHistory } from '@shared/types/workflow-definition';
import { useEffect, useRef } from 'react';
import { useResponsiveFonts } from '../../contexts/ResponsiveFontContext';
import { useTranslation } from '../../i18n/i18n-context';
import { useRefinementStore } from '../../stores/refinement-store';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  onRetry?: (messageId: string) => void;
  /** Conversation history (controlled mode). If provided, uses this instead of store. */
  conversationHistory?: ConversationHistory | null;
}

export function MessageList({
  onRetry,
  conversationHistory: propsConversationHistory,
}: MessageListProps) {
  const { t } = useTranslation();
  const { conversationHistory: storeConversationHistory, selectedProvider } = useRefinementStore();

  // Use props if provided (controlled mode), otherwise use store (uncontrolled mode)
  const conversationHistory = propsConversationHistory ?? storeConversationHistory;
  const fontSizes = useResponsiveFonts();
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
            fontSize: `${fontSizes.base}px`,
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
            fontSize: `${fontSizes.button}px`,
            lineHeight: '1.6',
            textAlign: 'center',
          }}
        >
          {t('refinement.initialMessage.note', {
            providerName: selectedProvider === 'copilot' ? 'GitHub Copilot' : 'Claude Code',
          })}
        </div>
        {selectedProvider !== 'copilot' && (
          <div
            style={{
              marginTop: '16px',
              padding: '8px 12px',
              backgroundColor: 'var(--vscode-textBlockQuote-background)',
              border: '1px solid var(--vscode-textBlockQuote-border)',
              borderRadius: '4px',
              fontSize: `${fontSizes.small}px`,
              lineHeight: '1.6',
              color: 'var(--vscode-foreground)',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              textAlign: 'left',
            }}
          >
            {t('refinement.chat.claudeMdTip')}
          </div>
        )}
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
