/**
 * Claude Code Workflow Studio - Edge Animation Toggle Component
 *
 * Canvas edge animation toggle (on/off)
 * Compact icon button; hover shows a popover with the full switch UI
 * centered on the button via Radix Popover portal.
 */

import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import { ChevronsLeftRightEllipsis } from 'lucide-react';
import type React from 'react';
import { usePopoverHover } from '../hooks/usePopoverHover';
import { useTranslation } from '../i18n/i18n-context';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

interface EdgeAnimationToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export const EdgeAnimationToggle: React.FC<EdgeAnimationToggleProps> = ({
  isEnabled,
  onToggle,
}) => {
  const { t } = useTranslation();
  const { isHovered, triggerProps, contentProps } = usePopoverHover();

  const renderOffIcon = (size: number, color: string) => (
    <div style={{ position: 'relative', display: 'flex' }}>
      <ChevronsLeftRightEllipsis size={size} style={{ color }} />
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '50%',
          width: '1.5px',
          height: '80%',
          backgroundColor: color,
          transform: 'translateX(-50%) rotate(-45deg)',
          transformOrigin: 'center',
        }}
      />
    </div>
  );

  return (
    <StyledTooltipProvider>
      <StyledTooltipItem
        content={
          isHovered
            ? ''
            : isEnabled
              ? t('toolbar.edgeAnimation.disable')
              : t('toolbar.edgeAnimation.enable')
        }
      >
        <div {...triggerProps}>
          <Popover.Root open={isHovered}>
            <Popover.Trigger asChild>
              <div
                onClick={() => onToggle()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle();
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={
                  isEnabled ? t('toolbar.edgeAnimation.disable') : t('toolbar.edgeAnimation.enable')
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
                {isEnabled ? (
                  <ChevronsLeftRightEllipsis
                    size={14}
                    style={{ color: 'var(--vscode-foreground)' }}
                  />
                ) : (
                  renderOffIcon(14, 'var(--vscode-disabledForeground)')
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
                {/* Off Icon */}
                <StyledTooltipItem content={t('toolbar.edgeAnimation.disable')}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEnabled) onToggle();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && isEnabled) {
                        e.preventDefault();
                        onToggle();
                      }
                    }}
                    role="button"
                    tabIndex={isEnabled ? 0 : -1}
                    aria-label={t('toolbar.edgeAnimation.disable')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: !isEnabled
                        ? 'var(--vscode-badge-background)'
                        : 'transparent',
                      transition: 'background-color 150ms',
                      cursor: isEnabled ? 'pointer' : 'default',
                    }}
                  >
                    {renderOffIcon(
                      12,
                      !isEnabled
                        ? 'var(--vscode-badge-foreground)'
                        : 'var(--vscode-disabledForeground)'
                    )}
                  </div>
                </StyledTooltipItem>

                {/* Switch */}
                <Switch.Root
                  checked={isEnabled}
                  onCheckedChange={() => onToggle()}
                  onClick={(e) => e.stopPropagation()}
                  aria-label="Edge animation"
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
                      transform: isEnabled ? 'translateX(16px)' : 'translateX(2px)',
                      willChange: 'transform',
                      margin: '1px',
                    }}
                  />
                </Switch.Root>

                {/* On Icon */}
                <StyledTooltipItem content={t('toolbar.edgeAnimation.enable')}>
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEnabled) onToggle();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && !isEnabled) {
                        e.preventDefault();
                        onToggle();
                      }
                    }}
                    role="button"
                    tabIndex={isEnabled ? -1 : 0}
                    aria-label={t('toolbar.edgeAnimation.enable')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '20px',
                      height: '20px',
                      borderRadius: '50%',
                      backgroundColor: isEnabled ? 'var(--vscode-badge-background)' : 'transparent',
                      transition: 'background-color 150ms',
                      cursor: isEnabled ? 'default' : 'pointer',
                    }}
                  >
                    <ChevronsLeftRightEllipsis
                      size={12}
                      style={{
                        color: isEnabled
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
