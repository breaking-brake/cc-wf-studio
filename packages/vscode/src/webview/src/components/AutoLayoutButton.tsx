/**
 * Auto Layout Button (canvas toolbar)
 *
 * Re-arranges the whole canvas into a tidy left-to-right layered layout —
 * one click to clean up a messy or AI-generated workflow. The layout is a
 * single undo entry, so it is always safe to try.
 */

import { Network } from 'lucide-react';
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

interface AutoLayoutButtonProps {
  onClick: () => void;
}

export const AutoLayoutButton: React.FC<AutoLayoutButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();
  const tooltip = t('autoLayout.tooltip');

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
          <Network size={14} style={{ color: 'var(--vscode-foreground)' }} />
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
