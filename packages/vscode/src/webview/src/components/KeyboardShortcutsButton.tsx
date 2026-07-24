/**
 * Keyboard Shortcuts Button (canvas toolbar)
 *
 * Opens the keyboard shortcut cheat sheet (same as pressing `?`). Kept as
 * a visible toolbar entry so the shortcuts are discoverable without
 * already knowing one.
 */

import { Keyboard } from 'lucide-react';
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

interface KeyboardShortcutsButtonProps {
  onClick: () => void;
}

export const KeyboardShortcutsButton: React.FC<KeyboardShortcutsButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();
  const tooltip = `${t('shortcuts.tooltip')} (?)`;

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
          <Keyboard size={14} style={{ color: 'var(--vscode-foreground)' }} />
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
