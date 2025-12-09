/**
 * Claude Code Workflow Studio - Toolbar Component
 *
 * Provides Save and Load functionality for workflows
 */

import type { Workflow } from '@shared/types/messages';
import { FileDown, Save, Share2, SquareSlash, Trash2 } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import { vscode } from '../main';
import { generateWorkflowName } from '../services/ai-generation-service';
import { saveWorkflow } from '../services/vscode-bridge';
import {
  deserializeWorkflow,
  serializeWorkflow,
  validateWorkflow,
} from '../services/workflow-service';
import { useRefinementStore } from '../stores/refinement-store';
import { useWorkflowStore } from '../stores/workflow-store';
import { AiGenerateButton } from './common/AiGenerateButton';
import { ProcessingOverlay } from './common/ProcessingOverlay';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';
import { ConfirmDialog } from './dialogs/ConfirmDialog';

interface ToolbarProps {
  onError: (error: { code: string; message: string; details?: unknown }) => void;
  onStartTour: () => void;
  onShareToSlack: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onError, onStartTour, onShareToSlack }) => {
  const { t, locale } = useTranslation();
  const isCompact = useIsCompactMode();
  const {
    nodes,
    edges,
    setNodes,
    setEdges,
    activeWorkflow,
    setActiveWorkflow,
    workflowName,
    setWorkflowName,
    clearWorkflow,
  } = useWorkflowStore();
  const { isProcessing } = useRefinementStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const generationNameRequestIdRef = useRef<string | null>(null);

  // Handle reset workflow
  const handleResetWorkflow = useCallback(() => {
    clearWorkflow();
    setShowResetConfirm(false);
  }, [clearWorkflow]);

  const handleSave = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequired'),
      });
      return;
    }

    setIsSaving(true);
    try {
      // Issue #89: Get subAgentFlows from store
      const { subAgentFlows } = useWorkflowStore.getState();

      // Phase 5 (T024): Serialize workflow with conversation history and subAgentFlows
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        'Created with Workflow Studio',
        activeWorkflow?.conversationHistory,
        subAgentFlows
      );

      // Validate workflow before saving
      validateWorkflow(workflow);

      // Save if validation passes
      await saveWorkflow(workflow);
      console.log('Workflow saved successfully:', workflowName);
    } catch (error) {
      // Translate error messages
      let errorMessage = t('toolbar.error.validationFailed');
      if (error instanceof Error) {
        if (error.message.includes('at least one End node')) {
          errorMessage = t('toolbar.error.missingEndNode');
        } else {
          errorMessage = error.message;
        }
      }

      onError({
        code: 'VALIDATION_ERROR',
        message: errorMessage,
        details: error,
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Listen for messages from Extension
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'LOAD_WORKFLOW') {
        // Load workflow into canvas and set as active workflow
        setIsLoadingFile(false);
        const workflow: Workflow = message.payload?.workflow;
        if (workflow) {
          const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setWorkflowName(workflow.name);
          // Set as active workflow to preserve conversation history
          setActiveWorkflow(workflow);
        }
      } else if (message.type === 'FILE_PICKER_CANCELLED') {
        // User cancelled file picker - reset loading state
        setIsLoadingFile(false);
      } else if (message.type === 'EXPORT_SUCCESS') {
        setIsExporting(false);
      } else if (message.type === 'EXPORT_CANCELLED') {
        // User cancelled export - reset exporting state
        setIsExporting(false);
      } else if (message.type === 'ERROR') {
        // Reset loading states on any error
        setIsExporting(false);
        setIsLoadingFile(false);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [setNodes, setEdges, setActiveWorkflow, setWorkflowName]);

  const handleLoadWorkflow = () => {
    setIsLoadingFile(true);
    // Open OS file picker via extension
    vscode.postMessage({
      type: 'OPEN_FILE_PICKER',
    });
  };

  const handleExport = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    setIsExporting(true);
    try {
      // Issue #89: Get subAgentFlows from store for export
      const { subAgentFlows } = useWorkflowStore.getState();

      // Serialize workflow with subAgentFlows
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        'Created with Workflow Studio',
        undefined, // conversationHistory not needed for export
        subAgentFlows
      );

      // Validate workflow before export
      validateWorkflow(workflow);

      // Request export
      vscode.postMessage({
        type: 'EXPORT_WORKFLOW',
        payload: { workflow },
      });
    } catch (error) {
      // Translate error messages
      let errorMessage = t('toolbar.error.validationFailed');
      if (error instanceof Error) {
        if (error.message.includes('at least one End node')) {
          errorMessage = t('toolbar.error.missingEndNode');
        } else {
          errorMessage = error.message;
        }
      }

      onError({
        code: 'VALIDATION_ERROR',
        message: errorMessage,
        details: error,
      });
      setIsExporting(false);
    }
  };

  // Handle AI workflow name generation
  const handleGenerateWorkflowName = useCallback(async () => {
    const currentRequestId = `gen-name-${Date.now()}`;
    generationNameRequestIdRef.current = currentRequestId;
    setIsGeneratingName(true);

    try {
      // Serialize current workflow state
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName || 'Untitled',
        'Created with Workflow Studio',
        activeWorkflow?.conversationHistory
      );
      const workflowJson = JSON.stringify(workflow, null, 2);

      // Determine target language
      let targetLanguage = locale;
      if (locale.startsWith('zh-')) {
        targetLanguage = locale === 'zh-TW' || locale === 'zh-HK' ? 'zh-TW' : 'zh-CN';
      } else {
        targetLanguage = locale.split('-')[0];
      }

      // Generate name with AI
      const generatedName = await generateWorkflowName(workflowJson, targetLanguage);

      // Only update if not cancelled
      if (generationNameRequestIdRef.current === currentRequestId) {
        setWorkflowName(generatedName);
      }
    } catch (error) {
      // Only show error if not cancelled
      if (generationNameRequestIdRef.current === currentRequestId) {
        onError({
          code: 'AI_GENERATION_ERROR',
          message: t('toolbar.error.nameGenerationFailed'),
          details: error,
        });
      }
    } finally {
      if (generationNameRequestIdRef.current === currentRequestId) {
        setIsGeneratingName(false);
        generationNameRequestIdRef.current = null;
      }
    }
  }, [
    nodes,
    edges,
    workflowName,
    activeWorkflow?.conversationHistory,
    locale,
    onError,
    setWorkflowName,
    t,
  ]);

  // Handle cancel name generation
  const handleCancelNameGeneration = useCallback(() => {
    generationNameRequestIdRef.current = null;
    setIsGeneratingName(false);
  }, []);

  return (
    <StyledTooltipProvider>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-editor-background)',
        }}
      >
        {/* Workflow Name Input with AI Generate Button (inside input) */}
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            value={workflowName}
            onChange={(e) => setWorkflowName(e.target.value)}
            placeholder={t('toolbar.workflowNamePlaceholder')}
            disabled={isGeneratingName}
            className="nodrag"
            data-tour="workflow-name-input"
            style={{
              width: '100%',
              padding: '4px 44px 4px 8px',
              backgroundColor: 'var(--vscode-input-background)',
              color: 'var(--vscode-input-foreground)',
              border: '1px solid var(--vscode-input-border)',
              borderRadius: '2px',
              fontSize: '13px',
              opacity: isGeneratingName ? 0.7 : 1,
              boxSizing: 'border-box',
            }}
          />
          {/* AI Generate / Cancel Button (positioned inside input) */}
          <div
            style={{
              position: 'absolute',
              right: '4px',
              top: '50%',
              transform: 'translateY(-50%)',
            }}
          >
            <AiGenerateButton
              isGenerating={isGeneratingName}
              onGenerate={handleGenerateWorkflowName}
              onCancel={handleCancelNameGeneration}
              generateTooltip={t('toolbar.generateNameWithAI')}
              cancelTooltip={t('cancel')}
            />
          </div>
        </div>

        {/* Save Button */}
        <StyledTooltipItem content={t('toolbar.save.tooltip')}>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            data-tour="save-button"
            style={{
              padding: isCompact ? '4px 8px' : '4px 12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '2px',
              cursor: isSaving ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: isSaving ? 0.6 : 1,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isCompact ? <Save size={16} /> : isSaving ? t('toolbar.saving') : t('toolbar.save')}
          </button>
        </StyledTooltipItem>

        {/* Load Button */}
        <StyledTooltipItem content={t('toolbar.load.tooltip')}>
          <button
            type="button"
            onClick={handleLoadWorkflow}
            disabled={isLoadingFile}
            data-tour="load-button"
            style={{
              padding: isCompact ? '4px 8px' : '4px 12px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: isLoadingFile ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: isLoadingFile ? 0.6 : 1,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isCompact ? (
              <FileDown size={16} />
            ) : isLoadingFile ? (
              t('toolbar.loading')
            ) : (
              t('toolbar.load')
            )}
          </button>
        </StyledTooltipItem>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '20px',
            backgroundColor: 'var(--vscode-panel-border)',
          }}
        />

        {/* Export Button */}
        <StyledTooltipItem content={t('toolbar.convert.iconTooltip')}>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting}
            data-tour="export-button"
            style={{
              padding: isCompact ? '4px 8px' : '4px 12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '2px',
              cursor: isExporting ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              opacity: isExporting ? 0.6 : 1,
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isCompact ? (
              <SquareSlash size={16} />
            ) : isExporting ? (
              t('toolbar.converting')
            ) : (
              t('toolbar.convert')
            )}
          </button>
        </StyledTooltipItem>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            height: '20px',
            backgroundColor: 'var(--vscode-panel-border)',
          }}
        />

        {/* Share to Slack Button - Phase 3.1 (Beta feature, placed before help button) */}
        <StyledTooltipItem content={t('slack.share.tooltip')}>
          <button
            type="button"
            onClick={onShareToSlack}
            data-tour="slack-share-button"
            style={{
              padding: isCompact ? '4px 8px' : '4px 12px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            {isCompact ? <Share2 size={16} /> : t('slack.share.title')}
          </button>
        </StyledTooltipItem>

        {/* Reset Workflow Button */}
        <StyledTooltipItem content={t('toolbar.resetWorkflow')}>
          <button
            type="button"
            onClick={() => setShowResetConfirm(true)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'var(--vscode-button-secondaryBackground)',
              color: 'var(--vscode-button-secondaryForeground)',
              border: 'none',
              borderRadius: '2px',
              cursor: 'pointer',
              fontSize: '13px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <Trash2 size={16} />
          </button>
        </StyledTooltipItem>

        {/* Help Button */}
        <button
          type="button"
          onClick={onStartTour}
          title="Start Tour"
          data-tour="help-button"
          style={{
            padding: '4px 8px',
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none',
            borderRadius: '2px',
            cursor: 'pointer',
            fontSize: '13px',
          }}
        >
          ?
        </button>

        {/* Processing Overlay (Phase 3.10) */}
        <ProcessingOverlay isVisible={isProcessing} />

        {/* Reset Workflow Confirmation Dialog */}
        <ConfirmDialog
          isOpen={showResetConfirm}
          title={t('dialog.resetWorkflow.title')}
          message={t('dialog.resetWorkflow.message')}
          confirmLabel={t('dialog.resetWorkflow.confirm')}
          cancelLabel={t('common.cancel')}
          onConfirm={handleResetWorkflow}
          onCancel={() => setShowResetConfirm(false)}
        />
      </div>
    </StyledTooltipProvider>
  );
};
