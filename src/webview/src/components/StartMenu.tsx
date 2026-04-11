/**
 * Start Menu Component
 *
 * Displayed on the canvas when no workflow is loaded (only Start/End nodes).
 * Provides quick actions to get started.
 * Uses Radix UI Dialog for consistency with other dialogs.
 */

import * as Dialog from '@radix-ui/react-dialog';
import { FileDown, FolderOpen, Plus } from 'lucide-react';
import type React from 'react';

interface StartMenuProps {
  isOpen: boolean;
  onOpenSample: () => void;
  onStartFromScratch: () => void;
  onLoadWorkflow: () => void;
}

const buttonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '8px',
  width: '100%',
  padding: '10px 16px',
  border: '1px solid var(--vscode-panel-border)',
  borderRadius: '4px',
  backgroundColor: 'var(--vscode-editor-background)',
  color: 'var(--vscode-foreground)',
  cursor: 'pointer',
  fontSize: '13px',
  textAlign: 'left',
  transition: 'background-color 0.15s',
};

export const StartMenu: React.FC<StartMenuProps> = ({
  isOpen,
  onOpenSample,
  onStartFromScratch,
  onLoadWorkflow,
}) => {
  return (
    <Dialog.Root open={isOpen}>
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
              borderRadius: '6px',
              padding: '24px',
              width: '320px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              outline: 'none',
            }}
            onEscapeKeyDown={onStartFromScratch}
          >
            <Dialog.Title
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              CC Workflow Studio
            </Dialog.Title>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                type="button"
                onClick={onStartFromScratch}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-editor-background)';
                }}
                style={buttonStyle}
              >
                <Plus size={16} style={{ flexShrink: 0 }} />
                New
              </button>

              <button
                type="button"
                onClick={onLoadWorkflow}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-editor-background)';
                }}
                style={buttonStyle}
              >
                <FileDown size={16} style={{ flexShrink: 0 }} />
                Load
              </button>
            </div>

            <div style={{ marginTop: '12px', textAlign: 'center' }}>
              <button
                type="button"
                onClick={onOpenSample}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.8';
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--vscode-textLink-foreground)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '4px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  opacity: 0.8,
                }}
              >
                <FolderOpen size={12} />
                Sample Workflow
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
