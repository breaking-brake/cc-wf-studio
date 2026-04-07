/**
 * SampleWorkflowDialog Component
 *
 * Dialog for browsing and loading sample workflows.
 * Uses Radix UI Dialog for accessibility compliance.
 */

import * as Dialog from '@radix-ui/react-dialog';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { SampleWorkflowMeta } from '../../../../shared/types/sample-workflow';
import { useTranslation } from '../../i18n/i18n-context';
import type { WebviewTranslationKeys } from '../../i18n/translation-keys';
import { vscode } from '../../main';

interface SampleWorkflowDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadSample: (sampleId: string) => void;
}

/**
 * SampleWorkflowDialog component
 */
export const SampleWorkflowDialog: React.FC<SampleWorkflowDialogProps> = ({
  isOpen,
  onClose,
  onLoadSample,
}) => {
  const { t } = useTranslation();
  const [samples, setSamples] = useState<SampleWorkflowMeta[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    setIsLoading(true);

    // Listen for sample workflow list response
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.type === 'SAMPLE_WORKFLOW_LIST') {
        setSamples(message.payload?.samples ?? []);
        setIsLoading(false);
      }
    };

    window.addEventListener('message', handler);

    // Request sample list from Extension Host
    vscode.postMessage({ type: 'LIST_SAMPLE_WORKFLOWS' });

    return () => {
      window.removeEventListener('message', handler);
    };
  }, [isOpen]);

  // Reset samples when dialog closes
  useEffect(() => {
    if (!isOpen) {
      setSamples([]);
      setIsLoading(true);
    }
  }, [isOpen]);

  const getNodeCountLabel = (count: number): string => {
    return t('sample.dialog.nodeCount').replace('{{count}}', String(count));
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
              borderRadius: '6px',
              padding: '24px',
              width: '560px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
              outline: 'none',
            }}
            onEscapeKeyDown={onClose}
          >
            {/* Header */}
            <Dialog.Title
              style={{
                fontSize: '16px',
                fontWeight: 600,
                color: 'var(--vscode-foreground)',
                marginBottom: '8px',
              }}
            >
              {t('sample.dialog.title')}
            </Dialog.Title>

            <Dialog.Description
              style={{
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
                marginBottom: '20px',
                lineHeight: '1.5',
              }}
            >
              {t('sample.dialog.description')}
            </Dialog.Description>

            {/* Sample Cards */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
              }}
            >
              {isLoading ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--vscode-descriptionForeground)',
                    fontSize: '13px',
                  }}
                >
                  Loading...
                </div>
              ) : samples.length === 0 ? (
                <div
                  style={{
                    padding: '32px',
                    textAlign: 'center',
                    color: 'var(--vscode-descriptionForeground)',
                    fontSize: '13px',
                  }}
                >
                  No samples available.
                </div>
              ) : (
                samples.map((sample) => {
                  return (
                    <div
                      key={sample.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onLoadSample(sample.id)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          onLoadSample(sample.id);
                        }
                      }}
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--vscode-input-background)',
                        border: '1px solid var(--vscode-panel-border)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        outline: 'none',
                        transition: 'border-color 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          'var(--vscode-focusBorder, var(--vscode-button-background))';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'var(--vscode-panel-border)';
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor =
                          'var(--vscode-focusBorder, var(--vscode-button-background))';
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--vscode-panel-border)';
                      }}
                    >
                      {/* Card top row: name + badges */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          flexWrap: 'wrap',
                        }}
                      >
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--vscode-foreground)',
                          }}
                        >
                          {t(sample.nameKey as keyof WebviewTranslationKeys)}
                        </span>
                        {/* Node count */}
                        <span
                          style={{
                            fontSize: '11px',
                            color: 'var(--vscode-descriptionForeground)',
                            flexShrink: 0,
                          }}
                        >
                          {getNodeCountLabel(sample.nodeCount)}
                        </span>
                      </div>

                      {/* Description */}
                      <p
                        style={{
                          fontSize: '12px',
                          color: 'var(--vscode-descriptionForeground)',
                          lineHeight: '1.5',
                          margin: 0,
                        }}
                      >
                        {t(sample.descriptionKey as keyof WebviewTranslationKeys)}
                      </p>

                      {/* Load button */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onLoadSample(sample.id);
                          }}
                          style={{
                            padding: '4px 14px',
                            backgroundColor: 'var(--vscode-button-background)',
                            color: 'var(--vscode-button-foreground)',
                            border: 'none',
                            borderRadius: '2px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'var(--vscode-button-hoverBackground)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.backgroundColor =
                              'var(--vscode-button-background)';
                          }}
                        >
                          {t('sample.dialog.loadButton')}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default SampleWorkflowDialog;
