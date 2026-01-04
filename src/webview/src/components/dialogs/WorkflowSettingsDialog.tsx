/**
 * Workflow Settings Dialog Component
 *
 * Dialog for editing workflow settings including description.
 * Includes AI-powered description generation.
 */

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import {
  cancelSlackDescriptionGeneration,
  generateSlackDescription,
} from '../../services/slack-integration-service';
import { serializeWorkflow } from '../../services/workflow-service';
import { useWorkflowStore } from '../../stores/workflow-store';
import { AiGenerateButton } from '../common/AiGenerateButton';

interface WorkflowSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
  description: string;
  onDescriptionChange: (description: string) => void;
}

export function WorkflowSettingsDialog({
  isOpen,
  onClose,
  description,
  onDescriptionChange,
}: WorkflowSettingsDialogProps) {
  const { t, locale } = useTranslation();
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Get current canvas state for workflow generation
  const { nodes, edges, activeWorkflow, workflowName, subAgentFlows } = useWorkflowStore();

  // Local state for editing (syncs with props on open)
  const [localDescription, setLocalDescription] = useState(description);
  const [isGeneratingDescription, setIsGeneratingDescription] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const generationRequestIdRef = useRef<string | null>(null);

  // Sync local state with props when dialog opens
  useEffect(() => {
    if (isOpen) {
      setLocalDescription(description);
      setGenerationError(null);
    }
  }, [isOpen, description]);

  // Auto-focus dialog when opened
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus();
    }
  }, [isOpen]);

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
        localDescription || undefined,
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
        setLocalDescription(generatedDescription);
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
    localDescription,
    activeWorkflow?.conversationHistory,
    locale,
    t,
    subAgentFlows,
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

  const handleSave = () => {
    onDescriptionChange(localDescription);
    onClose();
  };

  const handleClose = useCallback(() => {
    // Cancel any ongoing generation
    if (generationRequestIdRef.current) {
      cancelSlackDescriptionGeneration(generationRequestIdRef.current);
      generationRequestIdRef.current = null;
      setIsGeneratingDescription(false);
      setGenerationError(null);
    }
    onClose();
  }, [onClose]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
      onClick={handleClose}
      onKeyDown={handleKeyDown}
      role="presentation"
    >
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: onClick is only used to stop event propagation */}
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-labelledby={titleId}
        aria-modal="true"
        style={{
          backgroundColor: 'var(--vscode-editor-background)',
          border: '1px solid var(--vscode-panel-border)',
          borderRadius: '4px',
          padding: '24px',
          minWidth: '500px',
          maxWidth: '600px',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.3)',
          outline: 'none',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title */}
        <div
          id={titleId}
          style={{
            fontSize: '16px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '20px',
          }}
        >
          {t('workflow.settings.title')}
        </div>

        {/* Description Input */}
        <div style={{ marginBottom: '16px' }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '8px',
            }}
          >
            <label
              htmlFor="description-input"
              style={{
                fontSize: '13px',
                color: 'var(--vscode-foreground)',
                fontWeight: 500,
              }}
            >
              {t('workflow.settings.description.label')}
            </label>
            <AiGenerateButton
              isGenerating={isGeneratingDescription}
              onGenerate={handleGenerateDescription}
              onCancel={handleCancelGeneration}
              generateTooltip={t('workflow.settings.generateWithAI')}
              cancelTooltip={t('cancel')}
            />
          </div>
          {generationError && (
            <div
              style={{
                fontSize: '12px',
                color: 'var(--vscode-errorForeground)',
                marginBottom: '8px',
              }}
            >
              {generationError}
            </div>
          )}
          <textarea
            id="description-input"
            value={localDescription}
            onChange={(e) => setLocalDescription(e.target.value)}
            disabled={isGeneratingDescription}
            maxLength={500}
            rows={4}
            style={{
              width: '100%',
              padding: '8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '13px',
              fontFamily: 'inherit',
              resize: 'vertical',
              boxSizing: 'border-box',
            }}
            placeholder={t('workflow.settings.description.placeholder')}
          />
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '4px',
              textAlign: 'right',
            }}
          >
            {localDescription.length} / 500
          </div>
        </div>

        {/* Buttons */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            justifyContent: 'flex-end',
          }}
        >
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isGeneratingDescription}
            style={{
              padding: '6px 16px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '2px',
              cursor: isGeneratingDescription ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontWeight: 500,
              opacity: isGeneratingDescription ? 0.5 : 1,
            }}
          >
            {t('toolbar.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
