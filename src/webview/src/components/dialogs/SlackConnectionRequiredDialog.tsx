/**
 * SlackConnectionRequiredDialog Component
 *
 * Slack未接続時にインポート元ワークスペースへの接続を促すダイアログ
 */

import type React from 'react';
import { useEffect, useId, useRef } from 'react';
import { useTranslation } from '../../i18n/i18n-context';

interface SlackConnectionRequiredDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConnectSlack: () => void;
  /** Workspace name for display in dialog */
  workspaceName?: string;
}

/**
 * Slack接続が必要なことを通知するダイアログ
 */
export const SlackConnectionRequiredDialog: React.FC<SlackConnectionRequiredDialogProps> = ({
  isOpen,
  onClose,
  onConnectSlack,
  workspaceName,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // ダイアログが開いたときに自動的にフォーカス
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleConnectClick = () => {
    onConnectSlack();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={onClose}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          padding: '24px',
          minWidth: '450px',
          maxWidth: '550px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          outline: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Title with Warning Icon */}
        <div
          id={titleId}
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--vscode-notificationsWarningIcon-foreground)' }}>⚠️</span>
          {t('slack.import.connectionRequired.title')}
        </div>

        {/* Message */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '16px',
            lineHeight: '1.6',
          }}
        >
          {t('slack.import.connectionRequired.message')}
        </div>

        {/* Workspace Info (if available) */}
        {workspaceName && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--vscode-editor-inactiveSelectionBackground)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              marginBottom: '16px',
            }}
          >
            <div
              style={{
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '4px',
              }}
            >
              {t('slack.import.connectionRequired.workspaceInfo')}
            </div>
            <div
              style={{
                fontSize: '13px',
                color: 'var(--vscode-foreground)',
                fontWeight: 500,
              }}
            >
              {workspaceName}
            </div>
          </div>
        )}

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor =
                'var(--vscode-button-secondaryHoverBackground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryBackground)';
            }}
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={handleConnectClick}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 500,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
            }}
          >
            {t('slack.import.connectionRequired.connectButton')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SlackConnectionRequiredDialog;
