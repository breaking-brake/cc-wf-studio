import * as Dialog from '@radix-ui/react-dialog';
import type { PlannedSubAgentFile, Workflow } from '@shared/types/messages';
import { FileText, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useState } from 'react';
import { getNodeTypeIcon } from '../../constants/node-type-icons';
import { useTranslation } from '../../i18n/i18n-context';
import type { WorkflowDiffSummary } from '../../utils/workflow-diff';
import { WorkflowOverview } from '../overview/WorkflowOverview';

const PREVIEW_RATIO_STORAGE_KEY = 'cc-wf-studio.overviewMermaidPanelRatio.preview';

interface DiffPreviewDialogProps {
  isOpen: boolean;
  workflow?: Workflow | null;
  diffSummary: WorkflowDiffSummary | null;
  description?: string;
  plannedFiles?: PlannedSubAgentFile[];
  hasRevisionConflict?: boolean;
  onAccept: () => void;
  onReject: () => void;
  onRetry?: () => void;
}

export const DiffPreviewDialog: React.FC<DiffPreviewDialogProps> = ({
  isOpen,
  workflow,
  diffSummary,
  description,
  plannedFiles,
  hasRevisionConflict,
  onAccept,
  onReject,
  onRetry,
}) => {
  const { t } = useTranslation();
  const [showOverview, setShowOverview] = useState(false);

  useEffect(() => {
    if (!isOpen) setShowOverview(false);
  }, [isOpen]);

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

            {/* Revision conflict warning */}
            {hasRevisionConflict && (
              <div
                style={{
                  marginBottom: '12px',
                  padding: '8px 12px',
                  borderLeft: '3px solid var(--vscode-editorWarning-foreground, #cca700)',
                  backgroundColor:
                    'var(--vscode-inputValidation-warningBackground, rgba(204, 167, 0, 0.1))',
                  borderRadius: '0 2px 2px 0',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  color: 'var(--vscode-editorWarning-foreground, #cca700)',
                }}
              >
                {t('dialog.diffPreview.revisionConflict')}
              </div>
            )}

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
                  {diffSummary.addedNodes.map((node) => {
                    const Icon = getNodeTypeIcon(node.type);
                    return (
                      <div
                        key={`add-${node.id}`}
                        style={{
                          paddingLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--vscode-gitDecoration-addedResourceForeground, #73c991)',
                          }}
                        >
                          +
                        </span>
                        {Icon && (
                          <Icon
                            size={13}
                            style={{
                              color: 'var(--vscode-gitDecoration-addedResourceForeground, #73c991)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            color: 'var(--vscode-gitDecoration-addedResourceForeground, #73c991)',
                          }}
                        >
                          {node.name}
                        </span>
                        <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                          ({node.type})
                        </span>
                      </div>
                    );
                  })}
                  {diffSummary.removedNodes.map((node) => {
                    const Icon = getNodeTypeIcon(node.type);
                    return (
                      <div
                        key={`rm-${node.id}`}
                        style={{
                          paddingLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            color: 'var(--vscode-gitDecoration-deletedResourceForeground, #e06c75)',
                          }}
                        >
                          -
                        </span>
                        {Icon && (
                          <Icon
                            size={13}
                            style={{
                              color:
                                'var(--vscode-gitDecoration-deletedResourceForeground, #e06c75)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            color: 'var(--vscode-gitDecoration-deletedResourceForeground, #e06c75)',
                          }}
                        >
                          {node.name}
                        </span>
                        <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                          ({node.type})
                        </span>
                      </div>
                    );
                  })}
                  {diffSummary.modifiedNodes.map((node) => {
                    const Icon = getNodeTypeIcon(node.type);
                    return (
                      <div
                        key={`mod-${node.id}`}
                        style={{
                          paddingLeft: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span
                          style={{
                            color:
                              'var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d)',
                          }}
                        >
                          ~
                        </span>
                        {Icon && (
                          <Icon
                            size={13}
                            style={{
                              color:
                                'var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d)',
                              flexShrink: 0,
                            }}
                          />
                        )}
                        <span
                          style={{
                            color:
                              'var(--vscode-gitDecoration-modifiedResourceForeground, #e2c08d)',
                          }}
                        >
                          {node.name}
                        </span>
                        <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
                          ({node.type})
                        </span>
                      </div>
                    );
                  })}
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

              {/* Files to be created section */}
              {plannedFiles && plannedFiles.length > 0 && (
                <div style={{ marginTop: '12px' }}>
                  <div
                    style={{
                      fontWeight: 500,
                      marginBottom: '4px',
                      color: 'var(--vscode-descriptionForeground)',
                    }}
                  >
                    {t('dialog.diffPreview.filesToCreate')}:
                  </div>
                  {plannedFiles.map((file) => (
                    <div
                      key={file.nodeId}
                      style={{
                        paddingLeft: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      <FileText
                        size={13}
                        style={{
                          color: 'var(--vscode-gitDecoration-addedResourceForeground, #73c991)',
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          color: 'var(--vscode-gitDecoration-addedResourceForeground, #73c991)',
                        }}
                      >
                        {file.filePath.replace(/^.*?(\.claude\/)/, '.$1')}
                      </span>
                      <span
                        style={{
                          color: 'var(--vscode-descriptionForeground)',
                          marginLeft: '4px',
                        }}
                      >
                        ({file.nodeName})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div
              style={{
                display: 'flex',
                gap: '8px',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <button
                type="button"
                onClick={() => setShowOverview(true)}
                disabled={!workflow}
                style={{
                  padding: '6px 16px',
                  backgroundColor: 'var(--vscode-button-secondaryBackground)',
                  color: 'var(--vscode-button-secondaryForeground)',
                  border: 'none',
                  borderRadius: '2px',
                  cursor: workflow ? 'pointer' : 'not-allowed',
                  fontSize: '13px',
                  opacity: workflow ? 1 : 0.5,
                }}
                onMouseEnter={(e) => {
                  if (!workflow) return;
                  e.currentTarget.style.backgroundColor =
                    'var(--vscode-button-secondaryHoverBackground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    'var(--vscode-button-secondaryBackground)';
                }}
              >
                {t('dialog.diffPreview.previewOverview')}
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
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
                {hasRevisionConflict && onRetry ? (
                  <>
                    <button
                      type="button"
                      onClick={onAccept}
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
                      {t('dialog.diffPreview.applyAnyway')}
                    </button>
                    <button
                      type="button"
                      onClick={onRetry}
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
                        e.currentTarget.style.backgroundColor =
                          'var(--vscode-button-hoverBackground)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                      }}
                    >
                      {t('dialog.diffPreview.retryWithLatest')}
                    </button>
                  </>
                ) : (
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
                      e.currentTarget.style.backgroundColor =
                        'var(--vscode-button-hoverBackground)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                    }}
                  >
                    {t('dialog.diffPreview.accept')}
                  </button>
                )}
              </div>
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
      {/* Overview preview overlay (rendered above the diff dialog) */}
      <Dialog.Root
        open={showOverview}
        onOpenChange={(open) => {
          if (!open) setShowOverview(false);
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10002,
            }}
          >
            <Dialog.Content
              onEscapeKeyDown={() => setShowOverview(false)}
              style={{
                position: 'relative',
                width: '92vw',
                height: '88vh',
                maxWidth: '1400px',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'var(--vscode-editor-background)',
                border: '1px solid var(--vscode-panel-border)',
                borderRadius: '4px',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.4)',
                outline: 'none',
                overflow: 'hidden',
              }}
            >
              <Dialog.Title
                style={{
                  position: 'absolute',
                  width: 1,
                  height: 1,
                  padding: 0,
                  margin: -1,
                  overflow: 'hidden',
                  clip: 'rect(0,0,0,0)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                {t('dialog.diffPreview.previewOverview')}
              </Dialog.Title>
              <button
                type="button"
                onClick={() => setShowOverview(false)}
                aria-label={t('dialog.diffPreview.closeOverview')}
                title={t('dialog.diffPreview.closeOverview')}
                style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 4,
                  backgroundColor: 'transparent',
                  color: 'var(--vscode-foreground)',
                  border: 'none',
                  borderRadius: 0,
                  cursor: 'pointer',
                  opacity: 0.85,
                  transition: 'opacity 0.15s ease',
                  zIndex: 2,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.opacity = '0.55';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.opacity = '0.85';
                }}
              >
                <X size={20} />
              </button>
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <WorkflowOverview
                  workflow={workflow ?? null}
                  splitRatioStorageKey={PREVIEW_RATIO_STORAGE_KEY}
                />
              </div>
            </Dialog.Content>
          </Dialog.Overlay>
        </Dialog.Portal>
      </Dialog.Root>
    </Dialog.Root>
  );
};
