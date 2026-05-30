/**
 * Claude Code Workflow Studio - Interaction Mode Toggle Component
 *
 * Canvas interaction mode toggle (pan/selection)
 * Compact icon button; hover shows a popover with the full switch UI
 * centered on the button via Radix Popover portal.
 */

import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import { Hand, MousePointerClick } from 'lucide-react';
import type React from 'react';
import { usePopoverHover } from '../hooks/usePopoverHover';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

export const InteractionModeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { interactionMode, toggleInteractionMode } = useWorkflowStore();
  const { isHovered, triggerProps, contentProps } = usePopoverHover();

  return (
    <StyledTooltipProvider>
      <StyledTooltipItem
        content={
          isHovered
            ? ''
            : interactionMode === 'pan'
              ? t('toolbar.interactionMode.switchToSelection')
              : t('toolbar.interactionMode.switchToPan')
        }
      >
        <div {...triggerProps}>
          <Popover.Root open={isHovered}>
            <Popover.Trigger asChild>
              <div
                onClick={() => toggleInteractionMode()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleInteractionMode();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={
                  interactionMode === 'pan'
                    ? t('toolbar.interactionMode.switchToSelection')
                    : t('toolbar.interactionMode.switchToPan')
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
                {interactionMode === 'pan' ? (
                  <Hand size={14} style={{ color: 'var(--vscode-foreground)' }} />
                ) : (
                  <MousePointerClick size={14} style={{ color: 'var(--vscode-foreground)' }} />
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
                {/* Pan Mode Icon */}
                <StyledTooltipItem content={t('toolbar.interactionMode.switchToPan')}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (interactionMode !== 'pan') toggleInteractionMode();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'pan') {
                        e.preventDefault();
                        toggleInteractionMode();
                      }
                    }}
                    role="button"
                    tabIndex={interactionMode === 'pan' ? -1 : 0}
                    aria-label={t('toolbar.interactionMode.switchToPan')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor:
                        interactionMode === 'pan'
                          ? 'var(--vscode-badge-background)'
                          : 'transparent',
                      transition: 'background-color 150ms',
                      cursor: interactionMode === 'pan' ? 'default' : 'pointer',
                    }}
                  >
                    <Hand
                      size={12}
                      style={{
                        color:
                          interactionMode === 'pan'
                            ? 'var(--vscode-badge-foreground)'
                            : 'var(--vscode-disabledForeground)',
                      }}
                    />
                  </div>
                </StyledTooltipItem>

                {/* Switch */}
                <Switch.Root
                  checked={interactionMode === 'selection'}
                  onCheckedChange={() => toggleInteractionMode()}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Canvas interaction mode"
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
                      transform:
                        interactionMode === 'selection' ? 'translateX(16px)' : 'translateX(2px)',
                      willChange: 'transform',
                      margin: '1px',
                    }}
                  />
                </Switch.Root>

                {/* Selection Mode Icon */}
                <StyledTooltipItem content={t('toolbar.interactionMode.switchToSelection')}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (interactionMode !== 'selection') toggleInteractionMode();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && interactionMode !== 'selection') {
                        e.preventDefault();
                        toggleInteractionMode();
                      }
                    }}
                    role="button"
                    tabIndex={interactionMode === 'selection' ? -1 : 0}
                    aria-label={t('toolbar.interactionMode.switchToSelection')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor:
                        interactionMode === 'selection'
                          ? 'var(--vscode-badge-background)'
                          : 'transparent',
                      transition: 'background-color 150ms',
                      cursor: interactionMode === 'selection' ? 'default' : 'pointer',
                    }}
                  >
                    <MousePointerClick
                      size={12}
                      style={{
                        color:
                          interactionMode === 'selection'
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
