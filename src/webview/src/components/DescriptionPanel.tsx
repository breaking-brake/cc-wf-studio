/**
 * Claude Code Workflow Studio - Description Panel Component
 *
 * Collapsible panel for editing workflow description.
 * Follows the MinimapContainer pattern for toggle functionality.
 * Includes AI-powered description generation.
 */

import { Minus, NotepadText } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/i18n-context';
import {
  cancelSlackDescriptionGeneration,
  generateSlackDescription,
} from '../services/slack-integration-service';
import { serializeWorkflow } from '../services/workflow-service';
import { useWorkflowStore } from '../stores/workflow-store';
import { AiGenerateButton } from './common/AiGenerateButton';
import { EditInEditorButton } from './common/EditInEditorButton';
import { StyledTooltip } from './common/StyledTooltip';

/**
 * DescriptionPanel Component
 *
 * Collapsible panel for workflow description editing.
 * When collapsed, shows only a NotepadText icon button to expand.
 * When expanded, shows a textarea with AI generation button.
 */
export const DescriptionPanel: React.FC = () => {
  const { t, locale } = useTranslation();
  const {
    isDescriptionPanelVisible,
    toggleDescriptionPanelVisibility,
    workflowDescription,
    setWorkflowDescription,
    nodes,
    edges,
    activeWorkflow,
    workflowName,
    subAgentFlows,
  } = useWorkflowStore();

  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [isEditingInEditor, setIsEditingInEditor] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationRequestIdRef = useRef<string | null>(null);

  // Panel size state with localStorage persistence
  const [panelWidth, setPanelWidth] = useState(() => {
    const saved = localStorage.getItem('cc-wf-studio.descriptionPanelWidth');
    return saved ? Number.parseInt(saved, 10) : 280;
  });
  const [panelHeight, setPanelHeight] = useState(() => {
    const saved = localStorage.getItem('cc-wf-studio.descriptionPanelHeight');
    return saved ? Number.parseInt(saved, 10) : 160;
  });

  // Resize state
  const isResizingRef = useRef<'left' | 'bottom' | 'corner' | null>(null);
  const startPosRef = useRef({ x: 0, y: 0 });
  const startSizeRef = useRef({ width: 0, height: 0 });

  // Size constraints
  const MIN_WIDTH = 200;
  const MAX_WIDTH = 500;
  const MIN_HEIGHT = 100;
  const MAX_HEIGHT = 400;

  // Save size to localStorage when changed
  useEffect(() => {
    localStorage.setItem('cc-wf-studio.descriptionPanelWidth', panelWidth.toString());
  }, [panelWidth]);

  useEffect(() => {
    localStorage.setItem('cc-wf-studio.descriptionPanelHeight', panelHeight.toString());
  }, [panelHeight]);

  // Handle resize mouse events
  const handleResizeStart = useCallback(
    (e: React.MouseEvent, direction: 'left' | 'bottom' | 'corner') => {
      e.preventDefault();
      e.stopPropagation();
      isResizingRef.current = direction;
      startPosRef.current = { x: e.clientX, y: e.clientY };
      startSizeRef.current = { width: panelWidth, height: panelHeight };

      const handleMouseMove = (moveEvent: MouseEvent) => {
        if (!isResizingRef.current) return;

        const deltaX = startPosRef.current.x - moveEvent.clientX;
        const deltaY = moveEvent.clientY - startPosRef.current.y;

        if (isResizingRef.current === 'left' || isResizingRef.current === 'corner') {
          const newWidth = Math.min(
            MAX_WIDTH,
            Math.max(MIN_WIDTH, startSizeRef.current.width + deltaX)
          );
          setPanelWidth(newWidth);
        }

        if (isResizingRef.current === 'bottom' || isResizingRef.current === 'corner') {
          const newHeight = Math.min(
            MAX_HEIGHT,
            Math.max(MIN_HEIGHT, startSizeRef.current.height + deltaY)
          );
          setPanelHeight(newHeight);
        }
      };

      const handleMouseUp = () => {
        isResizingRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    },
    [panelWidth, panelHeight]
  );

  // Handle AI description generation
  const handleGenerateDescription = useCallback(async () => {
    const currentRequestId = `gen-desc-${Date.now()}`;
    generationRequestIdRef.current = currentRequestId;
    setIsGeneratingDescription(true);
    setGenerationError(null);

    try {
      // Serialize current workflow state
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName || 'Untitled Workflow',
        workflowDescription || undefined,
        activeWorkflow?.conversationHistory,
        subAgentFlows
      );
      const workflowJson = JSON.stringify(workflow, null, 2);

      // Determine target language from locale
      let targetLanguage = locale;
      if (locale.startsWith('zh-')) {
        targetLanguage = locale === 'zh-TW' || locale === 'zh-HK' ? 'zh-TW' : 'zh-CN';
      } else {
        targetLanguage = locale.split('-')[0];
      }

      // Generate description with AI (reuse Slack description generator)
      const generatedDescription = await generateSlackDescription(
        workflowJson,
        targetLanguage,
        30000,
        currentRequestId
      );

      // Only update if not cancelled
      if (generationRequestIdRef.current === currentRequestId) {
        setWorkflowDescription(generatedDescription);
      }
    } catch {
      // Only show error if not cancelled
      if (generationRequestIdRef.current === currentRequestId) {
        setGenerationError(t('slack.description.generateFailed'));
      }
    } finally {
      // Only reset state if not cancelled
      if (generationRequestIdRef.current === currentRequestId) {
        setIsGeneratingDescription(false);
        generationRequestIdRef.current = null;
      }
    }
  }, [
    nodes,
    edges,
    workflowName,
    workflowDescription,
    activeWorkflow?.conversationHistory,
    locale,
    t,
    subAgentFlows,
    setWorkflowDescription,
  ]);

  // Handle cancel AI description generation
  const handleCancelGeneration = useCallback(() => {
    const requestId = generationRequestIdRef.current;
    if (requestId) {
      cancelSlackDescriptionGeneration(requestId);
    }
    generationRequestIdRef.current = null;
    setIsGeneratingDescription(false);
    setGenerationError(null);
  }, []);

  // Common button styles (highly transparent to not obstruct canvas)
  const buttonBaseStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'color-mix(in srgb, var(--vscode-editor-background) 30%, transparent)',
    border: '1px solid color-mix(in srgb, var(--vscode-panel-border) 30%, transparent)',
    borderRadius: '4px',
    cursor: 'pointer',
    color: 'var(--vscode-foreground)',
  };

  // When collapsed: show expand button only
  if (!isDescriptionPanelVisible) {
    return (
      <StyledTooltip content={t('description.panel.show')} side="left">
        <button
          type="button"
          onClick={toggleDescriptionPanelVisibility}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              toggleDescriptionPanelVisibility();
            }
          }}
          aria-label={t('description.panel.show')}
          style={{
            ...buttonBaseStyle,
            width: '28px',
            height: '28px',
          }}
        >
          <NotepadText size={14} />
        </button>
      </StyledTooltip>
    );
  }

  // Resize handle style
  const resizeHandleBase: React.CSSProperties = {
    position: 'absolute',
    backgroundColor: 'transparent',
  };

  // When visible: show expanded panel with description textarea
  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid color-mix(in srgb, var(--vscode-panel-border) 50%, transparent)',
        borderRadius: '6px',
        backgroundColor: 'color-mix(in srgb, var(--vscode-editor-background) 85%, transparent)',
        backdropFilter: 'blur(8px)',
        padding: '8px',
        width: `${panelWidth}px`,
        minHeight: `${panelHeight}px`,
      }}
    >
      {/* Resize handle - Left edge */}
      <div
        style={{
          ...resizeHandleBase,
          left: 0,
          top: 0,
          width: '6px',
          height: '100%',
          cursor: 'ew-resize',
        }}
        onMouseDown={(e) => handleResizeStart(e, 'left')}
      />

      {/* Resize handle - Bottom edge */}
      <div
        style={{
          ...resizeHandleBase,
          left: 0,
          bottom: 0,
          width: '100%',
          height: '6px',
          cursor: 'ns-resize',
        }}
        onMouseDown={(e) => handleResizeStart(e, 'bottom')}
      />

      {/* Resize handle - Bottom-left corner */}
      <div
        style={{
          ...resizeHandleBase,
          left: 0,
          bottom: 0,
          width: '12px',
          height: '12px',
          cursor: 'nesw-resize',
        }}
        onMouseDown={(e) => handleResizeStart(e, 'corner')}
      />
      {/* Header with title and minimize button */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <NotepadText size={14} style={{ color: 'var(--vscode-foreground)', opacity: 0.8 }} />
          <span
            style={{
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--vscode-foreground)',
            }}
          >
            {t('description.panel.title')}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {/* Edit in Editor Button */}
          <EditInEditorButton
            content={workflowDescription}
            onContentUpdated={setWorkflowDescription}
            label={t('description.panel.title')}
            language="plaintext"
            disabled={isGeneratingDescription}
            onEditingStateChange={setIsEditingInEditor}
          />

          {/* AI Generate Button */}
          <AiGenerateButton
            isGenerating={isGeneratingDescription}
            onGenerate={handleGenerateDescription}
            onCancel={handleCancelGeneration}
            generateTooltip={t('workflow.settings.generateWithAI')}
            cancelTooltip={t('cancel')}
            disabled={isEditingInEditor}
          />

          {/* Minimize button */}
          <StyledTooltip content={t('description.panel.hide')} side="left">
            <button
              type="button"
              onClick={toggleDescriptionPanelVisibility}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleDescriptionPanelVisibility();
                }
              }}
              aria-label={t('description.panel.hide')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'transparent',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                color: 'var(--vscode-foreground)',
                padding: '2px',
                opacity: 0.7,
              }}
            >
              <Minus size={14} />
            </button>
          </StyledTooltip>
        </div>
      </div>

      {/* Error message */}
      {generationError && (
        <div
          style={{
            fontSize: '11px',
            color: 'var(--vscode-errorForeground)',
            marginBottom: '6px',
          }}
        >
          {generationError}
        </div>
      )}

      {/* Description textarea */}
      <textarea
        value={workflowDescription}
        onChange={(e) => setWorkflowDescription(e.target.value)}
        disabled={isGeneratingDescription || isEditingInEditor}
        maxLength={500}
        style={{
          width: '100%',
          height: `${panelHeight - 60}px`,
          padding: '6px 8px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '3px',
          fontSize: '12px',
          fontFamily: 'inherit',
          resize: 'none',
          boxSizing: 'border-box',
          minHeight: '40px',
          opacity: isGeneratingDescription || isEditingInEditor ? 0.6 : 1,
        }}
        placeholder={t('workflow.settings.description.placeholder')}
      />

      {/* Character count */}
      <div
        style={{
          fontSize: '10px',
          color: 'var(--vscode-descriptionForeground)',
          marginTop: '4px',
          textAlign: 'right',
        }}
      >
        {workflowDescription.length} / 500
      </div>
    </div>
  );
};
