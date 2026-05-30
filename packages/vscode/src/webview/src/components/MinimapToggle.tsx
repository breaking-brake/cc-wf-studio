/**
 * Claude Code Workflow Studio - Minimap Toggle Component
 *
 * Canvas toolbar 3-state toggle for minimap display mode:
 * - hidden: never show
 * - auto: show on scroll, fade out after idle
 * - always: always visible
 *
 * Compact icon button; hover shows a popover with 3-segment control
 * centered on the button via Radix Popover portal.
 */

import * as Popover from '@radix-ui/react-popover';
import { Map as MapIcon, MapPinned } from 'lucide-react';
import type React from 'react';
import { usePopoverHover } from '../hooks/usePopoverHover';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

type MinimapDisplayMode = 'hidden' | 'auto' | 'always';

export const MinimapToggle: React.FC = () => {
  const { t } = useTranslation();
  const { minimapDisplayMode, setMinimapDisplayMode } = useWorkflowStore();
  const { isHovered, triggerProps, contentProps } = usePopoverHover();

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
        <div {...triggerProps}>
          <Popover.Root open={isHovered}>
            <Popover.Trigger asChild>
              <div
                onClick={() => cycleMode()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cycleMode();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`Minimap: ${tooltipForMode(minimapDisplayMode)}`}
                style={{
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
                }}
              >
                {renderCollapsedIcon()}
              </div>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content
                className="toggle-popover-content"
                side="bottom"
                sideOffset={-34}
                align="center"
                onOpenAutoFocus={(e) => e.preventDefault()}
                onCloseAutoFocus={(e) => e.preventDefault()}
                onPointerDownOutside={(e) => e.preventDefault()}
                onInteractOutside={(e) => e.preventDefault()}
                {...contentProps}
                style={{
                  backgroundColor: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-focusBorder)',
                  borderRadius: '20px',
                  padding: '0px 5px',
                  height: '34px',
                  boxSizing: 'border-box',
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                {renderSegment('hidden')}
                {renderSegment('auto')}
                {renderSegment('always')}
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
