/**
 * Claude Code Workflow Studio - Highlight Toggle Component
 *
 * Canvas group node highlight toggle (on/off)
 * Compact icon when not hovered, expands to full toggle on hover.
 */

import * as Switch from '@radix-ui/react-switch';
import { Lightbulb, LightbulbOff } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const TRANSITION_DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? '0ms'
  : '200ms';

export const HighlightToggle: React.FC = () => {
  const { t } = useTranslation();
  const { isHighlightEnabled, toggleHighlightEnabled, highlightedGroupNodeId } = useWorkflowStore();
  const [isHovered, setIsHovered] = useState(false);

  const highlightBorder = isHovered
    ? '1px solid var(--vscode-focusBorder)'
    : highlightedGroupNodeId
      ? '1px solid rgba(79, 195, 247, 0.6)'
      : '1px solid var(--vscode-panel-border)';
  const highlightShadow = highlightedGroupNodeId ? '0 0 8px rgba(79, 195, 247, 0.4)' : 'none';
  const highlightAnimation =
    highlightedGroupNodeId && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'highlight-btn-pulse 1.5s ease-in-out infinite'
      : 'none';

  return (
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
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (!isHovered) toggleHighlightEnabled();
          }}
          onKeyDown={(e) => {
            if (!isHovered && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              toggleHighlightEnabled();
            }
          }}
          role="button"
          tabIndex={isHovered ? -1 : 0}
          aria-label={
            isHighlightEnabled ? t('toolbar.highlight.disable') : t('toolbar.highlight.enable')
          }
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: isHovered ? '6px' : '0px',
            backgroundColor: 'var(--vscode-editor-background)',
            border: highlightBorder,
            borderRadius: '20px',
            padding: isHovered ? '4px 6px' : '0px',
            opacity: 0.85,
            width: isHovered ? '100px' : '28px',
            height: '28px',
            overflow: 'hidden',
            cursor: isHovered ? 'default' : 'pointer',
            boxSizing: 'border-box',
            boxShadow: highlightShadow,
            animation: highlightAnimation,
            transition: `width ${TRANSITION_DURATION} ease, padding ${TRANSITION_DURATION} ease, gap ${TRANSITION_DURATION} ease`,
          }}
        >
          {/* Off Icon (Left) */}
          <div
            style={{
              width: isHovered || !isHighlightEnabled ? '20px' : '0px',
              opacity: isHovered || !isHighlightEnabled ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
              <StyledTooltipItem content={t('toolbar.highlight.disable')}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isHighlightEnabled) toggleHighlightEnabled();
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isHighlightEnabled) {
                      e.preventDefault();
                      toggleHighlightEnabled();
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
                <LightbulbOff size={14} style={{ color: 'var(--vscode-disabledForeground)' }} />
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
              checked={isHighlightEnabled}
              onCheckedChange={() => {
                toggleHighlightEnabled();
              }}
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
          </div>

          {/* On Icon (Right) */}
          <div
            style={{
              width: isHovered || isHighlightEnabled ? '20px' : '0px',
              opacity: isHovered || isHighlightEnabled ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
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
                <Lightbulb size={14} style={{ color: 'var(--vscode-foreground)' }} />
              </div>
            )}
          </div>
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
