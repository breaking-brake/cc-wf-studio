/**
 * Header for Overview mode. Displays workflow name, description, status badges
 * (Before / After / Historical), and the "Switch to Edit" action.
 */

import type { Workflow } from '@shared/types/messages';
import { ArrowLeft } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../../i18n/i18n-context';

interface OverviewHeaderProps {
  workflow: Workflow | null;
  isHistoricalVersion: boolean;
  hasGitChanges: boolean;
  /** Toggle back to edit mode. When omitted, the toggle button is not shown (e.g. external preview). */
  onSwitchToEdit?: () => void;
}

export const OverviewHeader: React.FC<OverviewHeaderProps> = ({
  workflow,
  isHistoricalVersion,
  hasGitChanges,
  onSwitchToEdit,
}) => {
  const { t } = useTranslation();

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 16px',
        borderBottom: '1px solid var(--vscode-panel-border)',
        backgroundColor: 'var(--vscode-editor-background)',
        flexShrink: 0,
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0, flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h2
            style={{
              margin: 0,
              fontSize: '14px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={workflow?.name}
          >
            {workflow?.name || t('overview.loading')}
          </h2>
          {isHistoricalVersion && <Badge variant="info">{t('overview.versionBefore')}</Badge>}
          {hasGitChanges && !isHistoricalVersion && (
            <Badge variant="success">{t('overview.versionAfter')}</Badge>
          )}
        </div>
        {workflow?.description && (
          <p
            style={{
              margin: '4px 0 0',
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={workflow.description}
          >
            {workflow.description}
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
        {onSwitchToEdit && (
          <button
            type="button"
            onClick={onSwitchToEdit}
            title={t('toolbar.viewMode.switchToEdit')}
            aria-label={t('toolbar.viewMode.switchToEdit')}
            style={iconButtonStyle}
          >
            <ArrowLeft size={14} />
          </button>
        )}
      </div>
    </header>
  );
};

const iconButtonStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  padding: '4px 10px',
  fontSize: '12px',
  borderRadius: '3px',
  border: '1px solid var(--vscode-button-border, transparent)',
  backgroundColor: 'var(--vscode-button-secondaryBackground)',
  color: 'var(--vscode-button-secondaryForeground)',
  cursor: 'pointer',
};

const Badge: React.FC<{
  children: React.ReactNode;
  variant?: 'default' | 'info' | 'success';
}> = ({ children, variant = 'default' }) => {
  const colors: Record<string, { bg: string; fg: string }> = {
    default: {
      bg: 'var(--vscode-badge-background)',
      fg: 'var(--vscode-badge-foreground)',
    },
    info: {
      bg: 'var(--vscode-statusBarItem-warningBackground, #b89500)',
      fg: 'var(--vscode-statusBarItem-warningForeground, #ffffff)',
    },
    success: {
      bg: 'var(--vscode-statusBarItem-remoteBackground, #007acc)',
      fg: 'var(--vscode-statusBarItem-remoteForeground, #ffffff)',
    },
  };
  const c = colors[variant];
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '1px 8px',
        fontSize: '10px',
        fontWeight: 600,
        borderRadius: '10px',
        backgroundColor: c.bg,
        color: c.fg,
        textTransform: 'uppercase',
        letterSpacing: '0.4px',
      }}
    >
      {children}
    </span>
  );
};
