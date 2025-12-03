/**
 * Claude Code Workflow Studio - Interaction Mode Toggle Component
 *
 * Canvas interaction mode toggle (pan/selection)
 */

import * as Switch from '@radix-ui/react-switch';
import { Hand, MousePointerClick } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';

/**
 * InteractionModeToggle Component
 *
 * Provides UI to switch between pan and selection modes
 */
export const InteractionModeToggle: React.FC = () => {
  const { t } = useTranslation();
  const { interactionMode, toggleInteractionMode } = useWorkflowStore();

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
        {/* Pan Mode Icon (Left) */}
        <StyledTooltipItem content={t('toolbar.interactionMode.switchToPan')}>
          <div
            onClick={() => {
              if (interactionMode !== 'pan') {
                toggleInteractionMode();
              }
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
          onCheckedChange={toggleInteractionMode}
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
              transform: interactionMode === 'selection' ? 'translateX(16px)' : 'translateX(2px)',
              willChange: 'transform',
              margin: '1px',
            }}
          />
        </Switch.Root>

        {/* Selection Mode Icon (Right) */}
        <StyledTooltipItem content={t('toolbar.interactionMode.switchToSelection')}>
          <div
            onClick={() => {
              if (interactionMode !== 'selection') {
                toggleInteractionMode();
              }
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
                interactionMode === 'selection' ? 'var(--vscode-badge-background)' : 'transparent',
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
      </div>
    </StyledTooltipProvider>
  );
};
