/**
 * Search Nodes Button (canvas toolbar)
 *
 * Opens the node search panel (same as Ctrl/Cmd+F). Kept as a visible
 * toolbar entry so the search feature is discoverable without knowing
 * the shortcut.
 */

import { Search } from 'lucide-react';
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

interface SearchNodesButtonProps {
  onClick: () => void;
}

export const SearchNodesButton: React.FC<SearchNodesButtonProps> = ({ onClick }) => {
  const { t } = useTranslation();
  const isMac = navigator.platform.toUpperCase().includes('MAC');
  const shortcut = isMac ? '⌘F' : 'Ctrl+F';
  const tooltip = `${t('canvasSearch.tooltip')} (${shortcut})`;

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
          <Search size={14} style={{ color: 'var(--vscode-foreground)' }} />
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
