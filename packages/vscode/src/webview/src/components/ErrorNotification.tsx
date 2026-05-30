/**
 * Claude Code Workflow Studio - Error Notification Component
 *
 * Displays error messages from Extension
 * Based on: /specs/001-cc-wf-studio/contracts/extension-webview-api.md section 1.4
 */

import type { ErrorPayload } from '@shared/types/messages';
import type React from 'react';
import { useEffect, useState } from 'react';

interface ErrorNotificationProps {
  error: ErrorPayload | null;
  onDismiss: () => void;
}

/**
 * ErrorNotification Component
 */
export const ErrorNotification: React.FC<ErrorNotificationProps> = ({ error, onDismiss }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setVisible(true);
    }
  }, [error]);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Wait for fade-out animation
  };

  if (!error || !visible) {
    return null;
  }

  // Type narrowing: at this point, error is definitely ErrorPayload
  const errorData: ErrorPayload = error;
  const code: string = errorData.code;
  const message: string = errorData.message;
  // biome-ignore lint/suspicious/noExplicitAny: Error details can be of any type for display purposes
  const details: any = errorData.details;

  return (
    <div
      style={{
        position: 'fixed',
        top: '16px',
        right: '16px',
        maxWidth: '400px',
        padding: '12px 16px',
        backgroundColor: 'var(--vscode-inputValidation-errorBackground)',
        border: '1px solid var(--vscode-inputValidation-errorBorder)',
        borderRadius: '4px',
        color: 'var(--vscode-inputValidation-errorForeground)',
        zIndex: 1000,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        animation: 'slideIn 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div style={{ fontWeight: 600, fontSize: '13px' }}>❌ Error: {code}</div>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0 4px',
          }}
        >
          ×
        </button>
      </div>

      {/* Message */}
      <div style={{ fontSize: '12px', lineHeight: '1.5' }}>{message}</div>

      {/* Details (if available) */}
      {details && (
        <details style={{ marginTop: '8px', fontSize: '11px' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--vscode-descriptionForeground)' }}>
            Details
          </summary>
          <pre
            style={{
              marginTop: '4px',
              padding: '8px',
              backgroundColor: 'var(--vscode-textCodeBlock-background)',
              borderRadius: '2px',
              overflow: 'auto',
              maxHeight: '150px',
            }}
          >
            {JSON.stringify(details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
};
