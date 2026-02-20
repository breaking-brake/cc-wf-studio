import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import type { WorkflowDiffSummary } from '../../utils/workflow-diff';

interface DiffPreviewDialogProps {
  isOpen: boolean;
  diffSummary: WorkflowDiffSummary | null;
  description?: string;
  onAccept: () => void;
  onReject: () => void;
}

export const DiffPreviewDialog: React.FC<DiffPreviewDialogProps> = ({
  isOpen,
  diffSummary,
  description,
  onAccept,
  onReject,
}) => {
  const { t } = useTranslation();

  if (!diffSummary) return null;

  return (
    <Dialog.Root open={isOpen} onOpenChange={(open) => !open && onReject()}>
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
              minWidth: '440px',
              maxWidth: '600px',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              outline: 'none',
            }}
            onEscapeKeyDown={onReject}
          >
            <Dialog.Title
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                marginBottom: '12px',
              }}
            >
              {t('dialog.diffPreview.title')}
            </Dialog.Title>

            <Dialog.Description
              style={{
                fontSize: '13px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: description ? '12px' : '16px',
                lineHeight: '1.5',
              }}
            >
              {diffSummary.isNewWorkflow
                ? t('dialog.diffPreview.newWorkflow')
                : t('dialog.diffPreview.description')}
            </Dialog.Description>

            {/* Agent description */}
            {description && (
              <div
                style={{
                  marginBottom: '16px',
                  padding: '8px 12px',
                  borderLeft: '3px solid var(--vscode-textLink-foreground, #3794ff)',
                  backgroundColor:
                    'var(--vscode-textBlockQuote-background, rgba(127, 127, 127, 0.1))',
                  borderRadius: '0 2px 2px 0',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--vscode-foreground)',
                }}
              >
                {description}
              </div>
            )}

            {/* Diff details */}
            <div
              style={{
                fontSize: '13px',
                lineHeight: '1.6',
                color: 'var(--vscode-foreground)',
                maxHeight: '300px',
                overflowY: 'auto',
                marginBottom: '20px',
              }}
            >
              {/* No changes */}
              {diffSummary.totalChanges === 0 && (
                <div
                  style={{
                    color: 'var(--vscode-descriptionForeground)',
                    fontStyle: 'italic',
                  }}
                >
                  {t('dialog.diffPreview.noChanges')}
                </div>
              )}

              {/* Name change */}
              {diffSummary.nameChange && (
                <div style={{ marginBottom: '12px' }}>
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    {t('dialog.diffPreview.nameChange')}
                  </span>{' '}
                  <span style={{ textDecoration: 'line-through', opacity: 0.6 }}>
                    {diffSummary.nameChange.from}
                  </span>
                  {' → '}
                  <span style={{ fontWeight: 500 }}>{diffSummary.nameChange.to}</span>
                </div>
              )}

              {/* Nodes section */}
              {(diffSummary.addedNodes.length > 0 ||
                diffSummary.removedNodes.length > 0 ||
                diffSummary.modifiedNodes.length > 0) && (
                <div style={{ marginBottom: '12px' }}>
                  <div
                    style={{
                      fontWeight: 500,
                      marginBottom: '4px',
                      color: 'var(--vscode-descriptionForeground)',
                    }}
                  >
                    {t('dialog.diffPreview.nodes')}:
                  </div>
                  {diffSummary.addedNodes.map((node) => (
                    <div key={`add-${node.id}`} style={{ paddingLeft: '8px' }}>
                      <span
                        style={{
                          color: 'var(--vscode-gitDecoration-addedResourceForeground, #73c991)',
                        }}
                      >
                        + {node.name}
                      </span>
                      <span
                        style={{ color: 'var(--vscode-descriptionForeground)', marginLeft: '4px' }}
                      >
                        ({node.type})
                      </span>
                    </div>
                  ))}
                  {diffSummary.removedNodes.map((node) => (
                    <div key={`rm-${node.id}`} style={{ paddingLeft: '8px' }}>
                      <span
                        style={{
                          color: 'var(--vscode-gitDecoration-deletedResourceForeground, #e06c75)',
                        }}
                      >
                        - {node.name}
                      </span>
                      <span
                        style={{ color: 'var(--vscode-descriptionForeground)', marginLeft: '4px' }}
                      >
                        ({node.type})
                      </span>
                    </div>
                  ))}
                  {diffSummary.modifiedNodes.map((node) => (
                    <div key={`mod-${node.id}`} style={{ paddingLeft: '8px' }}>
                      <span
                        style={{
                          color: 'var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d)',
                        }}
                      >
                        ~ {node.name}
                      </span>
                      <span
                        style={{ color: 'var(--vscode-descriptionForeground)', marginLeft: '4px' }}
                      >
                        ({node.type})
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Connections section */}
              {(diffSummary.addedConnections > 0 || diffSummary.removedConnections > 0) && (
                <div>
                  <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                    {t('dialog.diffPreview.connections')}:
                  </span>{' '}
                  {diffSummary.addedConnections > 0 && (
                    <span
                      style={{
                        color: 'var(--vscode-gitDecoration-addedResourceForeground, #73c991)',
                      }}
                    >
                      +{diffSummary.addedConnections} {t('dialog.diffPreview.connectionsAdded')}
                    </span>
                  )}
                  {diffSummary.addedConnections > 0 && diffSummary.removedConnections > 0 && ', '}
                  {diffSummary.removedConnections > 0 && (
                    <span
                      style={{
                        color: 'var(--vscode-gitDecoration-deletedResourceForeground, #e06c75)',
                      }}
                    >
                      -{diffSummary.removedConnections} {t('dialog.diffPreview.connectionsRemoved')}
                    </span>
                  )}
                </div>
              )}
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
                onClick={onReject}
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
                {t('dialog.diffPreview.reject')}
              </button>
              <button
                type="button"
                onClick={onAccept}
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
                {t('dialog.diffPreview.accept')}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
