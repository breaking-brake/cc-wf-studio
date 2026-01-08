/**
 * SlackConnectionRequiredDialog Component
 *
 * Slack未接続時にインポート元ワークスペースへの接続を促すダイアログ
 */

import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';
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

  const handleConnectClick = () => {
    onConnectSlack();
    onClose();
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <Dialog.Content
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
          >
            {/* Title with Warning Icon */}
            <Dialog.Title
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
            </Dialog.Title>

            {/* Message */}
            <Dialog.Description
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '16px',
                lineHeight: '1.6',
              }}
            >
              {t('slack.import.connectionRequired.message')}
            </Dialog.Description>

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
                  e.currentTarget.style.backgroundColor =
                    'var(--vscode-button-secondaryBackground)';
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
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SlackConnectionRequiredDialog;
