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
import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { buildIndex, clearIndex, getIndexStatus } from '../../services/codebase-search-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { Toggle } from '../common/Toggle';

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
    isIndexBuilding,
    indexBuildProgress,
    setIndexStatus,
    setIndexBuilding,
    useCodebaseSearch,
    toggleUseCodebaseSearch,
  } = useRefinementStore();

  // Progress bar display state for minimum display duration & completion message
  const [showProgress, setShowProgress] = useState(false);
  const [progressPhase, setProgressPhase] = useState<'building' | 'complete'>('building');
  const buildStartTimeRef = useRef<number>(0);
  const MINIMUM_DISPLAY_MS = 1000;
  const COMPLETION_DISPLAY_MS = 1000;

  // Handle progress bar visibility with minimum display duration
  useEffect(() => {
    if (isIndexBuilding) {
      // Start building
      buildStartTimeRef.current = Date.now();
      setShowProgress(true);
      setProgressPhase('building');
    } else if (showProgress && progressPhase === 'building') {
      // Build finished - ensure minimum display time then show completion
      const elapsed = Date.now() - buildStartTimeRef.current;
      const remainingMinTime = Math.max(0, MINIMUM_DISPLAY_MS - elapsed);

      const showCompletion = () => {
        setProgressPhase('complete');
        // Hide after showing completion
        setTimeout(() => {
          setShowProgress(false);
          setProgressPhase('building');
        }, COMPLETION_DISPLAY_MS);
      };

      if (remainingMinTime > 0) {
        const timer = setTimeout(showCompletion, remainingMinTime);
        return () => clearTimeout(timer);
      }
      showCompletion();
    }
  }, [isIndexBuilding, showProgress, progressPhase]);

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

  // Handle toggle change: ON builds index, OFF clears index
  const handleToggleChange = useCallback(
    async (checked: boolean) => {
      toggleUseCodebaseSearch();

      if (checked) {
        // ON: Build index
        await handleBuildIndex();
      } else {
        // OFF: Clear index
        await handleClearIndex();
      }
    },
    [toggleUseCodebaseSearch, handleBuildIndex, handleClearIndex]
  );

  if (!isOpen) {
    return null;
  }

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
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
            </div>
            <Toggle
              checked={useCodebaseSearch}
              onChange={handleToggleChange}
              disabled={showProgress}
              ariaLabel={t('codebaseIndex.enableReference')}
              size="small"
            />
          </div>

          {/* Progress bar (with minimum display duration & completion message) */}
          {showProgress && (
            <div style={{ marginTop: '12px' }}>
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
                    width: progressPhase === 'complete' ? '100%' : `${indexBuildProgress}%`,
                    height: '100%',
                    backgroundColor:
                      progressPhase === 'complete'
                        ? 'var(--vscode-testing-iconPassed)'
                        : 'var(--vscode-charts-yellow)',
                    transition: 'width 0.3s, background-color 0.3s',
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color:
                    progressPhase === 'complete'
                      ? 'var(--vscode-testing-iconPassed)'
                      : 'var(--vscode-descriptionForeground)',
                  marginTop: '4px',
                  fontWeight: progressPhase === 'complete' ? 600 : 400,
                }}
              >
                {progressPhase === 'complete'
                  ? 'Complete'
                  : `Building index... ${indexBuildProgress}%`}
              </div>
            </div>
          )}

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
      </div>
    </div>
  );
};

export default CodebaseSettingsDialog;
