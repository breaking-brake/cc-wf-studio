/**
 * AntigravityMcpRefreshDialog
 *
 * Shown after MCP config is written for Antigravity.
 * Prompts the user to manually refresh MCP servers,
 * then click Run to launch Cascade.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { Play, RefreshCw, Settings } from 'lucide-react';

interface AntigravityMcpRefreshDialogProps {
  isOpen: boolean;
  onOpenMcpSettings: () => void;
  onRun: () => void;
  onCancel: () => void;
}

export function AntigravityMcpRefreshDialog({
  isOpen,
  onOpenMcpSettings,
  onRun,
  onCancel,
}: AntigravityMcpRefreshDialogProps) {
  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onCancel()}>
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
              minWidth: '420px',
              maxWidth: '520px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              outline: 'none',
            }}
            onEscapeKeyDown={onCancel}
          >
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
              <RefreshCw size={18} />
              MCP Server Refresh Required
            </Dialog.Title>

            <Dialog.Description
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '20px',
                lineHeight: '1.6',
              }}
            >
              MCP server config has been written. Antigravity needs a manual refresh to detect the
              new server.
            </Dialog.Description>

            {/* Steps */}
            <div
              style={{
                marginBottom: '20px',
                padding: '12px',
                backgroundColor: 'var(--vscode-textBlockQuote-background)',
                borderRadius: '4px',
                fontSize: '12px',
                lineHeight: '1.8',
                color: 'var(--vscode-foreground)',
              }}
            >
              <div style={{ marginBottom: '4px', fontWeight: 600 }}>Steps:</div>
              <div>1. Click "Open MCP Settings" below</div>
              <div>2. Click "Refresh" in the Antigravity MCP panel</div>
              <div>3. Come back and click "Run" to start AI editing</div>
            </div>

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
                onClick={onCancel}
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
                Cancel
              </button>
              <button
                type="button"
                onClick={onOpenMcpSettings}
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
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
                <Settings size={14} />
                Open MCP Settings
              </button>
              <button
                type="button"
                onClick={onRun}
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: 500,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                }}
              >
                <Play size={14} />
                Run
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
