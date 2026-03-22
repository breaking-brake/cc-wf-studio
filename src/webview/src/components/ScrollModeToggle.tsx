/**
 * Claude Code Workflow Studio - Scroll Mode Toggle Component
 *
 * Canvas scroll mode toggle (classic/freehand)
 */

import * as Switch from '@radix-ui/react-switch';
import { Move, ZoomIn } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

/**
 * ScrollModeToggle Component
 *
 * Provides UI to switch between classic (scroll = zoom) and freehand (scroll = pan) modes
 */
export const ScrollModeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { scrollMode, toggleScrollMode } = useWorkflowStore();

  return (
    <StyledTooltipProvider>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '20px',
          padding: '4px 6px',
          opacity: 0.85,
        }}
      >
        {/* Classic Mode Icon (Left) */}
        <StyledTooltipItem content={t('toolbar.scrollMode.switchToClassic')}>
          <div
            onClick={() => {
              if (scrollMode !== 'classic') {
                toggleScrollMode();
              }
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
          onCheckedChange={toggleScrollMode}
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

        {/* Freehand Mode Icon (Right) */}
        <StyledTooltipItem content={t('toolbar.scrollMode.switchToFreehand')}>
          <div
            onClick={() => {
              if (scrollMode !== 'freehand') {
                toggleScrollMode();
              }
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
      </div>
    </StyledTooltipProvider>
  );
};
