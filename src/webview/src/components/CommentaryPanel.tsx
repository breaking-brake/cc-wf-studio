/**
 * Commentary Panel
 *
 * Displays real-time AI commentary during workflow execution.
 */

import { X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useCommentaryStore } from '../stores/commentary-store';

interface CommentaryPanelProps {
  onClose: () => void;
}

export const CommentaryPanel: React.FC<CommentaryPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const { entries, isActive, isProcessing } = useCommentaryStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Dot animation for processing indicator (1→2→3→1)
  const [dotCount, setDotCount] = useState(1);
  useEffect(() => {
    if (!isProcessing) return;
    const interval = setInterval(() => {
      setDotCount((prev) => (prev % 3) + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [isProcessing]);

  // Auto-scroll to bottom when new entries arrive or processing starts
  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll on entries/processing change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [entries.length, isProcessing]);

  // Listen for commentary messages from extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'COMMENTARY_UPDATE') {
        useCommentaryStore.getState().addEntry({
          text: message.payload.text,
          timestamp: message.payload.timestamp,
          eventType: message.payload.eventType,
        });
      } else if (message.type === 'COMMENTARY_PROCESSING') {
        useCommentaryStore.getState().setProcessing(message.payload.isProcessing);
      } else if (message.type === 'COMMENTARY_SESSION_STARTED') {
        useCommentaryStore.getState().setActive(true);
        useCommentaryStore.getState().clearEntries();
      } else if (message.type === 'COMMENTARY_SESSION_ENDED') {
        useCommentaryStore.getState().setActive(false);
      } else if (message.type === 'COMMENTARY_ERROR') {
        useCommentaryStore.getState().addEntry({
          text: `Error: ${message.payload.message}`,
          timestamp: new Date().toISOString(),
          eventType: 'error',
        });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  const getEventTypeColor = (eventType: string): string => {
    switch (eventType) {
      case 'error':
        return 'var(--vscode-errorForeground, #f44747)';
      case 'tool_use':
        return 'var(--vscode-debugIcon-startForeground, #89d185)';
      case 'summary':
        return 'var(--vscode-textLink-foreground, #3794ff)';
      default:
        return 'var(--vscode-foreground)';
    }
  };

  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <div
      style={{
        width: '300px',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderLeft: '1px solid var(--vscode-panel-border)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              textTransform: 'uppercase',
            }}
          >
            Commentary
          </span>
          {isActive && (
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: 'var(--vscode-debugIcon-startForeground, #89d185)',
                animation: 'commentaryPulse 1.5s ease-in-out infinite',
              }}
            />
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--vscode-foreground)',
            padding: '2px',
            display: 'flex',
            alignItems: 'center',
          }}
          title={t('common.close')}
        >
          <X size={14} />
        </button>
      </div>

      {/* Entries */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px',
        }}
      >
        {entries.length === 0 ? (
          <div
            style={{
              color: 'var(--vscode-descriptionForeground)',
              fontSize: '12px',
              textAlign: 'center',
              padding: '20px 12px',
            }}
          >
            {isActive ? t('commentary.waiting') : t('commentary.inactive')}
          </div>
        ) : (
          <>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  marginBottom: '8px',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    marginBottom: '4px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--vscode-descriptionForeground)',
                    }}
                  >
                    {formatTime(entry.timestamp)}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: getEventTypeColor(entry.eventType),
                      textTransform: 'uppercase',
                      fontWeight: 600,
                    }}
                  >
                    {entry.eventType}
                  </span>
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--vscode-foreground)',
                    lineHeight: '1.4',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {entry.text}
                </div>
              </div>
            ))}
            {isProcessing && (
              <div
                style={{
                  marginBottom: '8px',
                  padding: '6px 8px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  fontSize: '12px',
                  color: 'var(--vscode-descriptionForeground)',
                  fontStyle: 'italic',
                }}
              >
                {'.'.repeat(dotCount)}
              </div>
            )}
          </>
        )}
      </div>

      <style>
        {`
          @keyframes commentaryPulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
        `}
      </style>
    </div>
  );
};
