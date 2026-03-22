/**
 * Claude Code Workflow Studio - Scroll Mode Toggle Component
 *
 * Canvas scroll mode toggle (classic/freehand)
 * Compact icon when not hovered, expands to full toggle on hover.
 */

import * as Switch from '@radix-ui/react-switch';
import { Move, ZoomIn } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const TRANSITION_DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? '0ms'
  : '200ms';

/**
 * ScrollModeToggle Component
 *
 * Provides UI to switch between classic (scroll = zoom) and freehand (scroll = pan) modes.
 * Shows compact 28x28 icon button when not hovered, expands to full toggle on hover.
 */
export const ScrollModeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { scrollMode, toggleScrollMode } = useWorkflowStore();
  const [isHovered, setIsHovered] = useState(false);

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
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (!isHovered) toggleScrollMode();
          }}
          onKeyDown={(e) => {
            if (!isHovered && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              toggleScrollMode();
            }
          }}
          role="button"
          tabIndex={isHovered ? -1 : 0}
          aria-label={
            scrollMode === 'classic'
              ? t('toolbar.scrollMode.switchToFreehand')
              : t('toolbar.scrollMode.switchToClassic')
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
          {/* Classic Mode Icon (Left) */}
          <div
            style={{
              width: isHovered || scrollMode === 'classic' ? '20px' : '0px',
              opacity: isHovered || scrollMode === 'classic' ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
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
                    transition: `background-color 150ms`,
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
                <ZoomIn size={14} style={{ color: 'var(--vscode-foreground)' }} />
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
              checked={scrollMode === 'freehand'}
              onCheckedChange={() => {
                toggleScrollMode();
              }}
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
          </div>

          {/* Freehand Mode Icon (Right) */}
          <div
            style={{
              width: isHovered || scrollMode === 'freehand' ? '20px' : '0px',
              opacity: isHovered || scrollMode === 'freehand' ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
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
                      scrollMode === 'freehand' ? 'var(--vscode-badge-background)' : 'transparent',
                    transition: `background-color 150ms`,
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
                <Move size={14} style={{ color: 'var(--vscode-foreground)' }} />
              </div>
            )}
          </div>
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
