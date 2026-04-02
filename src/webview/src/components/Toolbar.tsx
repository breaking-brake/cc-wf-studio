/**
 * Claude Code Workflow Studio - Toolbar Component
 *
 * Provides Save and Load functionality for workflows
 */

import type { Workflow } from '@shared/types/messages';
import { FileDown, MessageSquare, Play, Save, Sparkles, Square, SquareSlash } from 'lucide-react';
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
  exportForAntigravity,
  exportForCodexCli,
  exportForCopilot,
  exportForCopilotCli,
  exportForCursor,
  exportForGeminiCli,
  exportForRooCode,
  runAsSlashCommand,
  runForAntigravity,
  runForCodexCli,
  runForCopilot,
  runForCopilotCli,
  runForCursor,
  runForGeminiCli,
  runForRooCode,
  saveWorkflow,
} from '../services/vscode-bridge';
import {
  deserializeWorkflow,
  serializeWorkflow,
  validateWorkflow,
} from '../services/workflow-service';
import { useCommentaryStore } from '../stores/commentary-store';
import { useRefinementStore } from '../stores/refinement-store';
import { useWorkflowStore } from '../stores/workflow-store';
import { EditableNameField } from './common/EditableNameField';
import { ProcessingOverlay } from './common/ProcessingOverlay';
import { StyledTooltipProvider } from './common/StyledTooltip';
import { ClaudeApiUploadDialog } from './dialogs/ClaudeApiUploadDialog';
import { ConfirmDialog } from './dialogs/ConfirmDialog';
import { WhatsNewDialog } from './dialogs/WhatsNewDialog';
import { CommentaryOptionsDropdown } from './toolbar/CommentaryOptionsDropdown';
import { MoreActionsDropdown } from './toolbar/MoreActionsDropdown';
import { SlashCommandOptionsDropdown } from './toolbar/SlashCommandOptionsDropdown';

