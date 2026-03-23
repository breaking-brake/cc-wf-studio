/**
 * Claude Code Workflow Studio - Interaction Mode Toggle Component
 *
 * Canvas interaction mode toggle (pan/selection)
 * Compact icon when not hovered, expands to full toggle on hover.
 */

import * as Switch from '@radix-ui/react-switch';
import { Hand, MousePointerClick } from 'lucide-react';
import type React from 'react';
import { useStableHover } from '../hooks/useStableHover';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const TRANSITION_DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? '0ms'
  : '200ms';

/**
 * InteractionModeToggle Component
 *
 * Provides UI to switch between pan and selection modes.
 * Shows compact 28x28 icon button when not hovered, expands to full toggle on hover.
 */
export const InteractionModeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { interactionMode, toggleInteractionMode } = useWorkflowStore();
  const { ref, isHovered, onMouseEnter, onMouseLeave } = useStableHover();

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
        <div
          ref={ref}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={() => {
            if (!isHovered) toggleInteractionMode();
          }}
          onKeyDown={(e) => {
            if (!isHovered && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              toggleInteractionMode();
            }
          }}
          role="button"
          tabIndex={isHovered ? -1 : 0}
          aria-label={
            interactionMode === 'pan'
              ? t('toolbar.interactionMode.switchToSelection')
              : t('toolbar.interactionMode.switchToPan')
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isHovered ? '6px' : '0px',
            backgroundColor: 'var(--vscode-editor-background)',
            border: isHovered
              ? '1px solid var(--vscode-focusBorder)'
              : '1px solid var(--vscode-panel-border)',
            borderRadius: '20px',
            padding: isHovered ? '4px 6px' : '0px',
            opacity: 0.85,
            width: isHovered ? '100px' : '28px',
            height: '28px',
            overflow: 'hidden',
            cursor: isHovered ? 'default' : 'pointer',
            boxSizing: 'border-box',
            transition: `width ${TRANSITION_DURATION} ease, padding ${TRANSITION_DURATION} ease, gap ${TRANSITION_DURATION} ease`,
          }}
        >
          {/* Pan Mode Icon (Left) */}
          <div
            style={{
              width: isHovered || interactionMode === 'pan' ? '20px' : '0px',
              opacity: isHovered || interactionMode === 'pan' ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
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
                      interactionMode === 'pan' ? 'var(--vscode-badge-background)' : 'transparent',
                    transition: `background-color 150ms`,
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
                <Hand size={14} style={{ color: 'var(--vscode-foreground)' }} />
              </div>
            )}
          </div>

          {/* Switch */}
          <div
            style={{
              width: isHovered ? '34px' : '0px',
              opacity: isHovered ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            <Switch.Root
              checked={interactionMode === 'selection'}
              onCheckedChange={() => {
                toggleInteractionMode();
              }}
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
          </div>

          {/* Selection Mode Icon (Right) */}
          <div
            style={{
              width: isHovered || interactionMode === 'selection' ? '20px' : '0px',
              opacity: isHovered || interactionMode === 'selection' ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
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
                    transition: `background-color 150ms`,
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
                <MousePointerClick size={14} style={{ color: 'var(--vscode-foreground)' }} />
              </div>
            )}
          </div>
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
