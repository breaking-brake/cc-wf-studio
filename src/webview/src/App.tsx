/**
 * Claude Code Workflow Studio - Main App Component
 *
 * Root component for the Webview UI with 3-column layout
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import * as Collapsible from '@radix-ui/react-collapsible';
import type {
  ErrorPayload,
  ImportWorkflowFromSlackPayload,
  InitialStatePayload,
  Workflow,
} from '@shared/types/messages';
import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ProcessingOverlay } from './components/common/ProcessingOverlay';
import { SimpleOverlay } from './components/common/SimpleOverlay';
import { ConfirmDialog } from './components/dialogs/ConfirmDialog';
import { RefinementChatPanel } from './components/dialogs/RefinementChatPanel';
import { SlackConnectionRequiredDialog } from './components/dialogs/SlackConnectionRequiredDialog';
import { SlackManualTokenDialog } from './components/dialogs/SlackManualTokenDialog';
import { SlackShareDialog } from './components/dialogs/SlackShareDialog';
import { SubAgentFlowDialog } from './components/dialogs/SubAgentFlowDialog';
import { TermsOfUseDialog } from './components/dialogs/TermsOfUseDialog';
import { ErrorNotification } from './components/ErrorNotification';
import { NodePalette } from './components/NodePalette';
import { PropertyOverlay } from './components/PropertyOverlay';
import { Toolbar } from './components/Toolbar';
import { Tour } from './components/Tour';
import { WorkflowEditor } from './components/WorkflowEditor';
import { useCollapsiblePanel } from './hooks/useCollapsiblePanel';
import { useIsCompactMode } from './hooks/useWindowWidth';
import { useTranslation } from './i18n/i18n-context';
import { vscode } from './main';
import { deserializeWorkflow } from './services/workflow-service';
import { useRefinementStore } from './stores/refinement-store';
import { useWorkflowStore } from './stores/workflow-store';
import type { RefinementChatState } from './types/refinement-chat-state';

const App: React.FC = () => {
  const { t } = useTranslation();
  const {
    pendingDeleteNodeIds,
    confirmDeleteNodes,
    cancelDeleteNodes,
    pendingDeleteEdgeIds,
    confirmDeleteEdges,
    cancelDeleteEdges,
    activeWorkflow,
    setNodes,
    setEdges,
    setWorkflowName,
    setActiveWorkflow,
    isPropertyOverlayOpen,
    selectedNodeId,
    activeSubAgentFlowId,
    setActiveSubAgentFlowId,
  } = useWorkflowStore();
  // Get all refinement store state and actions for main workflow chat
  const refinementStore = useRefinementStore();
  const { isOpen: isRefinementPanelOpen, isProcessing } = refinementStore;

  // Build mainChatState from refinement store (for main workflow RefinementChatPanel)
  const mainChatState: RefinementChatState = useMemo(
    () => ({
      conversationHistory: refinementStore.conversationHistory,
      isProcessing: refinementStore.isProcessing,
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

  const [error, setError] = useState<ErrorPayload | null>(null);
  const [runTour, setRunTour] = useState(false);
  const [tourKey, setTourKey] = useState(0); // Used to force Tour component remount
  const [isSlackShareDialogOpen, setIsSlackShareDialogOpen] = useState(false);
  const [isLoadingImportedWorkflow, setIsLoadingImportedWorkflow] = useState(false);
  const [showTermsDialog, setShowTermsDialog] = useState(false);
  const [isSlackConnectionRequiredDialogOpen, setIsSlackConnectionRequiredDialogOpen] =
    useState(false);
  const [isSlackManualTokenDialogOpen, setIsSlackManualTokenDialogOpen] = useState(false);
  const [connectionRequiredWorkspaceName, setConnectionRequiredWorkspaceName] = useState<
    string | undefined
  >(undefined);
  const [isMoreActionsOpen, setIsMoreActionsOpen] = useState(false);

  // Node Palette collapse state
  const {
    isCollapsed: isNodePaletteCollapsed,
    toggle: toggleNodePalette,
    expand: expandNodePalette,
  } = useCollapsiblePanel();
  const isCompact = useIsCompactMode();

  const handleError = (errorData: ErrorPayload) => {
    setError(errorData);
  };

  const handleDismissError = () => {
    setError(null);
  };

  const handleTourFinish = () => {
    setRunTour(false);
  };

  const handleStartTour = () => {
    setRunTour(true);
    setTourKey((prev) => prev + 1); // Increment key to force remount and reset tour state
  };

  const handleShareToSlack = () => {
    setIsSlackShareDialogOpen(true);
  };

  const handleAcceptTerms = () => {
    // Send accept message to Extension
    vscode.postMessage({
      type: 'ACCEPT_TERMS',
    });
    setShowTermsDialog(false);
    // Start onboarding tour after accepting terms
    handleStartTour();
  };

  const handleCancelTerms = () => {
    // Send cancel message to Extension to close the panel
    vscode.postMessage({
      type: 'CANCEL_TERMS',
    });
  };

  // Listen for messages from Extension
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
      const message = event.data;

      if (message.type === 'INITIAL_STATE') {
        const payload = message.payload as InitialStatePayload;
        if (!payload.hasAcceptedTerms) {
          // Show terms dialog if not accepted
          setShowTermsDialog(true);
        }
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
          setNodes(loadedNodes);
          setEdges(loadedEdges);
          setWorkflowName(workflow.name);
          // Set as active workflow to preserve conversation history
          setActiveWorkflow(workflow);

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
      }
    };

    window.addEventListener('message', messageHandler);

    return () => {
      window.removeEventListener('message', messageHandler);
    };
  }, [setNodes, setEdges, setWorkflowName, setActiveWorkflow]);

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
        moreActionsOpen={isMoreActionsOpen}
        onMoreActionsOpenChange={setIsMoreActionsOpen}
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
              <PropertyOverlay />
            </div>
          )}
        </div>

        {/* Refinement Panel with Radix Collapsible for slide animation */}
        <Collapsible.Root open={isRefinementPanelOpen}>
          <Collapsible.Content
            className={`refinement-panel-collapsible${isCompact ? ' compact' : ''}`}
          >
            <RefinementChatPanel chatState={mainChatState} onClose={handleCloseRefinementPanel} />
          </Collapsible.Content>
        </Collapsible.Root>
      </div>

      {/* Error Notification Overlay */}
      <ErrorNotification error={error} onDismiss={handleDismissError} />

      {/* Terms of Use Dialog */}
      <TermsOfUseDialog
        isOpen={showTermsDialog}
        onAccept={handleAcceptTerms}
        onCancel={handleCancelTerms}
      />

      {/* Interactive Tour */}
      <Tour key={tourKey} run={runTour} onFinish={handleTourFinish} />

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

      {/* Delete Edge Confirmation Dialog */}
      <ConfirmDialog
        isOpen={pendingDeleteEdgeIds.length > 0}
        title={t('dialog.deleteEdge.title')}
        message={t('dialog.deleteEdge.message')}
        confirmLabel={t('dialog.deleteEdge.confirm')}
        cancelLabel={t('dialog.deleteEdge.cancel')}
        onConfirm={confirmDeleteEdges}
        onCancel={cancelDeleteEdges}
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
            --refinement-width: 320px;
            overflow: hidden;
            height: 100%;
          }

          .refinement-panel-collapsible.compact {
            --refinement-width: 280px;
          }

          .refinement-panel-collapsible[data-state='open'] {
            width: var(--refinement-width);
            animation: slideOpenFromRight 150ms ease-out;
          }

          .refinement-panel-collapsible[data-state='closed'] {
            width: 0px;
            animation: slideCloseToRight 150ms ease-out;
          }

          @keyframes slideOpenFromRight {
            from {
              width: 0px;
            }
            to {
              width: var(--refinement-width);
            }
          }

          @keyframes slideCloseToRight {
            from {
              width: var(--refinement-width);
            }
            to {
              width: 0px;
            }
          }
        `}
      </style>
    </div>
  );
};

export default App;
