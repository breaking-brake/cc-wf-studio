/**
 * Claude Code Workflow Studio - Minimap Container Component
 *
 * Container component that wraps the MiniMap with a border frame
 * and provides minimize/expand toggle button
 */

import { Map as MapIcon, Minus } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltip } from './common/StyledTooltip';

interface MinimapContainerProps {
  children: React.ReactNode;
}

/**
 * MinimapContainer Component
 *
 * Wraps MiniMap with a bordered container and minimize button (top-right)
 * When minimized, shows only a Map icon button to expand
 */
export const MinimapContainer: React.FC<MinimapContainerProps> = ({ children }) => {
  const { t } = useTranslation();
  const { isMinimapVisible, toggleMinimapVisibility } = useWorkflowStore();

  // Common button styles (highly transparent to not obstruct canvas)
  const buttonBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'color-mix(in srgb, var(--vscode-editor-background) 30%, transparent)',
    border: '1px solid color-mix(in srgb, var(--vscode-panel-border) 30%, transparent)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--vscode-foreground)',
  };

  // When minimized: show expand button only
  if (!isMinimapVisible) {
    return (
      <StyledTooltip content={t('toolbar.minimapToggle.show')} side="left">
        <button
          type="button"
          onClick={toggleMinimapVisibility}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleMinimapVisibility();
            }
          }}
          aria-label={t('toolbar.minimapToggle.show')}
          style={{
            ...buttonBaseStyle,
            width: '28px',
            height: '28px',
          }}
        >
          <MapIcon size={14} />
        </button>
      </StyledTooltip>
    );
  }

  // When visible: show bordered container with minimize button (highly transparent frame)
  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid color-mix(in srgb, var(--vscode-panel-border) 30%, transparent)',
        borderRadius: '6px',
        backgroundColor: 'color-mix(in srgb, var(--vscode-editor-background) 20%, transparent)',
        padding: '2px 8px 2px 0px',
      }}
    >
      {/* Minimize button (top-right corner) */}
      <StyledTooltip content={t('toolbar.minimapToggle.hide')} side="left">
        <button
          type="button"
          onClick={toggleMinimapVisibility}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleMinimapVisibility();
            }
          }}
          aria-label={t('toolbar.minimapToggle.hide')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'color-mix(in srgb, var(--vscode-editor-background) 70%, transparent)',
            border: '1px solid color-mix(in srgb, var(--vscode-panel-border) 30%, transparent)',
            borderTop: 'none',
            borderRight: 'none',
            borderRadius: '0px 0px 0px 4px',
            cursor: 'pointer',
            color: 'var(--vscode-foreground)',
            backdropFilter: 'blur(4px)',
            position: 'absolute',
            top: '0px',
            right: '0px',
            zIndex: 10,
            width: '20px',
            height: '20px',
          }}
        >
          <Minus size={12} />
        </button>
      </StyledTooltip>

      {/* MiniMap content */}
      {children}
    </div>
  );
};
