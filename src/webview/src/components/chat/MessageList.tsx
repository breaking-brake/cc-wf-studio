/**
 * Message List Component
 *
 * Displays the conversation history with auto-scroll to bottom.
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 */

import { useEffect, useRef } from 'react';
import { useRefinementStore } from '../../stores/refinement-store';
import { MessageBubble } from './MessageBubble';

export function MessageList() {
  const { conversationHistory } = useRefinementStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  });

  if (!conversationHistory || conversationHistory.messages.length === 0) {
    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--vscode-descriptionForeground)',
          padding: '20px',
          textAlign: 'center',
        }}
      >
        Start by sending a refinement request to improve your workflow.
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
        <MessageBubble key={message.id} message={message} />
      ))}
      <div ref={messagesEndRef} />
    </div>
  );
}
