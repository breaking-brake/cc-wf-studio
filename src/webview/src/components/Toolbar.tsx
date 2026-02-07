/**
 * Claude Code Workflow Studio - Toolbar Component
 *
 * Provides Save and Load functionality for workflows
 */

import type { Workflow } from '@shared/types/messages';
import { FileDown, Play, Save, Sparkles, SquareSlash } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useIsCompactMode } from '../hooks/useWindowWidth';
import { useTranslation } from '../i18n/i18n-context';
import { vscode } from '../main';
import {
  cancelWorkflowNameGeneration,
  generateWorkflowName,
} from '../services/ai-generation-service';
import {
  exportForCodexCli,
  exportForCopilot,
  exportForCopilotCli,
  exportForRooCode,
  runAsSlashCommand,
  runForCodexCli,
  runForCopilot,
  runForCopilotCli,
  runForRooCode,
  saveWorkflow,
} from '../services/vscode-bridge';
import {
  deserializeWorkflow,
  serializeWorkflow,
  validateWorkflow,
} from '../services/workflow-service';
import { useRefinementStore } from '../stores/refinement-store';
import { useWorkflowStore } from '../stores/workflow-store';
import { EditableNameField } from './common/EditableNameField';
import { ProcessingOverlay } from './common/ProcessingOverlay';
import { StyledTooltipProvider } from './common/StyledTooltip';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import {
  type CopilotExecutionMode,
  CopilotExecutionModeDropdown,
} from './toolbar/CopilotExecutionModeDropdown';
import { MoreActionsDropdown } from './toolbar/MoreActionsDropdown';
import { SlashCommandOptionsDropdown } from './toolbar/SlashCommandOptionsDropdown';

