/**
 * Claude Code Workflow Studio - Minimap Toggle Component
 *
 * Canvas toolbar 3-state toggle for minimap display mode:
 * - hidden: never show
 * - auto: show on scroll, fade out after idle
 * - always: always visible
 *
 * Compact icon when not hovered, expands to 3-segment control on hover.
 */

import { Map as MapIcon, MapPinned } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const TRANSITION_DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? '0ms'
  : '200ms';

type MinimapDisplayMode = 'hidden' | 'auto' | 'always';

export const MinimapToggle: React.FC = () => {
  const { t } = useTranslation();
  const { minimapDisplayMode, setMinimapDisplayMode } = useWorkflowStore();
  const [isHovered, setIsHovered] = useState(false);

  const tooltipForMode = (mode: MinimapDisplayMode) => {
    switch (mode) {
      case 'hidden':
        return t('toolbar.minimapToggle.hidden');
      case 'auto':
        return t('toolbar.minimapToggle.auto');
      case 'always':
        return t('toolbar.minimapToggle.always');
    }
  };

  const cycleMode = () => {
    const modes: MinimapDisplayMode[] = ['hidden', 'auto', 'always'];
    const nextIndex = (modes.indexOf(minimapDisplayMode) + 1) % modes.length;
    setMinimapDisplayMode(modes[nextIndex]);
  };

  // Icon for current mode (collapsed state)
  const renderCollapsedIcon = () => {
    if (minimapDisplayMode === 'hidden') {
      return (
        <div
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <MapIcon size={14} style={{ color: 'var(--vscode-disabledForeground)' }} />
          <div
            style={{
              position: 'absolute',
              top: '10%',
              left: '50%',
              width: '1.5px',
              height: '80%',
              backgroundColor: 'var(--vscode-disabledForeground)',
              transform: 'translateX(-50%) rotate(-45deg)',
              transformOrigin: 'center',
            }}
          />
        </div>
      );
    }
    if (minimapDisplayMode === 'auto') {
      return <MapPinned size={14} style={{ color: 'var(--vscode-foreground)' }} />;
    }
    return <MapIcon size={14} style={{ color: 'var(--vscode-foreground)' }} />;
  };

  // Segment button for expanded state
  const renderSegment = (mode: MinimapDisplayMode) => {
    const isActive = minimapDisplayMode === mode;

    const renderIcon = () => {
      if (mode === 'hidden') {
        return (
          <div style={{ position: 'relative', display: 'flex' }}>
            <MapIcon
              size={11}
              style={{
                color: isActive
                  ? 'var(--vscode-badge-foreground)'
                  : 'var(--vscode-disabledForeground)',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '10%',
                left: '50%',
                width: '1.5px',
                height: '80%',
                backgroundColor: isActive
                  ? 'var(--vscode-badge-foreground)'
                  : 'var(--vscode-disabledForeground)',
                transform: 'translateX(-50%) rotate(-45deg)',
                transformOrigin: 'center',
              }}
            />
          </div>
        );
      }
      if (mode === 'auto') {
        return (
          <MapPinned
            size={11}
            style={{
              color: isActive
                ? 'var(--vscode-badge-foreground)'
                : 'var(--vscode-disabledForeground)',
            }}
          />
        );
      }
      return (
        <MapIcon
          size={11}
          style={{
            color: isActive ? 'var(--vscode-badge-foreground)' : 'var(--vscode-disabledForeground)',
          }}
        />
      );
    };

    return (
      <StyledTooltipItem content={tooltipForMode(mode)} key={mode}>
        <div
          onClick={(e) => {
            e.stopPropagation();
            setMinimapDisplayMode(mode);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              setMinimapDisplayMode(mode);
            }
          }}
          role="button"
          tabIndex={isActive ? -1 : 0}
          aria-label={tooltipForMode(mode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '26px',
            borderRadius: '4px',
            backgroundColor: isActive ? 'var(--vscode-badge-background)' : 'transparent',
            transition: 'background-color 150ms',
            cursor: isActive ? 'default' : 'pointer',
          }}
        >
          {renderIcon()}
        </div>
      </StyledTooltipItem>
    );
  };

  return (
    <StyledTooltipProvider>
      <StyledTooltipItem content={isHovered ? '' : tooltipForMode(minimapDisplayMode)}>
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (!isHovered) cycleMode();
          }}
          onKeyDown={(e) => {
            if (!isHovered && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              cycleMode();
            }
          }}
          role="button"
          tabIndex={isHovered ? -1 : 0}
          aria-label={`Minimap: ${tooltipForMode(minimapDisplayMode)}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isHovered ? '4px' : '0px',
            backgroundColor: 'var(--vscode-editor-background)',
            border: isHovered
              ? '1px solid var(--vscode-focusBorder)'
              : '1px solid var(--vscode-panel-border)',
            borderRadius: '20px',
            padding: isHovered ? '4px 5px' : '0px',
            opacity: 0.85,
            width: isHovered ? '106px' : '28px',
            height: '34px',
            overflow: 'hidden',
            cursor: isHovered ? 'default' : 'pointer',
            boxSizing: 'border-box',
            transition: `width ${TRANSITION_DURATION} ease, padding ${TRANSITION_DURATION} ease, gap ${TRANSITION_DURATION} ease`,
          }}
        >
          {isHovered ? (
            <>
              {renderSegment('hidden')}
              {renderSegment('auto')}
              {renderSegment('always')}
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px',
              }}
            >
              {renderCollapsedIcon()}
            </div>
          )}
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
