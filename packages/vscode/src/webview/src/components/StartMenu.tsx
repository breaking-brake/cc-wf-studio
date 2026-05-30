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
  extensionVersion?: string;
  recentWorkflows?: Array<{ id: string; name: string }>;
  onLoadRecent?: (id: string) => void;
  onVersionClick?: () => void;
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
  extensionVersion,
  recentWorkflows,
  onLoadRecent,
  onVersionClick,
}) => {
  const hasRecent = recentWorkflows && recentWorkflows.length > 0;

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
              width: hasRecent ? '480px' : '320px',
              maxWidth: '90vw',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              outline: 'none',
            }}
            // Prevent auto-focus on the first button (New) to avoid unwanted highlight on open.
            // Focus the dialog content itself so Tab key navigation still works.
            onOpenAutoFocus={(e) => {
              e.preventDefault();
              (e.currentTarget as HTMLElement).focus();
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

            <div style={{ display: 'flex', gap: '16px' }}>
              {/* Left: Primary actions */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  flex: hasRecent ? '0 0 auto' : '1',
                  width: hasRecent ? '180px' : undefined,
                }}
              >
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

              {/* Right: Recent workflows */}
              {hasRecent && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid var(--vscode-panel-border)',
                    borderRadius: '4px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      fontSize: '11px',
                      color: 'var(--vscode-descriptionForeground)',
                      padding: '6px 12px 2px',
                      flexShrink: 0,
                    }}
                  >
                    Recent
                  </div>
                  <div
                    style={{
                      maxHeight: '148px',
                      overflowY: 'auto',
                      overflowX: 'hidden',
                    }}
                  >
                    {recentWorkflows.map((wf) => (
                      <button
                        key={wf.id}
                        type="button"
                        onClick={() => onLoadRecent?.(wf.id)}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor =
                            'var(--vscode-list-hoverBackground)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          padding: '8px 12px',
                          border: 'none',
                          backgroundColor: 'transparent',
                          color: 'var(--vscode-foreground)',
                          cursor: 'pointer',
                          fontSize: '13px',
                          textAlign: 'left',
                          transition: 'background-color 0.15s',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {wf.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div
              style={{
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
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
              {extensionVersion && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={onVersionClick}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      onVersionClick?.();
                    }
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0.7';
                  }}
                  style={{
                    fontSize: '11px',
                    color: 'var(--vscode-descriptionForeground)',
                    padding: '4px',
                    cursor: 'pointer',
                    opacity: 0.7,
                    transition: 'opacity 0.15s',
                  }}
                >
                  v{extensionVersion}
                </span>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