interface ToolbarProps {
  onError: (error: { code: string; message: string; details?: unknown }) => void;
  onStartTour: () => void;
  onShareToSlack: () => void;
  moreActionsOpen?: boolean;
  onMoreActionsOpenChange?: (open: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onError,
  onStartTour,
  onShareToSlack,
  moreActionsOpen,
  onMoreActionsOpenChange,
}) => {
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
    workflowDescription,
    setWorkflowDescription,
    clearWorkflow,
    subAgentFlows,
    isFocusMode,
    toggleFocusMode,
    slashCommandOptions,
    setSlashCommandOptions,
    setSlashCommandContext,
    setSlashCommandModel,
    setSlashCommandAllowedTools,
    setSlashCommandDisableModelInvocation,
    setSlashCommandArgumentHint,
    addHookEntry,
    removeHookEntry,
    updateHookEntry,
  } = useWorkflowStore();
  const {
    isProcessing,
    clearHistory,
    isOpen: isRefinementOpen,
    openChat,
    closeChat,
    initConversation,
    loadConversationHistory,
    isCopilotEnabled,
    toggleCopilotEnabled,
    isCodexEnabled,
    toggleCodexEnabled,
    isRooCodeEnabled,
    toggleRooCodeEnabled,
  } = useRefinementStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [workflowNameError, setWorkflowNameError] = useState<string | null>(null);
  // Copilot integration (Beta)
  const [isCopilotExporting, setIsCopilotExporting] = useState(false);
  const [isCopilotRunning, setIsCopilotRunning] = useState(false);
  // Codex integration (Beta)
  const [isCodexExporting, setIsCodexExporting] = useState(false);
  const [isCodexRunning, setIsCodexRunning] = useState(false);
  // Roo Code integration (Beta)
  const [isRooCodeExporting, setIsRooCodeExporting] = useState(false);
  const [isRooCodeRunning, setIsRooCodeRunning] = useState(false);
  // Copilot Beta feature toggle is now managed by refinement-store
  // Copilot execution mode (persisted in localStorage, default: 'cli')
  const [copilotExecutionMode, setCopilotExecutionMode] = useState<CopilotExecutionMode>(() => {
    const stored = localStorage.getItem('cc-wf-studio.copilotExecutionMode');
    return (stored as CopilotExecutionMode) || 'cli';
  });
  const generationNameRequestIdRef = useRef<string | null>(null);

  // Workflow name validation pattern (lowercase, numbers, hyphens, underscores only)
  const WORKFLOW_NAME_PATTERN = /^[a-z0-9_-]*$/;

  // Handle workflow name change with validation
  const handleWorkflowNameChange = useCallback(
    (value: string) => {
      setWorkflowName(value);
      if (value && !WORKFLOW_NAME_PATTERN.test(value)) {
        setWorkflowNameError(t('toolbar.error.workflowNameInvalid'));
      } else {
        setWorkflowNameError(null);
      }
    },
    [setWorkflowName, t]
  );

  // Handle reset workflow
  const handleResetWorkflow = useCallback(() => {
    clearWorkflow();
    clearHistory(); // Clear AI refinement chat history
    setShowResetConfirm(false);
  }, [clearWorkflow, clearHistory]);

  // Handle toggle Copilot Beta feature - now uses refinement store

  // Handle Copilot execution mode change
  const handleCopilotExecutionModeChange = useCallback((mode: CopilotExecutionMode) => {
    setCopilotExecutionMode(mode);
    localStorage.setItem('cc-wf-studio.copilotExecutionMode', mode);
  }, []);

  const handleSave = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequired'),
      });
      return;
    }

    // Validate workflow name pattern (lowercase only)
    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsSaving(true);
    try {
      // Issue #89: Get subAgentFlows from store
      // Issue #413: Get slashCommandOptions from store
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      // Phase 5 (T024): Serialize workflow with conversation history and subAgentFlows
      // Issue #413: Include slashCommandOptions (context, model, hooks)
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        activeWorkflow?.conversationHistory,
        subAgentFlows,
        slashCommandOptions
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
          // Load description from workflow (default to empty string if not present)
          setWorkflowDescription(workflow.description || '');
          // Issue #413: Load slashCommandOptions (context, model, hooks, allowedTools) as unified object
          // Issue #426: Load disableModelInvocation
          setSlashCommandOptions({
            context: workflow.slashCommandOptions?.context ?? 'default',
            model: workflow.slashCommandOptions?.model ?? 'default',
            hooks: workflow.slashCommandOptions?.hooks,
            allowedTools: workflow.slashCommandOptions?.allowedTools,
            disableModelInvocation: workflow.slashCommandOptions?.disableModelInvocation,
            argumentHint: workflow.slashCommandOptions?.argumentHint,
          });
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
      } else if (message.type === 'RUN_AS_SLASH_COMMAND_SUCCESS') {
        setIsRunning(false);
      } else if (message.type === 'RUN_AS_SLASH_COMMAND_CANCELLED') {
        // User cancelled run - reset running state
        setIsRunning(false);
      } else if (message.type === 'ERROR') {
        // Reset loading states on any error
        setIsExporting(false);
        setIsRunning(false);
        setIsLoadingFile(false);
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [
    setNodes,
    setEdges,
    setActiveWorkflow,
    setWorkflowName,
    setWorkflowDescription,
    setSlashCommandOptions,
  ]);

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

    // Validate workflow name pattern (lowercase only)
    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsExporting(true);
    try {
      // Issue #89: Get subAgentFlows from store for export
      // Issue #413: Get slashCommandOptions from store for export
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      // Serialize workflow with subAgentFlows and slashCommandOptions
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined, // conversationHistory not needed for export
        subAgentFlows,
        slashCommandOptions
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

  const handleRunAsSlashCommand = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    // Validate workflow name pattern (lowercase only)
    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsRunning(true);
    try {
      // Issue #89: Get subAgentFlows from store for run
      // Issue #413: Get slashCommandOptions from store for run
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      // Serialize workflow with subAgentFlows and slashCommandOptions
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined, // conversationHistory not needed for run
        subAgentFlows,
        slashCommandOptions
      );

      // Validate workflow before run
      validateWorkflow(workflow);

      // Run as slash command
      await runAsSlashCommand(workflow);
      console.log('Workflow run as slash command:', workflowName);
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
      setIsRunning(false);
    }
  };

  // ============================================================================
  // Copilot Integration Handlers (Beta)
  // ============================================================================

  const handleCopilotExport = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsCopilotExporting(true);
    try {
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined,
        subAgentFlows,
        slashCommandOptions
      );

      validateWorkflow(workflow);

      // Export based on execution mode
      if (copilotExecutionMode === 'cli') {
        const result = await exportForCopilotCli(workflow);
        console.log('Workflow exported as skill for Copilot CLI:', result.skillPath);
      } else {
        const result = await exportForCopilot(workflow);
        console.log('Workflow exported for Copilot:', result.exportedFiles);
      }
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Copilot',
        details: error,
      });
    } finally {
      setIsCopilotExporting(false);
    }
  };

  const handleCopilotRun = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsCopilotRunning(true);
    try {
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined,
        subAgentFlows,
        slashCommandOptions
      );

      validateWorkflow(workflow);

      // Run based on execution mode
      if (copilotExecutionMode === 'cli') {
        const result = await runForCopilotCli(workflow);
        console.log('Workflow run for Copilot CLI:', result.workflowName);
      } else {
        const result = await runForCopilot(workflow);
        console.log('Workflow run for Copilot:', result.workflowName);
      }
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Copilot',
        details: error,
      });
    } finally {
      setIsCopilotRunning(false);
    }
  };

  // ============================================================================
  // Codex Integration Handlers (Beta)
  // ============================================================================

  const handleCodexExport = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsCodexExporting(true);
    try {
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined,
        subAgentFlows,
        slashCommandOptions
      );

      validateWorkflow(workflow);

      const result = await exportForCodexCli(workflow);
      console.log('Workflow exported as skill for Codex CLI:', result.skillPath);
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Codex',
        details: error,
      });
    } finally {
      setIsCodexExporting(false);
    }
  };

  const handleCodexRun = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsCodexRunning(true);
    try {
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined,
        subAgentFlows,
        slashCommandOptions
      );

      validateWorkflow(workflow);

      const result = await runForCodexCli(workflow);
      console.log('Workflow run for Codex CLI:', result.workflowName);
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Codex',
        details: error,
      });
    } finally {
      setIsCodexRunning(false);
    }
  };

  // ============================================================================
  // Roo Code Integration Handlers (Beta)
  // ============================================================================

  const handleRooCodeExport = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsRooCodeExporting(true);
    try {
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined,
        subAgentFlows,
        slashCommandOptions
      );

      validateWorkflow(workflow);

      const result = await exportForRooCode(workflow);
      console.log('Workflow exported as skill for Roo Code:', result.skillPath);
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Roo Code',
        details: error,
      });
    } finally {
      setIsRooCodeExporting(false);
    }
  };

  const handleRooCodeRun = async () => {
    if (!workflowName.trim()) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameRequiredForExport'),
      });
      return;
    }

    if (!WORKFLOW_NAME_PATTERN.test(workflowName)) {
      onError({
        code: 'VALIDATION_ERROR',
        message: t('toolbar.error.workflowNameInvalid'),
      });
      return;
    }

    setIsRooCodeRunning(true);
    try {
      const { subAgentFlows, workflowDescription, slashCommandOptions } =
        useWorkflowStore.getState();

      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName,
        workflowDescription || undefined,
        undefined,
        subAgentFlows,
        slashCommandOptions
      );

      validateWorkflow(workflow);

      const result = await runForRooCode(workflow);
      console.log('Workflow run for Roo Code:', result.workflowName);
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Roo Code',
        details: error,
      });
    } finally {
      setIsRooCodeRunning(false);
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
        workflowDescription || undefined,
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

      // Generate name with AI (pass requestId for cancellation support)
      const generatedName = await generateWorkflowName(
        workflowJson,
        targetLanguage,
        30000,
        currentRequestId
      );

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
    workflowDescription,
    activeWorkflow?.conversationHistory,
    locale,
    onError,
    setWorkflowName,
    t,
  ]);

  // Handle cancel name generation
  const handleCancelNameGeneration = useCallback(() => {
    const requestId = generationNameRequestIdRef.current;
    if (requestId) {
      cancelWorkflowNameGeneration(requestId);
    }
    generationNameRequestIdRef.current = null;
    setIsGeneratingName(false);
  }, []);

  // Handle toggling AI refinement chat
  const handleOpenRefinementChat = useCallback(() => {
    // If already open, just close it
    if (isRefinementOpen) {
      closeChat();
      return;
    }

    // Serialize current workflow state to set as active workflow
    // Include subAgentFlows to preserve SubAgentFlow references
    // Issue #413: Include slashCommandOptions configuration
    const currentWorkflow = serializeWorkflow(
      nodes,
      edges,
      workflowName || 'Untitled',
      workflowDescription || undefined,
      activeWorkflow?.conversationHistory,
      subAgentFlows,
      slashCommandOptions
    );
    setActiveWorkflow(currentWorkflow);

    // Load or initialize conversation history
    if (activeWorkflow?.conversationHistory) {
      loadConversationHistory(activeWorkflow.conversationHistory);
    } else {
      initConversation();
    }

    // Open chat
    openChat();
  }, [
    isRefinementOpen,
    closeChat,
    nodes,
    edges,
    workflowName,
    workflowDescription,
    activeWorkflow?.conversationHistory,
    subAgentFlows,
    slashCommandOptions,
    setActiveWorkflow,
    loadConversationHistory,
    initConversation,
    openChat,
  ]);

  return (
    <StyledTooltipProvider>
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          gap: '8px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          backgroundColor: 'var(--vscode-editor-background)',
        }}
      >
        {/* Workflow Group */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2px',
            flex: 1,
            minWidth: 0,
          }}
        >
          {/* Group Label */}
          <span
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              whiteSpace: 'nowrap',
            }}
          >
            Workflow
          </span>

          {/* Workflow Controls */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
            }}
          >
            {/* Workflow Name Display/Input with AI Generate Button */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <EditableNameField
                value={workflowName}
                onChange={handleWorkflowNameChange}
                placeholder={t('toolbar.workflowNamePlaceholder')}
                disabled={isGeneratingName}
                error={workflowNameError}
                dataTour="workflow-name-input"
                aiGeneration={{
                  isGenerating: isGeneratingName,
                  onGenerate: handleGenerateWorkflowName,
                  onCancel: handleCancelNameGeneration,
                  generateTooltip: t('toolbar.generateNameWithAI'),
                  cancelTooltip: t('cancel'),
                }}
              />
            </div>

            {/* Save Button */}
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

            {/* Load Button */}
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
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            width: '1px',
            alignSelf: 'stretch',
            backgroundColor: 'var(--vscode-panel-border)',
          }}
        />

        {/* Slash Command Section - Layout changes based on Copilot/Codex Beta enabled */}
        {isCopilotEnabled || isCodexEnabled || isRooCodeEnabled ? (
          /* Combined layout when Copilot Beta is enabled */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
            }}
          >
            {/* Group Label */}
            <span
              style={{
                fontSize: '10px',
                color: 'var(--vscode-descriptionForeground)',
                whiteSpace: 'nowrap',
              }}
            >
              Slash Command / Skill
            </span>

            {/* Two-column layout with divider */}
            <div
              style={{
                display: 'flex',
                alignItems: 'stretch',
                gap: '0',
              }}
            >
              {/* Claude Code Column */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <span
                  style={{
                    fontSize: '9px',
                    color: 'var(--vscode-descriptionForeground)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  Claude Code
                </span>
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                  <div style={{ display: 'flex' }}>
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
                        borderRadius: '2px 0 0 2px',
                        cursor: isExporting ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        opacity: isExporting ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        borderRight: '1px solid var(--vscode-button-foreground)',
                      }}
                    >
                      {isCompact ? (
                        <SquareSlash size={16} />
                      ) : isExporting ? (
                        t('toolbar.exporting')
                      ) : (
                        t('toolbar.export')
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleRunAsSlashCommand}
                      disabled={isRunning}
                      data-tour="run-button"
                      style={{
                        padding: isCompact ? '4px 8px' : '4px 12px',
                        backgroundColor: 'var(--vscode-button-background)',
                        color: 'var(--vscode-button-foreground)',
                        border: 'none',
                        borderRadius: '0 2px 2px 0',
                        cursor: isRunning ? 'not-allowed' : 'pointer',
                        fontSize: '13px',
                        opacity: isRunning ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                      }}
                    >
                      {isCompact ? (
                        <Play size={16} />
                      ) : isRunning ? (
                        t('toolbar.running')
                      ) : (
                        t('toolbar.run')
                      )}
                    </button>
                  </div>
                  <SlashCommandOptionsDropdown
                    context={slashCommandOptions.context ?? 'default'}
                    onContextChange={setSlashCommandContext}
                    model={slashCommandOptions.model ?? 'default'}
                    onModelChange={setSlashCommandModel}
                    hooks={slashCommandOptions.hooks ?? {}}
                    onAddHookEntry={addHookEntry}
                    onRemoveHookEntry={removeHookEntry}
                    onUpdateHookEntry={updateHookEntry}
                    allowedTools={slashCommandOptions.allowedTools ?? ''}
                    onAllowedToolsChange={setSlashCommandAllowedTools}
                    disableModelInvocation={slashCommandOptions.disableModelInvocation ?? false}
                    onDisableModelInvocationChange={setSlashCommandDisableModelInvocation}
                    argumentHint={slashCommandOptions.argumentHint ?? ''}
                    onArgumentHintChange={setSlashCommandArgumentHint}
                  />
                </div>
              </div>

              {/* Vertical Divider - shown when Copilot is enabled */}
              {isCopilotEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Copilot Column - shown when Copilot is enabled */}
              {isCopilotEnabled && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--vscode-descriptionForeground)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Copilot
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleCopilotExport}
                        disabled={isCopilotExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isCopilotExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCopilotExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isCopilotExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopilotRun}
                        disabled={isCopilotRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isCopilotRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCopilotRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isCopilotRunning ? (
                          t('toolbar.running')
                        ) : (
                          t('toolbar.run')
                        )}
                      </button>
                    </div>
                    <CopilotExecutionModeDropdown
                      mode={copilotExecutionMode}
                      onModeChange={handleCopilotExecutionModeChange}
                    />
                  </div>
                </div>
              )}

              {/* Vertical Divider - shown when Codex is enabled */}
              {isCodexEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Codex Column - shown when Codex is enabled */}
              {isCodexEnabled && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--vscode-descriptionForeground)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Codex
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleCodexExport}
                        disabled={isCodexExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isCodexExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCodexExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isCodexExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCodexRun}
                        disabled={isCodexRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isCodexRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCodexRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isCodexRunning ? (
                          t('toolbar.running')
                        ) : (
                          t('toolbar.run')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Divider - shown when Roo Code is enabled */}
              {isRooCodeEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Roo Code Column - shown when Roo Code is enabled */}
              {isRooCodeEnabled && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '2px',
                  }}
                >
                  <span
                    style={{
                      fontSize: '9px',
                      color: 'var(--vscode-descriptionForeground)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    Roo Code
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleRooCodeExport}
                        disabled={isRooCodeExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isRooCodeExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isRooCodeExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isRooCodeExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleRooCodeRun}
                        disabled={isRooCodeRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isRooCodeRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isRooCodeRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isRooCodeRunning ? (
                          t('toolbar.running')
                        ) : (
                          t('toolbar.run')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* Original layout when Copilot Beta is disabled */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
            }}
          >
            {/* Group Label */}
            <span
              style={{
                fontSize: '10px',
                color: 'var(--vscode-descriptionForeground)',
                whiteSpace: 'nowrap',
              }}
            >
              Slash Command
            </span>

            {/* Button Group */}
            <div
              style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex' }}>
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
                    borderRadius: '2px 0 0 2px',
                    cursor: isExporting ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: isExporting ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderRight: '1px solid var(--vscode-button-foreground)',
                  }}
                >
                  {isCompact ? (
                    <SquareSlash size={16} />
                  ) : isExporting ? (
                    t('toolbar.exporting')
                  ) : (
                    t('toolbar.export')
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleRunAsSlashCommand}
                  disabled={isRunning}
                  data-tour="run-button"
                  style={{
                    padding: isCompact ? '4px 8px' : '4px 12px',
                    backgroundColor: 'var(--vscode-button-background)',
                    color: 'var(--vscode-button-foreground)',
                    border: 'none',
                    borderRadius: '0 2px 2px 0',
                    cursor: isRunning ? 'not-allowed' : 'pointer',
                    fontSize: '13px',
                    opacity: isRunning ? 0.6 : 1,
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {isCompact ? (
                    <Play size={16} />
                  ) : isRunning ? (
                    t('toolbar.running')
                  ) : (
                    t('toolbar.run')
                  )}
                </button>
              </div>
              <SlashCommandOptionsDropdown
                context={slashCommandOptions.context ?? 'default'}
                onContextChange={setSlashCommandContext}
                model={slashCommandOptions.model ?? 'default'}
                onModelChange={setSlashCommandModel}
                hooks={slashCommandOptions.hooks ?? {}}
                onAddHookEntry={addHookEntry}
                onRemoveHookEntry={removeHookEntry}
                onUpdateHookEntry={updateHookEntry}
                allowedTools={slashCommandOptions.allowedTools ?? ''}
                onAllowedToolsChange={setSlashCommandAllowedTools}
                disableModelInvocation={slashCommandOptions.disableModelInvocation ?? false}
                onDisableModelInvocationChange={setSlashCommandDisableModelInvocation}
                argumentHint={slashCommandOptions.argumentHint ?? ''}
                onArgumentHintChange={setSlashCommandArgumentHint}
              />
            </div>
          </div>
        )}

        {/* Divider */}
        <div
          style={{
            width: '1px',
            alignSelf: 'stretch',
            backgroundColor: 'var(--vscode-panel-border)',
          }}
        />

        {/* Other Group */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: '2px',
          }}
        >
          {/* Group Label */}
          <span
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              whiteSpace: 'nowrap',
            }}
          >
            Other
          </span>

          {/* Button Group */}
          <div
            style={{
              display: 'flex',
              gap: '8px',
            }}
          >
            {/* AI Edit Button */}
            <button
              type="button"
              onClick={handleOpenRefinementChat}
              data-tour="ai-refine-button"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: isCompact ? '0' : '4px',
                padding: isCompact ? '4px 8px' : '4px 12px',
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
                border: 'none',
                borderRadius: '2px',
                cursor: 'pointer',
                fontSize: '13px',
                whiteSpace: 'nowrap',
              }}
            >
              <Sparkles size={14} />
              {!isCompact && t('toolbar.refineWithAI')}
            </button>

            {/* More Actions Dropdown */}
            <MoreActionsDropdown
              onShareToSlack={onShareToSlack}
              onResetWorkflow={() => setShowResetConfirm(true)}
              onStartTour={onStartTour}
              isFocusMode={isFocusMode}
              onToggleFocusMode={toggleFocusMode}
              isCopilotEnabled={isCopilotEnabled}
              onToggleCopilotBeta={toggleCopilotEnabled}
              isCodexEnabled={isCodexEnabled}
              onToggleCodexBeta={toggleCodexEnabled}
              isRooCodeEnabled={isRooCodeEnabled}
              onToggleRooCodeBeta={toggleRooCodeEnabled}
              open={moreActionsOpen}
              onOpenChange={onMoreActionsOpenChange}
            />
          </div>
        </div>

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
