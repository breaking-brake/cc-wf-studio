/**
 * Claude Code Workflow Studio - Edge Animation Toggle Component
 *
 * Canvas edge animation toggle (on/off)
 * Compact icon when not hovered, expands to full toggle on hover.
 */

import * as Switch from '@radix-ui/react-switch';
import { ChevronsLeftRightEllipsis } from 'lucide-react';
import type React from 'react';
import { useStableHover } from '../hooks/useStableHover';
import { useTranslation } from '../i18n/i18n-context';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

const TRANSITION_DURATION = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ? '0ms'
  : '200ms';

interface EdgeAnimationToggleProps {
  isEnabled: boolean;
  onToggle: () => void;
}

export const EdgeAnimationToggle: React.FC<EdgeAnimationToggleProps> = ({
  isEnabled,
  onToggle,
}) => {
  const { t } = useTranslation();
  const { ref, isHovered, onMouseEnter, onMouseLeave } = useStableHover();

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
        <div
          ref={ref}
          onMouseEnter={onMouseEnter}
          onMouseLeave={onMouseLeave}
          onClick={() => {
            if (!isHovered) onToggle();
          }}
          onKeyDown={(e) => {
            if (!isHovered && (e.key === 'Enter' || e.key === ' ')) {
              e.preventDefault();
              onToggle();
            }
          }}
          role="button"
          tabIndex={isHovered ? -1 : 0}
          aria-label={
            isEnabled ? t('toolbar.edgeAnimation.disable') : t('toolbar.edgeAnimation.enable')
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
            width: isHovered ? '100px' : '34px',
            height: '34px',
            overflow: 'hidden',
            cursor: isHovered ? 'default' : 'pointer',
            boxSizing: 'border-box',
            transition: `width ${TRANSITION_DURATION} ease, padding ${TRANSITION_DURATION} ease, gap ${TRANSITION_DURATION} ease`,
          }}
        >
          {/* Off Icon (Left) */}
          <div
            style={{
              width: isHovered || !isEnabled ? '20px' : '0px',
              opacity: isHovered || !isEnabled ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
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
                    backgroundColor: !isEnabled ? 'var(--vscode-badge-background)' : 'transparent',
                    transition: 'background-color 150ms',
                    cursor: isEnabled ? 'pointer' : 'default',
                  }}
                >
                  <div style={{ position: 'relative', display: 'flex' }}>
                    <ChevronsLeftRightEllipsis
                      size={12}
                      style={{
                        color: !isEnabled
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
                        backgroundColor: !isEnabled
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
                <ChevronsLeftRightEllipsis
                  size={14}
                  style={{ color: 'var(--vscode-disabledForeground)' }}
                />
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
              checked={isEnabled}
              onCheckedChange={() => {
                onToggle();
              }}
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
          </div>

          {/* On Icon (Right) */}
          <div
            style={{
              width: isHovered || isEnabled ? '20px' : '0px',
              opacity: isHovered || isEnabled ? 1 : 0,
              overflow: 'hidden',
              flexShrink: 0,
              transition: `width ${TRANSITION_DURATION} ease, opacity ${TRANSITION_DURATION} ease`,
            }}
          >
            {isHovered ? (
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
                <ChevronsLeftRightEllipsis
                  size={14}
                  style={{ color: 'var(--vscode-foreground)' }}
                />
              </div>
            )}
          </div>
        </div>
      </StyledTooltipItem>
    </StyledTooltipProvider>
  );
};
