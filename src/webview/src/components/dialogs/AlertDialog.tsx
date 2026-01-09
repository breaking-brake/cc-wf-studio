/**
 * AlertDialog Component
 *
 * シンプルな警告ダイアログコンポーネント
 * OKボタンのみで、ユーザーに情報を通知する用途
 * Radix UI Dialogを使用
 */

import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';

interface AlertDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  okLabel: string;
  onClose: () => void;
  /** Optional icon to display before title */
  icon?: React.ReactNode;
}

/**
 * 警告ダイアログコンポーネント
 */
export const AlertDialog: React.FC<AlertDialogProps> = ({
  isOpen,
  title,
  message,
  okLabel,
  onClose,
  icon,
}) => {
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
            zIndex: 10001,
          }}
        >
          <Dialog.Content
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '24px',
              minWidth: '400px',
              maxWidth: '500px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              outline: 'none',
            }}
            onEscapeKeyDown={onClose}
          >
            {/* Title with optional icon */}
            <Dialog.Title
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                marginBottom: '16px',
              }}
            >
              {icon}
              {title}
            </Dialog.Title>

            {/* Message */}
            <Dialog.Description
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '24px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
              }}
            >
              {message}
            </Dialog.Description>

            {/* OK Button */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '6px 20px',
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
                {okLabel}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default AlertDialog;
