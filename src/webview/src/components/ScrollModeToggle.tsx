/**
 * Claude Code Workflow Studio - Scroll Mode Toggle Component
 *
 * Canvas scroll mode toggle (classic/freehand)
 * Compact icon button; hover shows a popover with the full switch UI
 * centered on the button via Radix Popover portal.
 */

import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import { Move, ZoomIn } from 'lucide-react';
import type React from 'react';
import { usePopoverHover } from '../hooks/usePopoverHover';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

export const ScrollModeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { scrollMode, toggleScrollMode } = useWorkflowStore();
  const { isHovered, triggerProps, contentProps } = usePopoverHover();

  return (
    <StyledTooltipProvider>
      <StyledTooltipItem
        content={
          isHovered
            ? ''
            : scrollMode === 'classic'
              ? t('toolbar.scrollMode.switchToFreehand')
              : t('toolbar.scrollMode.switchToClassic')
        }
      >
        <div {...triggerProps}>
          <Popover.Root open={isHovered}>
            <Popover.Trigger asChild>
              <div
                onClick={() => toggleScrollMode()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleScrollMode();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={
                  scrollMode === 'classic'
                    ? t('toolbar.scrollMode.switchToFreehand')
                    : t('toolbar.scrollMode.switchToClassic')
                }
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
                {scrollMode === 'classic' ? (
                  <ZoomIn size={14} style={{ color: 'var(--vscode-foreground)' }} />
                ) : (
                  <Move size={14} style={{ color: 'var(--vscode-foreground)' }} />
                )}
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
                  padding: '0px 6px',
                  height: '34px',
                  boxSizing: 'border-box',
                  zIndex: 10000,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {/* Classic Mode Icon */}
                <StyledTooltipItem content={t('toolbar.scrollMode.switchToClassic')}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (scrollMode !== 'classic') toggleScrollMode();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && scrollMode !== 'classic') {
                        e.preventDefault();
                        toggleScrollMode();
                      }
                    }}
                    role="button"
                    tabIndex={scrollMode === 'classic' ? -1 : 0}
                    aria-label={t('toolbar.scrollMode.switchToClassic')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor:
                        scrollMode === 'classic' ? 'var(--vscode-badge-background)' : 'transparent',
                      transition: 'background-color 150ms',
                      cursor: scrollMode === 'classic' ? 'default' : 'pointer',
                    }}
                  >
                    <ZoomIn
                      size={12}
                      style={{
                        color:
                          scrollMode === 'classic'
                            ? 'var(--vscode-badge-foreground)'
                            : 'var(--vscode-disabledForeground)',
                      }}
                    />
                  </div>
                </StyledTooltipItem>

                {/* Switch */}
                <Switch.Root
                  checked={scrollMode === 'freehand'}
                  onCheckedChange={() => toggleScrollMode()}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Canvas scroll mode"
                  style={{
                    all: 'unset',
                    width: '32px',
                    height: '18px',
                    backgroundColor: 'var(--vscode-input-background)',
                    borderRadius: '9px',
                    position: 'relative',
                    border: '1px solid var(--vscode-input-border)',
                    cursor: 'pointer',
                  }}
                >
                  <Switch.Thumb
                    style={{
                      all: 'unset',
                      display: 'block',
                      width: '14px',
                      height: '14px',
                      backgroundColor: 'var(--vscode-button-background)',
                      borderRadius: '7px',
                      transition: 'transform 100ms',
                      transform: scrollMode === 'freehand' ? 'translateX(16px)' : 'translateX(2px)',
                      willChange: 'transform',
                      margin: '1px',
                    }}
                  />
                </Switch.Root>

                {/* Freehand Mode Icon */}
                <StyledTooltipItem content={t('toolbar.scrollMode.switchToFreehand')}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (scrollMode !== 'freehand') toggleScrollMode();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && scrollMode !== 'freehand') {
                        e.preventDefault();
                        toggleScrollMode();
                      }
                    }}
                    role="button"
                    tabIndex={scrollMode === 'freehand' ? -1 : 0}
                    aria-label={t('toolbar.scrollMode.switchToFreehand')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor:
                        scrollMode === 'freehand'
                          ? 'var(--vscode-badge-background)'
                          : 'transparent',
                      transition: 'background-color 150ms',
                      cursor: scrollMode === 'freehand' ? 'default' : 'pointer',
                    }}
                  >
                    <Move
                      size={12}
                      style={{
                        color:
                          scrollMode === 'freehand'
                            ? 'var(--vscode-badge-foreground)'
                            : 'var(--vscode-disabledForeground)',
                      }}
                    />
                  </div>
                </StyledTooltipItem>
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
