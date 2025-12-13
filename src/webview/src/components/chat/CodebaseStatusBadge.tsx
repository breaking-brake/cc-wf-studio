/**
 * Codebase Reference Button Component
 *
 * Displays a labeled button for codebase reference feature in the header.
 * Clicking the button opens the CodebaseSettingsDialog.
 *
 * Based on: GitHub Issue #265 Phase 2 UX Implementation
 */

import { useEffect, useState } from 'react';
import { useResponsiveFonts } from '../../contexts/ResponsiveFontContext';
import { useTranslation } from '../../i18n/i18n-context';
import { getIndexStatus } from '../../services/codebase-search-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { CodebaseSettingsDialog } from '../dialogs/CodebaseSettingsDialog';

export function CodebaseStatusBadge() {
  const { t } = useTranslation();
  const fontSizes = useResponsiveFonts();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const {
    indexStatus,
    isIndexBuilding,
    indexBuildProgress,
    setIndexStatus,
    useCodebaseSearch,
    loadCodebaseSearchSetting,
  } = useRefinementStore();

  // Fetch index status and load codebase search setting on mount
  useEffect(() => {
    const initialize = async () => {
      try {
        // Load codebase search setting from VSCode configuration
        await loadCodebaseSearchSetting();
        // Fetch index status
        const status = await getIndexStatus();
        setIndexStatus(status);
      } catch (error) {
        console.error('Failed to initialize codebase status:', error);
      }
    };
    initialize();
  }, [setIndexStatus, loadCodebaseSearchSetting]);

  // Determine badge state and content
  const isReady = indexStatus?.state === 'ready';
  const documentCount = indexStatus?.documentCount ?? 0;

  // Status indicator color
  const getStatusColor = () => {
    if (isIndexBuilding) {
      return 'var(--vscode-charts-yellow)';
    }
    if (!useCodebaseSearch) {
      return 'var(--vscode-disabledForeground)';
    }
    if (isReady && documentCount > 0) {
      return 'var(--vscode-charts-green)';
    }
    return 'var(--vscode-disabledForeground)';
  };

  // Status indicator content (small badge)
  const getStatusContent = () => {
    if (isIndexBuilding) {
      return `${indexBuildProgress}%`;
    }
    if (useCodebaseSearch && isReady && documentCount > 0) {
      return '✓';
    }
    return '';
  };

  // Tooltip text
  const getTooltip = () => {
    if (isIndexBuilding) {
      return t('codebaseIndex.building');
    }
    if (!useCodebaseSearch) {
      return t('codebaseIndex.settings.disabled');
    }
    if (isReady) {
      return t('codebaseIndex.ready');
    }
    return t('codebaseIndex.notBuilt');
  };

  const statusContent = getStatusContent();

  return (
    <>
      {/* Codebase Reference Button */}
      <button
        type="button"
        onClick={() => setIsDialogOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '4px 10px',
          backgroundColor: useCodebaseSearch
            ? 'var(--vscode-button-secondaryBackground)'
            : 'transparent',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          cursor: 'pointer',
          color: useCodebaseSearch
            ? 'var(--vscode-button-secondaryForeground)'
            : 'var(--vscode-disabledForeground)',
          fontSize: `${fontSizes.small}px`,
          fontWeight: 500,
          transition: 'background-color 0.2s, color 0.2s',
        }}
        title={getTooltip()}
        aria-label={t('codebaseIndex.button')}
        onMouseEnter={(e) => {
          if (useCodebaseSearch) {
            e.currentTarget.style.backgroundColor = 'var(--vscode-button-secondaryHoverBackground)';
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = useCodebaseSearch
            ? 'var(--vscode-button-secondaryBackground)'
            : 'transparent';
        }}
      >
        <span>{t('codebaseIndex.button')}</span>
        {statusContent && (
          <span
            style={{
              color: getStatusColor(),
              fontSize: `${fontSizes.xsmall}px`,
              fontWeight: 600,
            }}
          >
            {statusContent}
          </span>
        )}
      </button>

      {/* Settings Dialog */}
      <CodebaseSettingsDialog isOpen={isDialogOpen} onClose={() => setIsDialogOpen(false)} />
    </>
  );
}