interface ToolbarProps {
  onError: (error: { code: string; message: string; details?: unknown }) => void;
  onStartTour: () => void;
  onShareToSlack: () => void;
  moreActionsOpen?: boolean;
  onMoreActionsOpenChange?: (open: boolean) => void;
  initialUnreadReleaseCount?: number;
  showWhatsNewBadge?: boolean;
  onShowWhatsNewBadgeChange?: (show: boolean) => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  onError,
  onStartTour,
  onShareToSlack,
  moreActionsOpen,
  onMoreActionsOpenChange,
  initialUnreadReleaseCount = 0,
  showWhatsNewBadge = true,
  onShowWhatsNewBadgeChange,
}) => {
  const { t, locale } = useTranslation();
  const isCompact = useIsCompactMode();
  const {
    nodes,
    edges,
    setCanvas,
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
    mcpServerRunning,
    mcpServerPort,
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
    isCopilotChatEnabled,
    toggleCopilotChatEnabled,
    isCopilotCliEnabled,
    toggleCopilotCliEnabled,
    isCodexEnabled,
    toggleCodexEnabled,
    isRooCodeEnabled,
    toggleRooCodeEnabled,
    isGeminiEnabled,
    toggleGeminiEnabled,
    isAntigravityEnabled,
    toggleAntigravityEnabled,
    isCursorEnabled,
    toggleCursorEnabled,
  } = useRefinementStore();
  const {
    isFeatureEnabled: isCommentaryFeatureEnabled,
    toggleFeatureEnabled: toggleCommentaryFeature,
    isEnabled: isCommentaryEnabled,
    toggleEnabled: toggleCommentary,
    selectedProvider: commentaryProvider,
    setProvider: setCommentaryProvider,
    selectedCopilotModel: commentaryCopilotModel,
    setCopilotModel: setCommentaryCopilotModel,
    availableCopilotModels: commentaryAvailableCopilotModels,
    isFetchingCopilotModels: isCommentaryFetchingModels,
    copilotModelsError: commentaryCopilotModelsError,
    fetchCopilotModels: fetchCommentaryCopilotModels,
    language: commentaryLanguage,
    setLanguage: setCommentaryLanguage,
  } = useCommentaryStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [isLoadingFile, setIsLoadingFile] = useState(false);
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [workflowNameError, setWorkflowNameError] = useState<string | null>(null);
  // Copilot Chat integration
  const [isCopilotChatExporting, setIsCopilotChatExporting] = useState(false);
  const [isCopilotChatRunning, setIsCopilotChatRunning] = useState(false);

  // Sync commentary state to Extension Host on mount (restores localStorage state after reload)
  const commentarySyncedRef = useRef(false);
  useEffect(() => {
    if (commentarySyncedRef.current) return;
    commentarySyncedRef.current = true;
    if (isCommentaryFeatureEnabled && isCommentaryEnabled) {
      vscode.postMessage({
        type: 'TOGGLE_COMMENTARY',
        payload: {
          enabled: true,
          provider: commentaryProvider,
          copilotModel: commentaryCopilotModel || undefined,
          language: commentaryLanguage,
        },
      });
    }
  }, [
    isCommentaryFeatureEnabled,
    isCommentaryEnabled,
    commentaryProvider,
    commentaryCopilotModel,
    commentaryLanguage,
  ]);

  // Copilot CLI integration
  const [isCopilotCliExporting, setIsCopilotCliExporting] = useState(false);
  const [isCopilotCliRunning, setIsCopilotCliRunning] = useState(false);
  // Codex integration
  const [isCodexExporting, setIsCodexExporting] = useState(false);
  const [isCodexRunning, setIsCodexRunning] = useState(false);
  // Roo Code integration
  const [isRooCodeExporting, setIsRooCodeExporting] = useState(false);
  const [isRooCodeRunning, setIsRooCodeRunning] = useState(false);
  // Gemini CLI integration
  const [isGeminiExporting, setIsGeminiExporting] = useState(false);
  const [isGeminiRunning, setIsGeminiRunning] = useState(false);
  // Antigravity integration
  const [isAntigravityExporting, setIsAntigravityExporting] = useState(false);
  const [isAntigravityRunning, setIsAntigravityRunning] = useState(false);
  // Cursor integration
  const [isCursorExporting, setIsCursorExporting] = useState(false);
  const [isCursorRunning, setIsCursorRunning] = useState(false);
  // Claude API Upload
  const [isClaudeApiUploadDialogOpen, setIsClaudeApiUploadDialogOpen] = useState(false);
  // What's New
  const [isWhatsNewDialogOpen, setIsWhatsNewDialogOpen] = useState(false);
  const [unreadReleaseCount, setUnreadReleaseCount] = useState(initialUnreadReleaseCount);

  useEffect(() => {
    setUnreadReleaseCount(initialUnreadReleaseCount);
  }, [initialUnreadReleaseCount]);

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
          setCanvas(loadedNodes, loadedEdges);
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
    setCanvas,
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
      const { isHighlightEnabled } = useWorkflowStore.getState();
      vscode.postMessage({
        type: 'EXPORT_WORKFLOW',
        payload: { workflow, highlightEnabled: isHighlightEnabled },
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
      const { isHighlightEnabled } = useWorkflowStore.getState();
      await runAsSlashCommand(workflow, { highlightEnabled: isHighlightEnabled });
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
  // Copilot Integration Handlers
  // ============================================================================

  const handleCopilotChatExport = async () => {
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

    setIsCopilotChatExporting(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await exportForCopilot(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow exported for Copilot Chat:', result.exportedFiles);
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Copilot Chat',
        details: error,
      });
    } finally {
      setIsCopilotChatExporting(false);
    }
  };

  const handleCopilotChatRun = async () => {
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

    setIsCopilotChatRunning(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await runForCopilot(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow run for Copilot Chat:', result.workflowName);
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Copilot Chat',
        details: error,
      });
    } finally {
      setIsCopilotChatRunning(false);
    }
  };

  const handleCopilotCliExport = async () => {
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

    setIsCopilotCliExporting(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await exportForCopilotCli(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow exported as skill for Copilot CLI:', result.skillPath);
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Copilot CLI',
        details: error,
      });
    } finally {
      setIsCopilotCliExporting(false);
    }
  };

  const handleCopilotCliRun = async () => {
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

    setIsCopilotCliRunning(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await runForCopilotCli(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow run for Copilot CLI:', result.workflowName);
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Copilot CLI',
        details: error,
      });
    } finally {
      setIsCopilotCliRunning(false);
    }
  };

  // ============================================================================
  // Codex Integration Handlers
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await exportForCodexCli(workflow, { highlightEnabled: isHighlightEnabled });
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await runForCodexCli(workflow, { highlightEnabled: isHighlightEnabled });
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
  // Roo Code Integration Handlers
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await exportForRooCode(workflow, { highlightEnabled: isHighlightEnabled });
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await runForRooCode(workflow, { highlightEnabled: isHighlightEnabled });
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

  // ============================================================================
  // Gemini CLI Integration Handlers
  // ============================================================================

  const handleGeminiExport = async () => {
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

    setIsGeminiExporting(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await exportForGeminiCli(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow exported as skill for Gemini CLI:', result.skillPath);
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Gemini CLI',
        details: error,
      });
    } finally {
      setIsGeminiExporting(false);
    }
  };

  const handleGeminiRun = async () => {
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

    setIsGeminiRunning(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await runForGeminiCli(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow run for Gemini CLI:', result.workflowName);
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Gemini CLI',
        details: error,
      });
    } finally {
      setIsGeminiRunning(false);
    }
  };

  // ============================================================================
  // Antigravity Integration Handlers
  // ============================================================================

  const handleAntigravityExport = async () => {
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

    setIsAntigravityExporting(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await exportForAntigravity(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow exported as skill for Antigravity:', result.skillPath);
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Antigravity',
        details: error,
      });
    } finally {
      setIsAntigravityExporting(false);
    }
  };

  const handleAntigravityRun = async () => {
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

    setIsAntigravityRunning(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await runForAntigravity(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow run for Antigravity:', result.workflowName);
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Antigravity',
        details: error,
      });
    } finally {
      setIsAntigravityRunning(false);
    }
  };

  // ============================================================================
  // Cursor Integration Handlers
  // ============================================================================

  const handleCursorExport = async () => {
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

    setIsCursorExporting(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await exportForCursor(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow exported as skill for Cursor:', result.skillPath);
    } catch (error) {
      onError({
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export for Cursor',
        details: error,
      });
    } finally {
      setIsCursorExporting(false);
    }
  };

  const handleCursorRun = async () => {
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

    setIsCursorRunning(true);
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

      const { isHighlightEnabled } = useWorkflowStore.getState();
      const result = await runForCursor(workflow, { highlightEnabled: isHighlightEnabled });
      console.log('Workflow run for Cursor:', result.workflowName);
    } catch (error) {
      onError({
        code: 'RUN_FAILED',
        message: error instanceof Error ? error.message : 'Failed to run for Cursor',
        details: error,
      });
    } finally {
      setIsCursorRunning(false);
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

  const renderMcpBadge = () => {
    if (!mcpServerRunning || !mcpServerPort) return null;
    return (
      <>
        <span
          title={`MCP Server running on Port:${mcpServerPort}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            fontSize: '10px',
            color: '#22c55e',
            marginLeft: '14px',
          }}
        >
          cc-wf-studio MCP{' '}
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: '#22c55e',
            }}
          />
          Port:{mcpServerPort}
        </span>
        <button
          type="button"
          onClick={() => vscode.postMessage({ type: 'STOP_MCP_SERVER' })}
          title="Stop MCP Server"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '1px 6px',
            fontSize: '10px',
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none',
            borderRadius: '3px',
            cursor: 'pointer',
            marginLeft: '4px',
          }}
        >
          <Square size={8} />
          Stop
        </button>
      </>
    );
  };

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
        {isCopilotChatEnabled ||
        isCopilotCliEnabled ||
        isCodexEnabled ||
        isRooCodeEnabled ||
        isGeminiEnabled ||
        isAntigravityEnabled ||
        isCursorEnabled ? (
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
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--vscode-descriptionForeground)',
                  whiteSpace: 'nowrap',
                }}
              >
                Slash Command / Skill
              </span>
              {renderMcpBadge()}
            </div>

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
                  {/* Commentary AI Toggle + Options (visible when feature enabled in More menu) */}
                  {isCommentaryFeatureEnabled && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                      <button
                        type="button"
                        onClick={() => {
                          toggleCommentary();
                          const newEnabled = !isCommentaryEnabled;
                          vscode.postMessage({
                            type: 'TOGGLE_COMMENTARY',
                            payload: {
                              enabled: newEnabled,
                              provider: commentaryProvider,
                              copilotModel: commentaryCopilotModel || undefined,
                              language: commentaryLanguage,
                            },
                          });
                        }}
                        style={{
                          background: isCommentaryEnabled
                            ? 'var(--vscode-button-background)'
                            : 'transparent',
                          color: isCommentaryEnabled
                            ? 'var(--vscode-button-foreground)'
                            : 'var(--vscode-descriptionForeground)',
                          border: '1px solid var(--vscode-panel-border)',
                          borderRadius: '3px',
                          cursor: 'pointer',
                          padding: '3px 6px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                        }}
                        title={t('commentary.toggle')}
                      >
                        <MessageSquare size={12} />
                      </button>
                      <CommentaryOptionsDropdown
                        provider={commentaryProvider}
                        onProviderChange={setCommentaryProvider}
                        copilotModel={commentaryCopilotModel}
                        onCopilotModelChange={setCommentaryCopilotModel}
                        availableCopilotModels={commentaryAvailableCopilotModels}
                        isFetchingModels={isCommentaryFetchingModels}
                        modelsError={commentaryCopilotModelsError}
                        onFetchModels={fetchCommentaryCopilotModels}
                        language={commentaryLanguage}
                        onLanguageChange={setCommentaryLanguage}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Vertical Divider - shown when Copilot Chat is enabled */}
              {isCopilotChatEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Copilot Chat Column - shown when Copilot Chat is enabled */}
              {isCopilotChatEnabled && (
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
                    Copilot Chat
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleCopilotChatExport}
                        disabled={isCopilotChatExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isCopilotChatExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCopilotChatExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isCopilotChatExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopilotChatRun}
                        disabled={isCopilotChatRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isCopilotChatRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCopilotChatRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isCopilotChatRunning ? (
                          t('toolbar.running')
                        ) : (
                          t('toolbar.run')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Divider - shown when Copilot CLI is enabled */}
              {isCopilotCliEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Copilot CLI Column - shown when Copilot CLI is enabled */}
              {isCopilotCliEnabled && (
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
                    Copilot CLI
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleCopilotCliExport}
                        disabled={isCopilotCliExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isCopilotCliExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCopilotCliExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isCopilotCliExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopilotCliRun}
                        disabled={isCopilotCliRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isCopilotCliRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCopilotCliRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isCopilotCliRunning ? (
                          t('toolbar.running')
                        ) : (
                          t('toolbar.run')
                        )}
                      </button>
                    </div>
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
                    Codex CLI
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

              {/* Vertical Divider - shown when Gemini CLI is enabled */}
              {isGeminiEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Gemini CLI Column - shown when Gemini CLI is enabled */}
              {isGeminiEnabled && (
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
                    Gemini CLI
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleGeminiExport}
                        disabled={isGeminiExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isGeminiExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isGeminiExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isGeminiExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleGeminiRun}
                        disabled={isGeminiRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isGeminiRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isGeminiRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isGeminiRunning ? (
                          t('toolbar.running')
                        ) : (
                          t('toolbar.run')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Divider - shown when Antigravity is enabled */}
              {isAntigravityEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Antigravity Column - shown when Antigravity is enabled */}
              {isAntigravityEnabled && (
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
                    Antigravity
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleAntigravityExport}
                        disabled={isAntigravityExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isAntigravityExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isAntigravityExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isAntigravityExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleAntigravityRun}
                        disabled={isAntigravityRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isAntigravityRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isAntigravityRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isAntigravityRunning ? (
                          t('toolbar.running')
                        ) : (
                          t('toolbar.run')
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Vertical Divider - shown when Cursor is enabled */}
              {isCursorEnabled && (
                <div
                  style={{
                    width: '1px',
                    backgroundColor: 'var(--vscode-panel-border)',
                    margin: '0 8px',
                    alignSelf: 'stretch',
                  }}
                />
              )}

              {/* Cursor Column - shown when Cursor is enabled */}
              {isCursorEnabled && (
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
                    Cursor
                  </span>
                  <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <div style={{ display: 'flex' }}>
                      <button
                        type="button"
                        onClick={handleCursorExport}
                        disabled={isCursorExporting}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '2px 0 0 2px',
                          cursor: isCursorExporting ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCursorExporting ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          borderRight: '1px solid var(--vscode-button-foreground)',
                        }}
                      >
                        {isCompact ? (
                          <SquareSlash size={16} />
                        ) : isCursorExporting ? (
                          t('toolbar.exporting')
                        ) : (
                          t('toolbar.export')
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleCursorRun}
                        disabled={isCursorRunning}
                        style={{
                          padding: isCompact ? '4px 8px' : '4px 12px',
                          backgroundColor: 'var(--vscode-button-background)',
                          color: 'var(--vscode-button-foreground)',
                          border: 'none',
                          borderRadius: '0 2px 2px 0',
                          cursor: isCursorRunning ? 'not-allowed' : 'pointer',
                          fontSize: '13px',
                          opacity: isCursorRunning ? 0.6 : 1,
                          whiteSpace: 'nowrap',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        {isCompact ? (
                          <Play size={16} />
                        ) : isCursorRunning ? (
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
          /* Original layout when Copilot is disabled */
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: '2px',
            }}
          >
            {/* Group Label */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span
                style={{
                  fontSize: '10px',
                  color: 'var(--vscode-descriptionForeground)',
                  whiteSpace: 'nowrap',
                }}
              >
                Slash Command
              </span>
              {renderMcpBadge()}
            </div>

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
              {/* Commentary AI Toggle + Options (compact, visible when feature enabled) */}
              {isCommentaryFeatureEnabled && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      toggleCommentary();
                      const newEnabled = !isCommentaryEnabled;
                      vscode.postMessage({
                        type: 'TOGGLE_COMMENTARY',
                        payload: {
                          enabled: newEnabled,
                          provider: commentaryProvider,
                          copilotModel: commentaryCopilotModel || undefined,
                          language: commentaryLanguage,
                        },
                      });
                    }}
                    style={{
                      background: isCommentaryEnabled
                        ? 'var(--vscode-button-background)'
                        : 'transparent',
                      color: isCommentaryEnabled
                        ? 'var(--vscode-button-foreground)'
                        : 'var(--vscode-descriptionForeground)',
                      border: '1px solid var(--vscode-panel-border)',
                      borderRadius: '3px',
                      cursor: 'pointer',
                      padding: '3px 6px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontSize: '11px',
                    }}
                    title={t('commentary.toggle')}
                  >
                    <MessageSquare size={12} />
                  </button>
                  <CommentaryOptionsDropdown
                    provider={commentaryProvider}
                    onProviderChange={setCommentaryProvider}
                    copilotModel={commentaryCopilotModel}
                    onCopilotModelChange={setCommentaryCopilotModel}
                    availableCopilotModels={commentaryAvailableCopilotModels}
                    isFetchingModels={isCommentaryFetchingModels}
                    modelsError={commentaryCopilotModelsError}
                    onFetchModels={fetchCommentaryCopilotModels}
                    language={commentaryLanguage}
                    onLanguageChange={setCommentaryLanguage}
                  />
                </div>
              )}
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
              onOpenClaudeApi={() => setIsClaudeApiUploadDialogOpen(true)}
              onShareToSlack={onShareToSlack}
              onResetWorkflow={() => setShowResetConfirm(true)}
              onStartTour={onStartTour}
              isFocusMode={isFocusMode}
              onToggleFocusMode={toggleFocusMode}
              isCopilotChatEnabled={isCopilotChatEnabled}
              onToggleCopilotChat={toggleCopilotChatEnabled}
              isCopilotCliEnabled={isCopilotCliEnabled}
              onToggleCopilotCli={toggleCopilotCliEnabled}
              isCodexEnabled={isCodexEnabled}
              onToggleCodexBeta={toggleCodexEnabled}
              isRooCodeEnabled={isRooCodeEnabled}
              onToggleRooCodeBeta={toggleRooCodeEnabled}
              isGeminiEnabled={isGeminiEnabled}
              onToggleGeminiBeta={toggleGeminiEnabled}
              isAntigravityEnabled={isAntigravityEnabled}
              onToggleAntigravityBeta={toggleAntigravityEnabled}
              isCursorEnabled={isCursorEnabled}
              onToggleCursorBeta={toggleCursorEnabled}
              isCommentaryEnabled={isCommentaryFeatureEnabled}
              onToggleCommentary={toggleCommentaryFeature}
              onOpenWhatsNew={() => setIsWhatsNewDialogOpen(true)}
              unreadReleaseCount={unreadReleaseCount}
              open={moreActionsOpen}
              onOpenChange={onMoreActionsOpenChange}
            />
          </div>
        </div>

        {/* Processing Overlay (Phase 3.10) */}
        <ProcessingOverlay isVisible={isProcessing} />

        {/* Claude API Upload Dialog */}
        <ClaudeApiUploadDialog
          isOpen={isClaudeApiUploadDialogOpen}
          onClose={() => setIsClaudeApiUploadDialogOpen(false)}
        />

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

        {/* What's New Dialog */}
        <WhatsNewDialog
          isOpen={isWhatsNewDialogOpen}
          onClose={() => {
            setIsWhatsNewDialogOpen(false);
            setUnreadReleaseCount(0);
          }}
          showBadge={showWhatsNewBadge}
          onShowBadgeChange={(show) => {
            onShowWhatsNewBadgeChange?.(show);
            if (!show) {
              setUnreadReleaseCount(0);
            }
          }}
        />
      </div>
    </StyledTooltipProvider>
  );
};
