import * as Dialog from '@radix-ui/react-dialog';
import type { ChangelogEntry } from '@shared/types/messages';
import { ExternalLink, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import {
  getChangelog,
  markChangelogRead,
  openExternalUrl,
  setWhatsNewBadge,
} from '../../services/vscode-bridge';

interface WhatsNewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  showBadge: boolean;
  onShowBadgeChange: (show: boolean) => void;
}

export function WhatsNewDialog({
  isOpen,
  onClose,
  showBadge,
  onShowBadgeChange,
}: WhatsNewDialogProps) {
  const { t } = useTranslation();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getChangelog()
      .then((result) => {
        setEntries(result.entries);
        setUnreadCount(result.unreadCount);
        markChangelogRead();
      })
      .catch(() => {
        setEntries([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen]);

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
            onOpenAutoFocus={(e) => e.preventDefault()}
            style={{
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              padding: '24px',
              minWidth: '500px',
              maxWidth: '650px',
              maxHeight: '70vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
              outline: 'none',
            }}
          >
            {/* Header */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <Dialog.Title
                style={{
                  fontSize: '16px',
                  fontWeight: 600,
                  color: 'var(--vscode-foreground)',
                  margin: 0,
                }}
              >
                {t('whatsNew.title')}
              </Dialog.Title>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {/* Badge toggle */}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    cursor: 'pointer',
                    fontSize: '11px',
                    color: 'var(--vscode-descriptionForeground)',
                    userSelect: 'none',
                  }}
                >
                  <span>{t('whatsNew.showBadge')}</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={showBadge}
                    onClick={() => {
                      const next = !showBadge;
                      onShowBadgeChange(next);
                      setWhatsNewBadge(next);
                    }}
                    style={{
                      position: 'relative',
                      width: '28px',
                      height: '16px',
                      borderRadius: '8px',
                      border: 'none',
                      cursor: 'pointer',
                      backgroundColor: showBadge
                        ? 'var(--vscode-button-background)'
                        : 'var(--vscode-input-border)',
                      transition: 'background-color 0.2s',
                      padding: 0,
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        top: '2px',
                        left: showBadge ? '14px' : '2px',
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: 'white',
                        transition: 'left 0.2s',
                      }}
                    />
                  </button>
                </label>
                {/* Close button */}
                <Dialog.Close asChild>
                  <button
                    type="button"
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--vscode-foreground)',
                      cursor: 'pointer',
                      padding: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      opacity: 0.7,
                    }}
                  >
                    <X size={16} />
                  </button>
                </Dialog.Close>
              </div>
            </div>

            {/* Content */}
            <div
              style={{
                overflowY: 'auto',
                flex: 1,
                fontSize: '12px',
                color: 'var(--vscode-foreground)',
                lineHeight: '1.6',
              }}
            >
              {loading && (
                <p style={{ color: 'var(--vscode-descriptionForeground)' }}>Loading...</p>
              )}
              {!loading && entries.length === 0 && (
                <p style={{ color: 'var(--vscode-descriptionForeground)' }}>
                  No entries available.
                </p>
              )}
              {!loading &&
                entries.map((entry, entryIndex) => (
                  <div
                    key={entry.version}
                    style={{
                      marginBottom: '20px',
                      borderLeft:
                        entryIndex < unreadCount
                          ? '3px solid var(--vscode-textLink-foreground)'
                          : '3px solid transparent',
                      paddingLeft: '12px',
                    }}
                  >
                    {/* Version header */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '8px',
                        paddingBottom: '6px',
                        borderBottom: '1px solid var(--vscode-panel-border)',
                      }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: 600 }}>v{entry.version}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: 'var(--vscode-descriptionForeground)',
                        }}
                      >
                        ({entry.date})
                      </span>
                      {entry.compareUrl && (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={() => openExternalUrl(entry.compareUrl)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              openExternalUrl(entry.compareUrl);
                            }
                          }}
                          style={{
                            display: 'inline-flex',
                            cursor: 'pointer',
                            color: 'var(--vscode-textLink-foreground)',
                          }}
                          title="View changes on GitHub"
                        >
                          <ExternalLink size={11} />
                        </span>
                      )}
                    </div>

                    {/* Sections */}
                    {entry.sections.map((section) => (
                      <div key={section.title} style={{ marginBottom: '10px' }}>
                        <div
                          style={{
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'var(--vscode-descriptionForeground)',
                            marginBottom: '4px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px',
                          }}
                        >
                          {section.title}
                        </div>
                        <ul style={{ margin: 0, paddingLeft: '16px' }}>
                          {section.items.map((item, idx) => (
                            <li
                              key={`${item.text}-${idx}`}
                              style={{
                                marginBottom: '3px',
                                fontSize: '12px',
                              }}
                            >
                              {item.text}
                              {item.prNumber && item.prUrl && (
                                <>
                                  {' '}
                                  <span
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openExternalUrl(item.prUrl ?? '')}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        openExternalUrl(item.prUrl ?? '');
                                      }
                                    }}
                                    style={{
                                      cursor: 'pointer',
                                      color: 'var(--vscode-textLink-foreground)',
                                      fontSize: '11px',
                                    }}
                                  >
                                    ({item.prNumber})
                                  </span>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                ))}
              {!loading && entries.length > 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    paddingTop: '8px',
                    borderTop: '1px solid var(--vscode-panel-border)',
                  }}
                >
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={() =>
                      openExternalUrl('https://github.com/breaking-brake/cc-wf-studio/releases')
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        openExternalUrl('https://github.com/breaking-brake/cc-wf-studio/releases');
                      }
                    }}
                    style={{
                      cursor: 'pointer',
                      color: 'var(--vscode-textLink-foreground)',
                      fontSize: '11px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {t('whatsNew.viewAllReleases')}
                    <ExternalLink size={11} />
                  </span>
                </div>
              )}
            </div>
          </Dialog.Content>
        </Dialog.Overlay>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
