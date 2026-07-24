/**
 * Workflow Problems Button (canvas toolbar)
 *
 * Opens the workflow problems panel, which lists every validation issue
 * and jumps to the offending node on click. The panel also opens
 * automatically when a save/export fails validation; this button makes
 * checking proactively possible before saving. When the workflow currently
 * has validation issues, a red count badge (matching the on-canvas
 * `wf-problem-node` markers) surfaces them without opening the panel.
 */

import { ListChecks } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const ROUND_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--vscode-editor-background)',
  border: '1px solid var(--vscode-panel-border)',
  borderRadius: '20px',
  width: '34px',
  height: '34px',
  opacity: 0.85,
  cursor: 'pointer',
  boxSizing: 'border-box',
};

const COUNT_BADGE_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '-5px',
  right: '-5px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  minWidth: '16px',
  height: '16px',
  padding: '0 4px',
  borderRadius: '8px',
  fontSize: '10px',
  lineHeight: 1,
  fontWeight: 600,
  backgroundColor: 'var(--vscode-charts-red, #ef4444)',
  color: '#ffffff',
  pointerEvents: 'none',
  boxSizing: 'border-box',
};

interface WorkflowProblemsButtonProps {
  onClick: () => void;
  /** Current number of validation issues; > 0 shows a red count badge */
  issueCount?: number;
}

export const WorkflowProblemsButton: React.FC<WorkflowProblemsButtonProps> = ({
  onClick,
  issueCount = 0,
}) => {
  const { t } = useTranslation();
  const tooltip = `${
    issueCount > 0
      ? t('problemsPanel.tooltipWithCount', { count: issueCount })
      : t('problemsPanel.tooltip')
  } (F8)`;

  return (
    <StyledTooltipProvider>
      <StyledTooltipItem content={tooltip}>
        <div
          onClick={onClick}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onClick();
            }
          }}
          role="button"
          tabIndex={0}
          aria-label={tooltip}
          style={{ ...ROUND_BUTTON_STYLE, position: 'relative' }}
        >
          <ListChecks size={14} style={{ color: 'var(--vscode-foreground)' }} />
          {issueCount > 0 && (
            <span aria-hidden="true" style={COUNT_BADGE_STYLE}>
              {issueCount > 99 ? '99+' : issueCount}
            </span>
          )}
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
