/**
 * Claude Code Workflow Studio - Undo/Redo Controls Component
 *
 * Single icon button on the canvas toolbar; hover reveals undo/redo buttons
 * via Radix Popover portal (same pattern as ScrollModeToggle).
 */

import * as Popover from '@radix-ui/react-popover';
import { History, Redo2, Undo2 } from 'lucide-react';
import type React from 'react';
import { useStore } from 'zustand';
import { usePopoverHover } from '../hooks/usePopoverHover';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const isMac = typeof navigator !== 'undefined' && /Macintosh|Mac OS X/.test(navigator.userAgent);

export const UndoRedoControls: React.FC = () => {
  const { t } = useTranslation();
  const { isHovered, triggerProps, contentProps } = usePopoverHover();

  const canUndo = useStore(useWorkflowStore.temporal, (state) => state.pastStates.length > 0);
  const canRedo = useStore(useWorkflowStore.temporal, (state) => state.futureStates.length > 0);

  const handleUndo = () => {
    const { undo } = useWorkflowStore.temporal.getState();
    undo();
  };

  const handleRedo = () => {
    const { redo } = useWorkflowStore.temporal.getState();
    redo();
  };

  const undoShortcut = isMac ? 'Cmd+Z' : 'Ctrl+Z';
  const redoShortcut = isMac ? 'Cmd+Shift+Z' : 'Ctrl+Shift+Z';

  const actionButtonStyle = (enabled: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: 'transparent',
    transition: 'background-color 150ms',
    cursor: enabled ? 'pointer' : 'default',
    opacity: enabled ? 1 : 0.35,
  });

  return (
    <StyledTooltipProvider>
      <StyledTooltipItem content={isHovered ? '' : `${t('toolbar.undo')} / ${t('toolbar.redo')}`}>
        <div {...triggerProps}>
          <Popover.Root open={isHovered}>
            <Popover.Trigger asChild>
              <div
                role="button"
                tabIndex={0}
                aria-label={`${t('toolbar.undo')} / ${t('toolbar.redo')}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--vscode-editor-background)',
                  border: '1px solid var(--vscode-panel-border)',
                  borderRadius: '20px',
                  width: '34px',
                  height: '34px',
                  opacity: canUndo || canRedo ? 0.85 : 0.5,
                  cursor: 'pointer',
                  boxSizing: 'border-box',
                }}
              >
                <History size={14} style={{ color: 'var(--vscode-foreground)' }} />
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
                  gap: '4px',
                }}
              >
                {/* Undo */}
                <StyledTooltipItem content={`${t('toolbar.undo')} (${undoShortcut})`}>
                  <div
                    role="button"
                    tabIndex={canUndo ? 0 : -1}
                    aria-label={t('toolbar.undo')}
                    aria-disabled={!canUndo}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canUndo) handleUndo();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && canUndo) {
                        e.preventDefault();
                        handleUndo();
                      }
                    }}
                    style={actionButtonStyle(canUndo)}
                  >
                    <Undo2
                      size={13}
                      style={{
                        color: canUndo
                          ? 'var(--vscode-foreground)'
                          : 'var(--vscode-disabledForeground)',
                      }}
                    />
                  </div>
                </StyledTooltipItem>

                {/* Redo */}
                <StyledTooltipItem content={`${t('toolbar.redo')} (${redoShortcut})`}>
                  <div
                    role="button"
                    tabIndex={canRedo ? 0 : -1}
                    aria-label={t('toolbar.redo')}
                    aria-disabled={!canRedo}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canRedo) handleRedo();
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ' ') && canRedo) {
                        e.preventDefault();
                        handleRedo();
                      }
                    }}
                    style={actionButtonStyle(canRedo)}
                  >
                    <Redo2
                      size={13}
                      style={{
                        color: canRedo
                          ? 'var(--vscode-foreground)'
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
