/**
 * Claude Code Workflow Studio - Main App Component
 *
 * Root component for the Webview UI with 3-column layout
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import * as Collapsible from '@radix-ui/react-collapsible';
import type {
  AntigravityMcpRefreshNeededPayload,
  ApplyWorkflowFromMcpPayload,
  ErrorPayload,
  GetCurrentWorkflowRequestPayload,
  HighlightGroupNodePayload,
  ImportWorkflowFromSlackPayload,
  InitialStatePayload,
  McpServerStatusPayload,
  OverviewModeInitPayload,
  OverviewParseErrorPayload,
  OverviewUpdatePayload,
  PlannedSubAgentFile,
  Workflow,
} from '@shared/types/messages';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommentaryPanel } from './components/CommentaryPanel';
import { ProcessingOverlay } from './components/common/ProcessingOverlay';
import { SimpleOverlay } from './components/common/SimpleOverlay';
import { Spinner } from './components/common/Spinner';
import { AntigravityMcpRefreshDialog } from './components/dialogs/AntigravityMcpRefreshDialog';
import { ConfirmDialog } from './components/dialogs/ConfirmDialog';
import { DiffPreviewDialog } from './components/dialogs/DiffPreviewDialog';
import { RefinementChatPanel } from './components/dialogs/RefinementChatPanel';
import { SampleWorkflowDialog } from './components/dialogs/SampleWorkflowDialog';
import { SlackConnectionRequiredDialog } from './components/dialogs/SlackConnectionRequiredDialog';
import { SlackManualTokenDialog } from './components/dialogs/SlackManualTokenDialog';
import { SlackShareDialog } from './components/dialogs/SlackShareDialog';
import { SubAgentFlowDialog } from './components/dialogs/SubAgentFlowDialog';
import { WhatsNewDialog } from './components/dialogs/WhatsNewDialog';
import { ErrorNotification } from './components/ErrorNotification';
import { NodePalette } from './components/NodePalette';
import { OverviewMode } from './components/overview/OverviewMode';
import { PropertyOverlay } from './components/PropertyOverlay';
import { Toolbar } from './components/Toolbar';
import { Tour } from './components/Tour';
import { WorkflowEditor } from './components/WorkflowEditor';
import { useCollapsiblePanel } from './hooks/useCollapsiblePanel';
import { useIsCompactMode } from './hooks/useWindowWidth';
import { useTranslation } from './i18n/i18n-context';
import { vscode } from './main';
import { deserializeWorkflow, serializeWorkflow } from './services/workflow-service';
import { useCommentaryStore } from './stores/commentary-store';
import { useRefinementStore } from './stores/refinement-store';
import { getCanvasRevision, hasUnsavedChanges, useWorkflowStore } from './stores/workflow-store';
import type { RefinementChatState } from './types/refinement-chat-state';
import { computeWorkflowDiff, type WorkflowDiffSummary } from './utils/workflow-diff';

const App: React.FC = () => {
  const { t } = useTranslation();
  const {
    pendingDeleteNodeIds,
    confirmDeleteNodes,
    cancelDeleteNodes,
    activeWorkflow,
    nodes,
    edges,
    workflowName,
    workflowDescription,
    subAgentFlows,
    setCanvas,
    setWorkflowName,
    setWorkflowDescription,
    setActiveWorkflow,
    updateActiveWorkflowMetadata,
    isPropertyOverlayOpen,
    selectedNodeId,
    activeSubAgentFlowId,
    setActiveSubAgentFlowId,
  } = useWorkflowStore();
  // Commentary AI store
  const { isEnabled: isCommentaryEnabled } = useCommentaryStore();
  const handleCloseCommentaryPanel = useCallback(() => {
    useCommentaryStore.getState().toggleEnabled();
    // Notify extension
    // biome-ignore lint/suspicious/noExplicitAny: vscode postMessage typing
    (window as any).vscodeApi?.postMessage?.({
      type: 'TOGGLE_COMMENTARY',
      payload: { enabled: false },
    });
  }, []);

  // Get all refinement store state and actions for main workflow chat
  const refinementStore = useRefinementStore();
  const { isOpen: isRefinementPanelOpen, isProcessing } = refinementStore;

  // Build mainChatState from refinement store (for main workflow RefinementChatPanel)
  const mainChatState: RefinementChatState = useMemo(
    () => ({
      conversationHistory: refinementStore.conversationHistory,
      isProcessing: refinementStore.isProcessing,
      sessionStatus: refinementStore.sessionStatus,
      currentInput: refinementStore.currentInput,
      currentRequestId: refinementStore.currentRequestId,
      setInput: refinementStore.setInput,
      canSend: refinementStore.canSend,
      addUserMessage: refinementStore.addUserMessage,
      addLoadingAiMessage: refinementStore.addLoadingAiMessage,
      updateMessageContent: refinementStore.updateMessageContent,
      updateMessageLoadingState: refinementStore.updateMessageLoadingState,
      updateMessageErrorState: refinementStore.updateMessageErrorState,
      updateMessageToolInfo: refinementStore.updateMessageToolInfo,
      removeMessage: refinementStore.removeMessage,
      clearHistory: refinementStore.clearHistory,
      startProcessing: refinementStore.startProcessing,
      finishProcessing: refinementStore.finishProcessing,
      handleRefinementSuccess: refinementStore.handleRefinementSuccess,
      handleRefinementFailed: refinementStore.handleRefinementFailed,
      shouldShowWarning: refinementStore.shouldShowWarning,
    }),
    [refinementStore]
  );

  const handleCloseRefinementPanel = useCallback(() => {
    refinementStore.closeChat();
  }, [refinementStore]);

  // Issue #384: Sync conversation history from refinement-store to workflow-store
  // This ensures that conversation history is preserved when the refinement panel
  // is collapsed/expanded, and is included when the workflow is saved.
  const prevHistoryRef = useRef(refinementStore.conversationHistory);
  useEffect(() => {
    const conversationHistory = refinementStore.conversationHistory;

    // Skip if history hasn't changed (same reference)
    if (conversationHistory === prevHistoryRef.current) {
      return;
    }
    prevHistoryRef.current = conversationHistory;

    // Only sync if we have both an activeWorkflow and conversation history
    if (activeWorkflow && conversationHistory) {
      updateActiveWorkflowMetadata({ conversationHistory });
    }
  }, [refinementStore.conversationHistory, activeWorkflow, updateActiveWorkflowMetadata]);

  // Issue #388: Sync activeWorkflow when canvas (nodes/edges) changes
  // This ensures that AI refinement always sees the current canvas state,
  // not a stale snapshot from when the panel was opened.
  // Note: Use updateActiveWorkflowMetadata (not setActiveWorkflow) to avoid
  // updating nodes/edges which would cause an infinite loop.
  const prevNodesRef = useRef(nodes);
  const prevEdgesRef = useRef(edges);
  useEffect(() => {
    // Skip if nodes/edges haven't changed (same reference)
    if (nodes === prevNodesRef.current && edges === prevEdgesRef.current) {
      return;
    }
    prevNodesRef.current = nodes;
    prevEdgesRef.current = edges;

    // Only sync if we have an activeWorkflow and nodes (non-empty canvas)
    if (activeWorkflow && nodes.length > 0) {
      const workflow = serializeWorkflow(
        nodes,
        edges,
        workflowName || 'Untitled',
        workflowDescription || undefined,
        activeWorkflow.conversationHistory,
        subAgentFlows
      );
      // Preserve original ID
      workflow.id = activeWorkflow.id;
      // Update only activeWorkflow without touching nodes/edges
      updateActiveWorkflowMetadata(workflow);
    }
  }, [
    nodes,
    edges,
    workflowName,
    workflowDescription,
    subAgentFlows,
    activeWorkflow,
    updateActiveWorkflowMetadata,
  ]);

  // App mode: null = loading, 'edit' = full editor, 'overview' = read-only overview
  // Start with null to prevent flashing the wrong UI
  const [mode, setMode] = useState<'edit' | 'overview' | null>(null);
  // Overview mode state
  const [overviewWorkflow, setOverviewWorkflow] = useState<Workflow | null>(null);
  // One-shot focus request when entering Overview from PropertyOverlay's
  // "Show in Overview" button. Uses an incrementing key so the same node
  // requested twice still fires.
  const [overviewFocusRequest, setOverviewFocusRequest] = useState<{
    nodeId: string;
    key: number;
  } | null>(null);
  const [overviewIsHistoricalVersion, setOverviewIsHistoricalVersion] = useState<boolean>(false);
  // True when View was opened via the workflow-preview-editor-provider (i.e.
  // the user opened a `.vscode/workflows/*.json` from git history / diff /
  // file explorer). In that case there is no live canvas to go back to,
  // so navigation buttons (Back-to-canvas, per-section Edit) are hidden.
  const [overviewIsExternal, setOverviewIsExternal] = useState<boolean>(false);
  // JSON parse failure surfaced from the workflow-preview-editor-provider so
  // the user knows why the View pane is empty.
  const [overviewParseError, setOverviewParseError] = useState<string | null>(null);
  const [overviewHasGitChanges, setOverviewHasGitChanges] = useState<boolean>(false);

  const [error, setError] = useState<ErrorPayload | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0); // Used to force Tour component remount
  const [isSlackShareDialogOpen, setIsSlackShareDialogOpen] = useState(false);
  const [isLoadingImportedWorkflow, setIsLoadingImportedWorkflow] = useState(false);
  const [isLoadingWorkflowFromPreview, setIsLoadingWorkflowFromPreview] = useState(false);
  const [isSlackConnectionRequiredDialogOpen, setIsSlackConnectionRequiredDialogOpen] =
    useState(false);
  const [isSlackManualTokenDialogOpen, setIsSlackManualTokenDialogOpen] = useState(false);
  const [connectionRequiredWorkspaceName, setConnectionRequiredWorkspaceName] = useState<
    string | undefined
  >(undefined);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);
  const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
  const [pendingLoadSampleId, setPendingLoadSampleId] = useState<string | null>(null);
  const [showUnsavedConfirmForSample, setShowUnsavedConfirmForSample] = useState(false);
  const pendingTourAfterSampleLoadRef = useRef(false);
  const [unreadReleaseCount, setUnreadReleaseCount] = useState(0);
  const [extensionVersion, setExtensionVersion] = useState('');
  const [recentWorkflows, setRecentWorkflows] = useState<Array<{ id: string; name: string }>>([]);
  const [showWhatsNewBadge, setShowWhatsNewBadge] = useState(true);
  const [isWhatsNewFromStartMenu, setIsWhatsNewFromStartMenu] = useState(false);
  const [showMcpRefreshDialog, setShowMcpRefreshDialog] = useState(false);
  const [mcpRefreshSkillName, setMcpRefreshSkillName] = useState<string>('cc-workflow-ai-editor');
  const [emptyStateDismissed, setEmptyStateDismissed] = useState(false);

  // Pending MCP apply state for diff preview
  const [pendingMcpApply, setPendingMcpApply] = useState<{
    correlationId: string;
    workflow: Workflow;
    diffSummary: WorkflowDiffSummary;
    description?: string;
    plannedFiles?: PlannedSubAgentFile[];
    hasRevisionConflict?: boolean;
  } | null>(null);
  const pendingMcpApplyRef = useRef(pendingMcpApply);
  pendingMcpApplyRef.current = pendingMcpApply;

  // Node Palette collapse state
  const {
    isCollapsed: isNodePaletteCollapsed,
    toggle: toggleNodePalette,
    expand: expandNodePalette,
  } = useCollapsiblePanel();
  const isCompact = useIsCompactMode();

  // Reset emptyStateDismissed when a workflow is loaded (so empty state reappears after reset)
  const prevActiveWorkflowRef = useRef(activeWorkflow);
  useEffect(() => {
    if (prevActiveWorkflowRef.current !== null && activeWorkflow === null) {
      setEmptyStateDismissed(false);
    }
    prevActiveWorkflowRef.current = activeWorkflow;
  }, [activeWorkflow]);

  // Empty state: show when canvas has only default Start/End nodes, no edges, no active workflow
  const isCanvasEmpty =
    nodes.length === 2 &&
    edges.length === 0 &&
    activeWorkflow === null &&
    nodes.some((n) => n.id === 'start-node-default') &&
    nodes.some((n) => n.id === 'end_node_default');
  const showEmptyState = isCanvasEmpty && !emptyStateDismissed && !runTour;

  const handleLoadWorkflowFromEmptyState = useCallback(() => {
    vscode.postMessage({ type: 'OPEN_FILE_PICKER' });
  }, []);

  const handleError = (errorData: ErrorPayload) => {
    setError(errorData);
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleTourFinish = useCallback(() => {
    setRunTour(false);
  }, []);

  const handleStartTour = useCallback(() => {
    setRunTour(true);
    setTourKey((prev) => prev + 1); // Increment key to force remount and reset tour state
  }, []);

  const handleShareToSlack = () => {
    setIsSlackShareDialogOpen(true);
  };

  const handleLoadSample = useCallback((sampleId: string) => {
    if (hasUnsavedChanges()) {
      setPendingLoadSampleId(sampleId);
      setShowUnsavedConfirmForSample(true);
    } else {
      vscode.postMessage({ type: 'LOAD_SAMPLE_WORKFLOW', payload: { sampleId } });
      setIsSampleDialogOpen(false);
    }
  }, []);

  const handleAcceptMcpApply = useCallback(() => {
    const pending = pendingMcpApplyRef.current;
    if (!pending) return;
    try {
      const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(pending.workflow);
      setCanvas(loadedNodes, loadedEdges);
      setWorkflowName(pending.workflow.name);
      setActiveWorkflow(pending.workflow, { clearHistory: false });
      vscode.postMessage({
        type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
        payload: { correlationId: pending.correlationId, success: true },
      });
    } catch (error) {
      vscode.postMessage({
        type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
        payload: {
          correlationId: pending.correlationId,
          success: false,
          error: error instanceof Error ? error.message : 'Failed to apply workflow',
        },
      });
    }
    setPendingMcpApply(null);
  }, [setCanvas, setWorkflowName, setActiveWorkflow]);

  const handleMcpRefreshRun = useCallback(() => {
    setShowMcpRefreshDialog(false);
    vscode.postMessage({
      type: 'CONFIRM_ANTIGRAVITY_CASCADE_LAUNCH',
      payload: { skillName: mcpRefreshSkillName },
    });
  }, [mcpRefreshSkillName]);

  const handleMcpRefreshOpenSettings = useCallback(() => {
    vscode.postMessage({ type: 'OPEN_ANTIGRAVITY_MCP_SETTINGS' });
  }, []);

  const handleMcpRefreshCancel = useCallback(() => {
    setShowMcpRefreshDialog(false);
  }, []);

  const handleRejectMcpApply = useCallback(() => {
    const pending = pendingMcpApplyRef.current;
    if (!pending) return;
    vscode.postMessage({
      type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
      payload: {
        correlationId: pending.correlationId,
        success: false,
        error: 'User rejected the changes',
      },
    });
    setPendingMcpApply(null);
  }, []);

  const handleRetryMcpApply = useCallback(() => {
    const pending = pendingMcpApplyRef.current;
    if (!pending) return;
    vscode.postMessage({
      type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
      payload: {
        correlationId: pending.correlationId,
        success: false,
        error:
          'Canvas was modified during AI processing. Please call get_current_workflow to fetch the latest state and re-apply your changes.',
        currentRevision: getCanvasRevision(),
      },
    });
    setPendingMcpApply(null);
  }, []);

  // Listen for messages from Extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'OVERVIEW_MODE_INIT') {
        // Switch to overview mode with workflow data
        const payload = message.payload as OverviewModeInitPayload;
        setOverviewWorkflow(payload.workflow);
        setOverviewIsHistoricalVersion(payload.isHistoricalVersion ?? false);
        setOverviewHasGitChanges(payload.hasGitChanges ?? false);
        setOverviewIsExternal(true);
        setOverviewParseError(null);
        // Clear any stale focus request from a previous PropertyOverlay
        // "Show in View" so the new external workflow does not auto-scroll
        // to an unrelated node.
        setOverviewFocusRequest(null);
        setMode('overview');
      } else if (message.type === 'OVERVIEW_UPDATE') {
        // The source JSON file changed; refresh the displayed workflow.
        const payload = message.payload as OverviewUpdatePayload;
        setOverviewWorkflow(payload.workflow);
        setOverviewParseError(null);
      } else if (message.type === 'OVERVIEW_PARSE_ERROR') {
        const payload = message.payload as OverviewParseErrorPayload;
        setOverviewParseError(payload.error);
      } else if (message.type === 'INITIAL_STATE') {
        // Switch to edit mode
        setMode('edit');
        const payload = message.payload as InitialStatePayload;
        if (payload.isFirstTimeUser) {
          // Load sample workflow first, then start tour after it's loaded
          pendingTourAfterSampleLoadRef.current = true;
          vscode.postMessage({
            type: 'LOAD_SAMPLE_WORKFLOW',
            payload: { sampleId: 'github-issue-planning-sample' },
          });
        }
        setUnreadReleaseCount(payload.unreadReleaseCount ?? 0);
        setShowWhatsNewBadge(payload.showWhatsNewBadge ?? true);
        setExtensionVersion(payload.extensionVersion ?? '');
        setRecentWorkflows(payload.recentWorkflows ?? []);
      } else if (message.type === 'IMPORT_WORKFLOW_FROM_SLACK') {
        // Handle import workflow request from Extension Host
        // Simply forward the message back to Extension Host to trigger the import process
        const payload = message.payload as ImportWorkflowFromSlackPayload;

        console.log('Forwarding import request to Extension Host:', payload);

        // Show loading overlay
        setIsLoadingImportedWorkflow(true);

        // Send the import request back to Extension Host with a new requestId
        const requestId = `req-${Date.now()}-${Math.random()}`;
        vscode.postMessage({
          type: 'IMPORT_WORKFLOW_FROM_SLACK',
          requestId,
          payload,
        });

        // The import process will be handled by Extension Host
        // Success/failure notifications will be shown by Extension Host
      } else if (message.type === 'IMPORT_WORKFLOW_SUCCESS') {
        // Load imported workflow into canvas
        const workflow = message.payload?.workflow as Workflow;
        if (workflow) {
          const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
          setCanvas(loadedNodes, loadedEdges);
          setWorkflowName(workflow.name);
          // Set as active workflow to preserve conversation history
          setActiveWorkflow(workflow, { clearHistory: false });

          // TODO: Select imported workflow in dropdown after fixing selection logic
        }

        // Hide loading overlay
        setIsLoadingImportedWorkflow(false);
      } else if (message.type === 'IMPORT_WORKFLOW_FAILED') {
        // Hide loading overlay on failure
        setIsLoadingImportedWorkflow(false);

        // Check if error is WORKSPACE_NOT_CONNECTED
        const payload = message.payload as {
          errorCode?: string;
          workspaceId?: string;
          workspaceName?: string;
        };
        if (payload?.errorCode === 'WORKSPACE_NOT_CONNECTED') {
          setConnectionRequiredWorkspaceName(payload.workspaceName);
          setIsSlackConnectionRequiredDialogOpen(true);
        }
      } else if (message.type === 'IMPORT_WORKFLOW_CANCELLED') {
        // Hide loading overlay when user cancels
        setIsLoadingImportedWorkflow(false);
      } else if (message.type === 'SAMPLE_WORKFLOW_LOADED') {
        const workflow = message.payload?.workflow;
        if (workflow) {
          const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(workflow);
          setCanvas(loadedNodes, loadedEdges);
          setWorkflowName(workflow.name);
          setWorkflowDescription(workflow.description || '');
          setActiveWorkflow(workflow);
        }
        // Start tour after sample workflow is loaded (first-time user flow)
        if (pendingTourAfterSampleLoadRef.current) {
          pendingTourAfterSampleLoadRef.current = false;
          handleStartTour();
        }
      } else if (message.type === 'ERROR') {
        // If sample load failed during first-time user flow, still start the tour
        if (pendingTourAfterSampleLoadRef.current) {
          pendingTourAfterSampleLoadRef.current = false;
          handleStartTour();
        }
      } else if (message.type === 'PREPARE_WORKFLOW_LOAD') {
        // Show loading overlay while loading new workflow from preview
        setIsLoadingWorkflowFromPreview(true);
      } else if (message.type === 'LOAD_WORKFLOW') {
        // Hide loading overlay when workflow is loaded from preview
        setIsLoadingWorkflowFromPreview(false);
      } else if (message.type === 'GET_CURRENT_WORKFLOW_REQUEST') {
        // MCP Server requesting current workflow
        const payload = message.payload as GetCurrentWorkflowRequestPayload;
        const currentWorkflow = activeWorkflow
          ? serializeWorkflow(
              nodes,
              edges,
              workflowName || 'Untitled',
              workflowDescription || undefined,
              activeWorkflow.conversationHistory,
              subAgentFlows
            )
          : null;
        // Preserve original ID
        if (currentWorkflow && activeWorkflow) {
          currentWorkflow.id = activeWorkflow.id;
        }
        vscode.postMessage({
          type: 'GET_CURRENT_WORKFLOW_RESPONSE',
          payload: {
            correlationId: payload.correlationId,
            workflow: currentWorkflow,
            revision: getCanvasRevision(),
          },
        });
      } else if (message.type === 'MCP_SERVER_STATUS') {
        const payload = message.payload as McpServerStatusPayload;
        useWorkflowStore.getState().setMcpServerStatus(payload.running, payload.port);
      } else if (message.type === 'HIGHLIGHT_GROUP_NODE') {
        // MCP Server highlighting a group node during execution
        const payload = message.payload as HighlightGroupNodePayload;
        // Always allow clearing (null), but only set highlight when enabled
        if (payload.groupNodeId === null || useWorkflowStore.getState().isHighlightEnabled) {
          useWorkflowStore.getState().setHighlightedGroupNodeId(payload.groupNodeId);
        }
      } else if (message.type === 'ANTIGRAVITY_MCP_REFRESH_NEEDED') {
        const refreshPayload = message.payload as AntigravityMcpRefreshNeededPayload | undefined;
        setMcpRefreshSkillName(refreshPayload?.skillName || 'cc-workflow-ai-editor');
        setShowMcpRefreshDialog(true);
      } else if (message.type === 'APPLY_WORKFLOW_FROM_MCP') {
        // MCP Server applying workflow to canvas
        const payload = message.payload as ApplyWorkflowFromMcpPayload;

        // Reject if in overview mode
        if (mode === 'overview') {
          vscode.postMessage({
            type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
            payload: {
              correlationId: payload.correlationId,
              success: false,
              error:
                'Cannot apply workflow while in overview mode. Please switch to edit mode first.',
            },
          });
          return;
        }

        // Revision conflict detection (optimistic concurrency control)
        const hasRevisionConflict =
          payload.expectedRevision !== undefined &&
          payload.expectedRevision >= 0 &&
          payload.expectedRevision !== getCanvasRevision();

        if (payload.requireConfirmation) {
          // Auto-reject any existing pending request
          if (pendingMcpApplyRef.current) {
            vscode.postMessage({
              type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
              payload: {
                correlationId: pendingMcpApplyRef.current.correlationId,
                success: false,
                error: 'Superseded by new apply request',
              },
            });
          }

          // Compute diff and show preview dialog
          const diffSummary = computeWorkflowDiff(
            nodes,
            edges,
            workflowName || 'Untitled',
            payload.workflow
          );
          setPendingMcpApply({
            correlationId: payload.correlationId,
            workflow: payload.workflow,
            diffSummary,
            description: payload.description,
            plannedFiles: payload.plannedFiles,
            hasRevisionConflict,
          });
        } else {
          // Direct apply without confirmation — reject on revision conflict
          if (hasRevisionConflict) {
            vscode.postMessage({
              type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
              payload: {
                correlationId: payload.correlationId,
                success: false,
                error: `Canvas was modified since workflow was fetched (expected revision ${payload.expectedRevision}, current ${getCanvasRevision()}). Please re-fetch the workflow with get_current_workflow and try again.`,
                currentRevision: getCanvasRevision(),
              },
            });
            return;
          }

          try {
            const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(
              payload.workflow
            );
            setCanvas(loadedNodes, loadedEdges);
            setWorkflowName(payload.workflow.name);
            setActiveWorkflow(payload.workflow, { clearHistory: false });
            vscode.postMessage({
              type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
              payload: {
                correlationId: payload.correlationId,
                success: true,
              },
            });
          } catch (error) {
            vscode.postMessage({
              type: 'APPLY_WORKFLOW_FROM_MCP_RESPONSE',
              payload: {
                correlationId: payload.correlationId,
                success: false,
                error: error instanceof Error ? error.message : 'Failed to apply workflow',
              },
            });
          }
        }
      }
    };

    window.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [
    setCanvas,
    setWorkflowName,
    setWorkflowDescription,
    setActiveWorkflow,
    activeWorkflow,
    nodes,
    edges,
    workflowName,
    workflowDescription,
    subAgentFlows,
    mode,
    handleStartTour,
  ]);

  // Render loading state (waiting for mode to be determined)
  // Shows spinner while waiting for INITIAL_STATE or OVERVIEW_MODE_INIT from Extension Host
  if (mode === null) {
    return (
      <div
        style={{
          width: '100vw',
          height: '100vh',
          backgroundColor: 'var(--vscode-editor-background)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Spinner size={32} thickness={3} />
      </div>
    );
  }

  // Render overview mode
  if (mode === 'overview') {
    return (
      <div
        className="app overview-mode"
        style={{
          width: '100vw',
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <OverviewMode
          workflow={overviewWorkflow}
          isHistoricalVersion={overviewIsHistoricalVersion}
          hasGitChanges={overviewHasGitChanges}
          onSwitchToEdit={
            overviewIsExternal
              ? undefined
              : () => {
                  setMode('edit');
                }
          }
          onEditNode={
            overviewIsExternal
              ? undefined
              : (nodeId) => {
                  // Switch back to Edit mode, select the node (auto-opens
                  // the property overlay) and ask the canvas to pan to it.
                  setMode('edit');
                  const store = useWorkflowStore.getState();
                  store.setSelectedNodeId(nodeId);
                  store.requestFocusNode(nodeId);
                }
          }
          focusRequest={overviewFocusRequest}
          parseError={overviewParseError}
        />
      </div>
    );
  }

  // Render editor mode
  return (
    <div
      className="app"
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Top: Toolbar */}
      <Toolbar
        onError={handleError}
        onStartTour={handleStartTour}
        onShareToSlack={handleShareToSlack}
        onOpenSampleWorkflows={() => setIsSampleDialogOpen(true)}
        moreActionsOpen={isMoreActionsOpen}
        onMoreActionsOpenChange={setIsMoreActionsOpen}
        initialUnreadReleaseCount={unreadReleaseCount}
        showWhatsNewBadge={showWhatsNewBadge}
        onShowWhatsNewBadgeChange={setShowWhatsNewBadge}
        onSwitchToOverview={() => {
          const live = serializeWorkflow(
            nodes,
            edges,
            workflowName || 'Untitled',
            workflowDescription || undefined,
            activeWorkflow?.conversationHistory,
            subAgentFlows
          );
          if (activeWorkflow?.id) {
            live.id = activeWorkflow.id;
          }
          setOverviewWorkflow(live);
          setOverviewIsHistoricalVersion(false);
          setOverviewHasGitChanges(false);
          setOverviewIsExternal(false);
          // Plain Toolbar entry — no per-node focus, drop any prior request.
          setOverviewFocusRequest(null);
          setOverviewParseError(null);
          setMode('overview');
        }}
      />

      {/* Main Content: 3-column layout */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
          overflow: 'hidden',
        }}
      >
        {/* Left Panel: Node Palette with Radix Collapsible */}
        <Collapsible.Root
          open={!isNodePaletteCollapsed}
          style={{
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Collapsible.Content className={`node-palette-collapsible${isCompact ? ' compact' : ''}`}>
            <NodePalette onCollapse={toggleNodePalette} />
          </Collapsible.Content>
          {/* Simple overlay for Left Panel */}
          <SimpleOverlay isVisible={isProcessing} />
        </Collapsible.Root>

        {/* Center: Workflow Editor with processing overlay (Phase 3.10 - modified) */}
        <div style={{ flex: 1, position: 'relative' }}>
          <WorkflowEditor
            isNodePaletteCollapsed={isNodePaletteCollapsed}
            onExpandNodePalette={expandNodePalette}
            showEmptyState={showEmptyState}
            onOpenSample={() => setIsSampleDialogOpen(true)}
            onDismissEmptyState={() => setEmptyStateDismissed(true)}
            onLoadWorkflow={handleLoadWorkflowFromEmptyState}
            extensionVersion={extensionVersion}
            recentWorkflows={recentWorkflows}
            onLoadRecent={(id) => {
              vscode.postMessage({
                type: 'LOAD_WORKFLOW',
                payload: { workflowId: id },
              });
            }}
            onVersionClick={() => setIsWhatsNewFromStartMenu(true)}
          />
          {/* Processing overlay for canvas area only (with message centered in canvas) */}
          <ProcessingOverlay isVisible={isProcessing} message={t('refinement.processingOverlay')} />

          {/* Property Overlay - overlay on canvas right side */}
          {selectedNodeId && isPropertyOverlayOpen && (
            <div
              style={{
                position: 'absolute',
                top: 5,
                right: 5,
                bottom: 5,
                zIndex: 10,
              }}
            >
              <PropertyOverlay
                onShowInOverview={(nodeId) => {
                  // Snapshot the live canvas, switch to Overview mode and
                  // ask InstructionsPanel to scroll to the matching section
                  // (which in turn drives the Mermaid follow-mode pan).
                  const live = serializeWorkflow(
                    nodes,
                    edges,
                    workflowName || 'Untitled',
                    workflowDescription || undefined,
                    activeWorkflow?.conversationHistory,
                    subAgentFlows
                  );
                  if (activeWorkflow?.id) {
                    live.id = activeWorkflow.id;
                  }
                  setOverviewWorkflow(live);
                  setOverviewIsHistoricalVersion(false);
                  setOverviewHasGitChanges(false);
                  setOverviewIsExternal(false);
                  setOverviewFocusRequest({ nodeId, key: Date.now() });
                  setMode('overview');
                }}
              />
            </div>
          )}
        </div>

        {/* Refinement Panel with Radix Collapsible for slide animation */}
        <Collapsible.Root open={isRefinementPanelOpen}>
          <Collapsible.Content className="refinement-panel-collapsible">
            <RefinementChatPanel chatState={mainChatState} onClose={handleCloseRefinementPanel} />
          </Collapsible.Content>
        </Collapsible.Root>

        {/* Commentary AI Panel */}
        <Collapsible.Root open={isCommentaryEnabled}>
          <Collapsible.Content className="refinement-panel-collapsible">
            <CommentaryPanel onClose={handleCloseCommentaryPanel} />
          </Collapsible.Content>
        </Collapsible.Root>
      </div>

      {/* Error Notification Overlay */}
      <ErrorNotification error={error} onDismiss={handleDismissError} />

      {/* Antigravity MCP Refresh Dialog */}
      <AntigravityMcpRefreshDialog
        isOpen={showMcpRefreshDialog}
        onOpenMcpSettings={handleMcpRefreshOpenSettings}
        onRun={handleMcpRefreshRun}
        onCancel={handleMcpRefreshCancel}
      />

      {/* Interactive Tour */}
      <Tour key={tourKey} run={runTour} onFinish={handleTourFinish} />

      {/* Sample Workflow Dialog */}
      <SampleWorkflowDialog
        isOpen={isSampleDialogOpen}
        onClose={() => setIsSampleDialogOpen(false)}
        onLoadSample={handleLoadSample}
      />

      {/* What's New Dialog triggered from StartMenu version click */}
      <WhatsNewDialog
        isOpen={isWhatsNewFromStartMenu}
        onClose={() => setIsWhatsNewFromStartMenu(false)}
        showBadge={showWhatsNewBadge}
        onShowBadgeChange={setShowWhatsNewBadge}
      />

      {/* Unsaved changes confirmation before loading sample */}
      <ConfirmDialog
        isOpen={showUnsavedConfirmForSample}
        title={t('dialog.loadWorkflow.title')}
        message={t('dialog.loadWorkflow.message')}
        confirmLabel={t('dialog.loadWorkflow.confirm')}
        cancelLabel={t('dialog.loadWorkflow.cancel')}
        onConfirm={() => {
          setShowUnsavedConfirmForSample(false);
          if (pendingLoadSampleId) {
            vscode.postMessage({
              type: 'LOAD_SAMPLE_WORKFLOW',
              payload: { sampleId: pendingLoadSampleId },
            });
            setPendingLoadSampleId(null);
            setIsSampleDialogOpen(false);
          }
        }}
        onCancel={() => {
          setShowUnsavedConfirmForSample(false);
          setPendingLoadSampleId(null);
        }}
      />

      {/* Delete Confirmation Dialog for Delete key */}
      <ConfirmDialog
        isOpen={pendingDeleteNodeIds.length > 0}
        title={t('dialog.deleteNode.title')}
        message={t('dialog.deleteNode.message')}
        confirmLabel={t('dialog.deleteNode.confirm')}
        cancelLabel={t('dialog.deleteNode.cancel')}
        onConfirm={confirmDeleteNodes}
        onCancel={cancelDeleteNodes}
      />

      {/* Diff Preview Dialog for MCP apply_workflow */}
      <DiffPreviewDialog
        isOpen={pendingMcpApply !== null}
        workflow={pendingMcpApply?.workflow ?? null}
        diffSummary={pendingMcpApply?.diffSummary ?? null}
        description={pendingMcpApply?.description}
        plannedFiles={pendingMcpApply?.plannedFiles}
        hasRevisionConflict={pendingMcpApply?.hasRevisionConflict}
        onAccept={handleAcceptMcpApply}
        onReject={handleRejectMcpApply}
        onRetry={handleRetryMcpApply}
      />

      {/* Slack Share Dialog */}
      <SlackShareDialog
        isOpen={isSlackShareDialogOpen}
        onClose={() => setIsSlackShareDialogOpen(false)}
        workflowId={activeWorkflow?.id || ''}
      />

      {/* Slack Connection Required Dialog */}
      <SlackConnectionRequiredDialog
        isOpen={isSlackConnectionRequiredDialogOpen}
        onClose={() => {
          setIsSlackConnectionRequiredDialogOpen(false);
          setConnectionRequiredWorkspaceName(undefined);
        }}
        onConnectSlack={() => setIsSlackManualTokenDialogOpen(true)}
        workspaceName={connectionRequiredWorkspaceName}
      />

      {/* Slack Manual Token Dialog */}
      <SlackManualTokenDialog
        isOpen={isSlackManualTokenDialogOpen}
        onClose={() => setIsSlackManualTokenDialogOpen(false)}
      />

      {/* Sub-Agent Flow Edit Dialog */}
      <SubAgentFlowDialog
        isOpen={activeSubAgentFlowId !== null}
        onClose={() => setActiveSubAgentFlowId(null)}
      />

      {/* Import Workflow Loading Overlay */}
      {isLoadingImportedWorkflow && (
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
        >
          <div
            style={{
              padding: '24px 32px',
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid var(--vscode-progressBar-background)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ color: 'var(--vscode-foreground)', fontSize: '14px' }}>
              {t('loading.importWorkflow')}
            </span>
          </div>
        </div>
      )}

      {/* Loading Workflow from Preview Overlay */}
      {isLoadingWorkflowFromPreview && (
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
        >
          <div
            style={{
              padding: '24px 32px',
              backgroundColor: 'var(--vscode-editor-background)',
              border: '1px solid var(--vscode-panel-border)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid var(--vscode-progressBar-background)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <span style={{ color: 'var(--vscode-foreground)', fontSize: '14px' }}>
              {t('loading.openWorkflow')}
            </span>
          </div>
        </div>
      )}

      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }

          /* Node Palette Collapsible Animation */
          .node-palette-collapsible {
            --palette-width: 200px;
            overflow: hidden;
          }

          .node-palette-collapsible.compact {
            --palette-width: 100px;
          }

          .node-palette-collapsible[data-state='open'] {
            width: var(--palette-width);
            animation: slideOpen 150ms ease-out;
          }

          .node-palette-collapsible[data-state='closed'] {
            width: 0px;
            animation: slideClose 150ms ease-out;
          }

          @keyframes slideOpen {
            from {
              width: 0px;
            }
            to {
              width: var(--palette-width);
            }
          }

          @keyframes slideClose {
            from {
              width: var(--palette-width);
            }
            to {
              width: 0px;
            }
          }

          /* Refinement Panel Collapsible Animation */
          .refinement-panel-collapsible {
            overflow: hidden;
            height: 100%;
            flex-shrink: 0;
          }

          .refinement-panel-collapsible[data-state='open'] {
            animation: slideOpenFromRight 150ms ease-out forwards;
          }

          .refinement-panel-collapsible[data-state='closed'] {
            animation: slideCloseToRight 150ms ease-out forwards;
          }

          @keyframes slideOpenFromRight {
            from {
              transform: translateX(100%);
            }
            to {
              transform: translateX(0);
            }
          }

          @keyframes slideCloseToRight {
            from {
              transform: translateX(0);
            }
            to {
              transform: translateX(100%);
            }
          }
        `}
      </style>
    </div>
  );
};

export default App;
