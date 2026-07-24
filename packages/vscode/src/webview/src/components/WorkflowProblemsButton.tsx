/**
 * Workflow Problems Button (canvas toolbar)
 *
 * Opens the workflow problems panel, which lists every validation issue
 * and jumps to the offending node on click. The panel also opens
 * automatically when a save/export fails validation; this button makes
 * checking proactively possible before saving.
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

interface WorkflowProblemsButtonProps {
  onClick: () => void;
}

export const WorkflowProblemsButton: React.FC<WorkflowProblemsButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();
  const tooltip = t('problemsPanel.tooltip');

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
          style={ROUND_BUTTON_STYLE}
        >
          <ListChecks size={14} style={{ color: 'var(--vscode-foreground)' }} />
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
