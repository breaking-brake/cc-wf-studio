/**
 * Codebase Settings Dialog Component
 *
 * Dialog for managing codebase index settings including:
 * - Enable/disable codebase reference (Beta feature)
 * - Build/Rebuild index
 * - Clear index
 * - View index statistics
 *
 * Based on: GitHub Issue #265 Phase 2 UX Implementation
 */

import type React from 'react';
import { useCallback, useEffect, useId, useRef } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import {
  buildIndex,
  cancelIndexBuild,
  clearIndex,
  getIndexStatus,
} from '../../services/codebase-search-service';
import { useRefinementStore } from '../../stores/refinement-store';

interface CodebaseSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CodebaseSettingsDialog: React.FC<CodebaseSettingsDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { t } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  const {
    indexStatus,
    isIndexBuilding,
    indexBuildProgress,
    setIndexStatus,
    setIndexBuilding,
    useCodebaseSearch,
    toggleUseCodebaseSearch,
  } = useRefinementStore();

  // Focus dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

  // Fetch index status when dialog opens
  useEffect(() => {
    if (isOpen) {
      const fetchStatus = async () => {
        try {
          const status = await getIndexStatus();
          setIndexStatus(status);
        } catch (error) {
          console.error('Failed to fetch index status:', error);
        }
      };
      fetchStatus();
    }
  }, [isOpen, setIndexStatus]);

  const handleBuildIndex = useCallback(async () => {
    setIndexBuilding(true, 0);

    try {
      const result = await buildIndex(undefined, (progress) => {
        setIndexBuilding(true, progress.percentage);
      });

      if (result.success) {
        const status = await getIndexStatus();
        setIndexStatus(status);
      }
    } catch (error) {
      console.error('Failed to build index:', error);
    } finally {
      setIndexBuilding(false, 0);
    }
  }, [setIndexBuilding, setIndexStatus]);

  const handleClearIndex = useCallback(async () => {
    try {
      await clearIndex();
      const status = await getIndexStatus();
      setIndexStatus(status);
    } catch (error) {
      console.error('Failed to clear index:', error);
    }
  }, [setIndexStatus]);

  const handleCancelBuild = useCallback(() => {
    cancelIndexBuild();
    setIndexBuilding(false, 0);
  }, [setIndexBuilding]);

  if (!isOpen) {
    return null;
  }

  const isReady = indexStatus?.state === 'ready';
  const documentCount = indexStatus?.documentCount ?? 0;
  const fileCount = indexStatus?.fileCount ?? 0;

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
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
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
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '20px',
          }}
        >
          <h2
            id={titleId}
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
            }}
          >
            {t('codebaseIndex.settings.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: 'var(--vscode-foreground)',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontSize: '16px',
            }}
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>

        {/* Enable/Disable Toggle Section */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--vscode-input-background)',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          <label
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
            {/* Checkbox */}
            <input
              type="checkbox"
              checked={useCodebaseSearch}
              onChange={toggleUseCodebaseSearch}
              style={{
                width: '16px',
                height: '16px',
                margin: 0,
                cursor: 'pointer',
                accentColor: 'var(--vscode-focusBorder)',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('codebaseIndex.enableReference')}
            </span>
            <span
              style={{
                padding: '2px 6px',
                backgroundColor: 'var(--vscode-badge-background)',
                color: 'var(--vscode-badge-foreground)',
                borderRadius: '4px',
                fontSize: '11px',
                fontWeight: 500,
              }}
            >
              Beta
            </span>
          </label>
          <ul
            style={{
              margin: '8px 0 0 0',
              padding: '0 0 0 20px',
              fontSize: '12px',
              color: 'var(--vscode-descriptionForeground)',
              lineHeight: '1.6',
            }}
          >
            <li>{t('codebaseIndex.settings.description1')}</li>
            <li>{t('codebaseIndex.settings.description2')}</li>
          </ul>
        </div>

        {/* Index Status Section */}
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--vscode-input-background)',
            borderRadius: '4px',
            marginBottom: '16px',
          }}
        >
          {/* Status header with badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: isIndexBuilding ? '12px' : isReady && documentCount > 0 ? '12px' : '0',
            }}
          >
            <span
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--vscode-foreground)',
              }}
            >
              {t('codebaseIndex.settings.status')}:
            </span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 500,
                backgroundColor: isIndexBuilding
                  ? 'var(--vscode-charts-yellow)'
                  : isReady && documentCount > 0
                    ? 'var(--vscode-charts-green)'
                    : 'var(--vscode-badge-background)',
                color: isIndexBuilding
                  ? 'var(--vscode-editor-background)'
                  : isReady && documentCount > 0
                    ? 'var(--vscode-editor-background)'
                    : 'var(--vscode-badge-foreground)',
              }}
            >
              {isIndexBuilding
                ? t('codebaseIndex.building')
                : isReady && documentCount > 0
                  ? t('codebaseIndex.ready')
                  : t('codebaseIndex.noIndex')}
            </span>
          </div>

          {/* Progress bar (only when building) */}
          {isIndexBuilding && (
            <div>
              <div
                style={{
                  width: '100%',
                  height: '4px',
                  backgroundColor: 'var(--vscode-input-border)',
                  borderRadius: '2px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${indexBuildProgress}%`,
                    height: '100%',
                    backgroundColor: 'var(--vscode-charts-yellow)',
                    transition: 'width 0.3s',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                }}
              >
                {indexBuildProgress}%
              </div>
            </div>
          )}

          {/* Document/File counts (only when ready) */}
          {isReady && documentCount > 0 && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                fontSize: '12px',
                color: 'var(--vscode-descriptionForeground)',
              }}
            >
              <div>
                {t('codebaseIndex.documents')}: <strong>{documentCount.toLocaleString()}</strong>
              </div>
              <div>
                {t('codebaseIndex.files')}: <strong>{fileCount.toLocaleString()}</strong>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
          }}
        >
          {isIndexBuilding ? (
            <button
              type="button"
              onClick={handleCancelBuild}
              style={{
                flex: 1,
                padding: '8px 16px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
            >
              {t('codebaseIndex.cancel')}
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={handleBuildIndex}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  backgroundColor: 'var(--vscode-button-background)',
                  color: 'var(--vscode-button-foreground)',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-button-hoverBackground)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--vscode-button-background)';
                }}
              >
                {isReady ? t('codebaseIndex.rebuild') : t('codebaseIndex.build')}
              </button>

              {isReady && documentCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearIndex}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'var(--vscode-button-secondaryBackground)',
                    color: 'var(--vscode-button-secondaryForeground)',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
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
                  {t('codebaseIndex.clear')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CodebaseSettingsDialog;
