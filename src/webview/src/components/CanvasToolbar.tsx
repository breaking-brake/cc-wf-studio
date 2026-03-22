/**
 * Claude Code Workflow Studio - Canvas Toolbar Component
 *
 * Toolbar overlay on the canvas with scroll mode, interaction mode,
 * edge animation, and highlight toggles.
 */

import { Activity, Lightbulb, LightbulbOff } from 'lucide-react';
import type React from 'react';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';
import { InteractionModeToggle } from './InteractionModeToggle';
import { ScrollModeToggle } from './ScrollModeToggle';

interface CanvasToolbarProps {
  isEdgeAnimationEnabled: boolean;
  onToggleEdgeAnimation: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isEdgeAnimationEnabled,
  onToggleEdgeAnimation,
}) => {
  const { t } = useTranslation();
  const { isHighlightEnabled, toggleHighlightEnabled, highlightedGroupNodeId } = useWorkflowStore();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <ScrollModeToggle />
      <InteractionModeToggle />
      <StyledTooltipProvider>
        <StyledTooltipItem
          content={
            isEdgeAnimationEnabled
              ? t('toolbar.edgeAnimation.disable')
              : t('toolbar.edgeAnimation.enable')
          }
        >
          <button
            type="button"
            onClick={onToggleEdgeAnimation}
            aria-label={
              isEdgeAnimationEnabled
                ? t('toolbar.edgeAnimation.disable')
                : t('toolbar.edgeAnimation.enable')
            }
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '20px',
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              cursor: 'pointer',
              opacity: 0.85,
              color: isEdgeAnimationEnabled
                ? 'var(--vscode-foreground)'
                : 'var(--vscode-disabledForeground)',
            }}
          >
            <Activity size={14} />
          </button>
        </StyledTooltipItem>
        <StyledTooltipItem
          content={
            isHighlightEnabled ? t('toolbar.highlight.disable') : t('toolbar.highlight.enable')
          }
        >
          <button
            type="button"
            onClick={toggleHighlightEnabled}
            aria-label={
              isHighlightEnabled ? t('toolbar.highlight.disable') : t('toolbar.highlight.enable')
            }
            style={{
              all: 'unset',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '20px',
              backgroundColor: 'var(--vscode-editor-background)',
              border: highlightedGroupNodeId
                ? '1px solid rgba(79, 195, 247, 0.6)'
                : '1px solid var(--vscode-panel-border)',
              cursor: 'pointer',
              opacity: 0.85,
              color: isHighlightEnabled
                ? 'var(--vscode-foreground)'
                : 'var(--vscode-disabledForeground)',
              boxShadow: highlightedGroupNodeId ? '0 0 8px rgba(79, 195, 247, 0.4)' : 'none',
              animation:
                highlightedGroupNodeId &&
                !window.matchMedia('(prefers-reduced-motion: reduce)').matches
                  ? 'highlight-btn-pulse 1.5s ease-in-out infinite'
                  : 'none',
            }}
          >
            {isHighlightEnabled ? <Lightbulb size={14} /> : <LightbulbOff size={14} />}
          </button>
        </StyledTooltipItem>
      </StyledTooltipProvider>
    </div>
  );
};
