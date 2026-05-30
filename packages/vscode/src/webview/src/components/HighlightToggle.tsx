/**
 * Claude Code Workflow Studio - Highlight Toggle Component
 *
 * Canvas group node highlight toggle (on/off)
 * Compact icon button; hover shows a popover with the full switch UI
 * centered on the button via Radix Popover portal.
 */

import * as Popover from '@radix-ui/react-popover';
import * as Switch from '@radix-ui/react-switch';
import { Lightbulb, LightbulbOff } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { usePopoverHover } from '../hooks/usePopoverHover';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';
import { ConfirmDialog } from './dialogs/ConfirmDialog';

export const HighlightToggle: React.FC = () => {
  const { t } = useTranslation();
  const { isHighlightEnabled, toggleHighlightEnabled, highlightedGroupNodeId } = useWorkflowStore();
  const { isHovered, triggerProps, contentProps } = usePopoverHover();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const handleDisableHighlight = () => {
    if (isHighlightEnabled && highlightedGroupNodeId) {
      setShowConfirmDialog(true);
    } else {
      toggleHighlightEnabled();
    }
  };

  const highlightBorder = highlightedGroupNodeId
    ? '1px solid rgba(79, 195, 247, 0.6)'
    : '1px solid var(--vscode-panel-border)';
  const highlightShadow = highlightedGroupNodeId ? '0 0 8px rgba(79, 195, 247, 0.4)' : 'none';
  const highlightAnimation =
    highlightedGroupNodeId && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'highlight-btn-pulse 1.5s ease-in-out infinite'
      : 'none';

  return (
    <>
      <StyledTooltipProvider>
        <StyledTooltipItem
          content={
            isHovered
              ? ''
              : isHighlightEnabled
                ? t('toolbar.highlight.disable')
                : t('toolbar.highlight.enable')
          }
        >
          <div {...triggerProps}>
            <Popover.Root open={isHovered}>
              <Popover.Trigger asChild>
                <div
                  onClick={() => handleDisableHighlight()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleDisableHighlight();
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={
                    isHighlightEnabled
                      ? t('toolbar.highlight.disable')
                      : t('toolbar.highlight.enable')
                  }
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'var(--vscode-editor-background)',
                    border: highlightBorder,
                    borderRadius: '20px',
                    width: '34px',
                    height: '34px',
                    opacity: 0.85,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    boxShadow: highlightShadow,
                    animation: highlightAnimation,
                  }}
                >
                  {isHighlightEnabled ? (
                    <Lightbulb size={14} style={{ color: 'var(--vscode-foreground)' }} />
                  ) : (
                    <LightbulbOff size={14} style={{ color: 'var(--vscode-disabledForeground)' }} />
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
                  <StyledTooltipItem content={t('toolbar.highlight.disable')}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isHighlightEnabled) handleDisableHighlight();
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && isHighlightEnabled) {
                          e.preventDefault();
                          handleDisableHighlight();
                        }
                      }}
                      role="button"
                      tabIndex={isHighlightEnabled ? 0 : -1}
                      aria-label={t('toolbar.highlight.disable')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: !isHighlightEnabled
                          ? 'var(--vscode-badge-background)'
                          : 'transparent',
                        transition: 'background-color 150ms',
                        cursor: isHighlightEnabled ? 'pointer' : 'default',
                      }}
                    >
                      <LightbulbOff
                        size={12}
                        style={{
                          color: !isHighlightEnabled
                            ? 'var(--vscode-badge-foreground)'
                            : 'var(--vscode-disabledForeground)',
                        }}
                      />
                    </div>
                  </StyledTooltipItem>

                  {/* Switch */}
                  <Switch.Root
                    checked={isHighlightEnabled}
                    onCheckedChange={() => handleDisableHighlight()}
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Group node highlight"
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
                        transform: isHighlightEnabled ? 'translateX(16px)' : 'translateX(2px)',
                        willChange: 'transform',
                        margin: '1px',
                      }}
                    />
                  </Switch.Root>

                  {/* On Icon */}
                  <StyledTooltipItem content={t('toolbar.highlight.enable')}>
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!isHighlightEnabled) toggleHighlightEnabled();
                      }}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isHighlightEnabled) {
                          e.preventDefault();
                          toggleHighlightEnabled();
                        }
                      }}
                      role="button"
                      tabIndex={isHighlightEnabled ? -1 : 0}
                      aria-label={t('toolbar.highlight.enable')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        backgroundColor: isHighlightEnabled
                          ? 'var(--vscode-badge-background)'
                          : 'transparent',
                        transition: 'background-color 150ms',
                        cursor: isHighlightEnabled ? 'default' : 'pointer',
                      }}
                    >
                      <Lightbulb
                        size={12}
                        style={{
                          color: isHighlightEnabled
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
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title={t('toolbar.highlight.confirmDisable.title')}
        message={t('toolbar.highlight.confirmDisable.message')}
        confirmLabel={t('toolbar.highlight.confirmDisable.confirm')}
        cancelLabel={t('toolbar.highlight.confirmDisable.cancel')}
        onConfirm={() => {
          setShowConfirmDialog(false);
          toggleHighlightEnabled();
        }}
        onCancel={() => setShowConfirmDialog(false)}
      />
    </>
  );
};
