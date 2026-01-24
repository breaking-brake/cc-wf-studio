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
import { ExternalLink } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { useResponsiveFonts } from '../../contexts/ResponsiveFontContext';
import { useTranslation } from '../../i18n/i18n-context';
import { openExternalUrl } from '../../services/vscode-bridge';
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
          {selectedProvider === 'copilot' && t('refinement.initialMessage.noteCopilot')}
          {selectedProvider === 'claude-code' && t('refinement.initialMessage.noteClaudeCode')}
          {selectedProvider === 'codex' && t('refinement.initialMessage.noteCodex')}
        </div>
        {selectedProvider === 'copilot' && (
          <button
            type="button"
            onClick={() =>
              openExternalUrl(
                'https://code.visualstudio.com/api/extension-guides/ai/language-model'
              )
            }
            style={{
              marginTop: '8px',
              color: 'var(--vscode-textLink-foreground)',
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              fontSize: `${fontSizes.small}px`,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.textDecoration = 'underline';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.textDecoration = 'none';
            }}
          >
            <ExternalLink size={12} />
            <span>Learn more</span>
          </button>
        )}
        {selectedProvider === 'claude-code' && (
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
