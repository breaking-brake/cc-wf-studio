/**
 * Claude Code Workflow Studio - Minimap Toggle Component
 *
 * Canvas toolbar toggle for minimap auto-show on scroll (on/off).
 * Compact icon when not hovered, expands to full toggle on hover.
 */

import * as Switch from '@radix-ui/react-switch';
import { Map as MapIcon } from 'lucide-react';
import type React from 'react';
import { useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const TRANSITION_DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? '0ms'
  : '200ms';

export const MinimapToggle: React.FC = () => {
  const { t } = useTranslation();
  const { isMinimapVisible, toggleMinimapVisibility } = useWorkflowStore();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <StyledTooltipProvider>
      <StyledTooltipItem
        content={
          isHovered
            ? ''
            : isMinimapVisible
              ? t('toolbar.minimapToggle.hide')
              : t('toolbar.minimapToggle.show')
        }
      >
        <div
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => {
            if (!isHovered) toggleMinimapVisibility();
          }}
          onKeyDown={(e) => {
            if (!isHovered && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              toggleMinimapVisibility();
            }
          }}
          role="button"
          tabIndex={isHovered ? -1 : 0}
          aria-label={
            isMinimapVisible ? t('toolbar.minimapToggle.hide') : t('toolbar.minimapToggle.show')
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
          {/* Off Icon (Left) - Map icon with diagonal strikethrough */}
          <div
            style={{
              width: isHovered || !isMinimapVisible ? '20px' : '0px',
              opacity: isHovered || !isMinimapVisible ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
              <StyledTooltipItem content={t('toolbar.minimapToggle.hide')}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isMinimapVisible) toggleMinimapVisibility();
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && isMinimapVisible) {
                      e.preventDefault();
                      toggleMinimapVisibility();
                    }
                  }}
                  role="button"
                  tabIndex={isMinimapVisible ? 0 : -1}
                  aria-label={t('toolbar.minimapToggle.hide')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: !isMinimapVisible
                      ? 'var(--vscode-badge-background)'
                      : 'transparent',
                    transition: 'background-color 150ms',
                    cursor: isMinimapVisible ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ position: 'relative', display: 'flex' }}>
                    <MapIcon
                      size={12}
                      style={{
                        color: !isMinimapVisible
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
                        backgroundColor: !isMinimapVisible
                          ? 'var(--vscode-badge-foreground)'
                          : 'var(--vscode-disabledForeground)',
                        transform: 'translateX(-50%) rotate(-45deg)',
                        transformOrigin: 'center',
                      }}
                    />
                  </div>
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
                  position: 'relative',
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
              checked={isMinimapVisible}
              onCheckedChange={() => {
                toggleMinimapVisibility();
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label="Minimap toggle"
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
                  transform: isMinimapVisible ? 'translateX(16px)' : 'translateX(2px)',
                  willChange: 'transform',
                  margin: '1px',
                }}
              />
            </Switch.Root>
          </div>

          {/* On Icon (Right) */}
          <div
            style={{
              width: isHovered || isMinimapVisible ? '20px' : '0px',
              opacity: isHovered || isMinimapVisible ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
              <StyledTooltipItem content={t('toolbar.minimapToggle.show')}>
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isMinimapVisible) toggleMinimapVisibility();
                  }}
                  onKeyDown={(e) => {
                    if ((e.key === 'Enter' || e.key === ' ') && !isMinimapVisible) {
                      e.preventDefault();
                      toggleMinimapVisibility();
                    }
                  }}
                  role="button"
                  tabIndex={isMinimapVisible ? -1 : 0}
                  aria-label={t('toolbar.minimapToggle.show')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: isMinimapVisible
                      ? 'var(--vscode-badge-background)'
                      : 'transparent',
                    transition: 'background-color 150ms',
                    cursor: isMinimapVisible ? 'default' : 'pointer',
                  }}
                >
                  <MapIcon
                    size={12}
                    style={{
                      color: isMinimapVisible
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
                <MapIcon size={14} style={{ color: 'var(--vscode-foreground)' }} />
              </div>
            )}
          </div>
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
