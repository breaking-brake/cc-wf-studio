/**
 * Refinement Chat Panel Component
 *
 * Sidebar panel for AI-assisted workflow refinement chat interface.
 * Supports both main workflow and SubAgentFlow editing modes.
 *
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.2
 * Updated: Phase 3.1 - Changed from modal dialog to sidebar format
 * Updated: Phase 3.3 - Added resizable width functionality
 * Updated: Phase 3.7 - Added immediate loading message display
 * Updated: SubAgentFlow support - Unified panel for both workflow types
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { ResponsiveFontProvider } from '../../contexts/ResponsiveFontContext';
import { useResizablePanel } from '../../hooks/useResizablePanel';
import { useResponsiveFontSizes } from '../../hooks/useResponsiveFontSizes';
import { useTranslation } from '../../i18n/i18n-context';
import {
  clearConversation,
  type RefinementProgressCallback,
  refineSubAgentFlow,
  refineWorkflow,
  WorkflowRefinementError,
} from '../../services/refinement-service';
import { useRefinementStore } from '../../stores/refinement-store';
import { useWorkflowStore } from '../../stores/workflow-store';
import { MessageInput } from '../chat/MessageInput';
import { MessageList } from '../chat/MessageList';
import { SettingsDropdown } from '../chat/SettingsDropdown';
import { WarningBanner } from '../chat/WarningBanner';
import { ResizeHandle } from '../common/ResizeHandle';
import { ConfirmDialog } from './ConfirmDialog';

/**
 * Props for RefinementChatPanel
 *
 * @param mode - Target mode: 'workflow' (default) or 'subAgentFlow'
 * @param subAgentFlowId - Required when mode is 'subAgentFlow'
 * @param onClose - Close callback for SubAgentFlow mode (workflow mode uses internal closeChat)
 */
interface RefinementChatPanelProps {
  mode?: 'workflow' | 'subAgentFlow';
  subAgentFlowId?: string;
  onClose?: () => void;
}

export function RefinementChatPanel({
  mode = 'workflow',
  subAgentFlowId,
  onClose,
}: RefinementChatPanelProps) {
  const { t } = useTranslation();
  const { width, handleMouseDown } = useResizablePanel();
  const fontSizes = useResponsiveFontSizes(width);

  const {
    isOpen,
    closeChat,
    conversationHistory,
    loadConversationHistory,
    setTargetContext,
    addUserMessage,
    startProcessing,
    handleRefinementSuccess,
    handleRefinementFailed,
    finishProcessing,
    addLoadingAiMessage,
    updateMessageLoadingState,
    updateMessageContent,
    updateMessageErrorState,
    removeMessage,
    clearHistory,
    shouldShowWarning,
    isProcessing,
    useSkills,
    timeoutSeconds,
    selectedModel,
    updateMessageToolInfo,
    allowedTools,
  } = useRefinementStore();

  const { activeWorkflow, updateWorkflow, subAgentFlows, updateSubAgentFlow, setNodes, setEdges } =
    useWorkflowStore();

  const [isConfirmClearOpen, setIsConfirmClearOpen] = useState(false);

  // Get SubAgentFlow for subAgentFlow mode
  const subAgentFlow =
    mode === 'subAgentFlow' && subAgentFlowId
      ? subAgentFlows.find((sf) => sf.id === subAgentFlowId)
      : undefined;

  // Determine if panel should be visible
  const isVisible = mode === 'subAgentFlow' ? !!subAgentFlow : isOpen && !!activeWorkflow;

  // Phase 7 (T034): Define handleClose early for use in useEffect
  const handleClose = useCallback(() => {
    if (mode === 'subAgentFlow' && onClose) {
      onClose();
    } else {
      closeChat();
    }
  }, [mode, onClose, closeChat]);

  // Track the last loaded workflow/subAgentFlow ID to avoid reloading during refinement
  const lastLoadedWorkflowIdRef = useRef<string | null>(null);
  const lastLoadedSubAgentFlowIdRef = useRef<string | null>(null);

  // Load conversation history and set target context when panel opens
  // IMPORTANT: Don't reload conversation history when activeWorkflow changes during refinement
  // because this would overwrite the frontend's streaming messages with the server's history
  useEffect(() => {
    if (!isVisible) return;

    if (mode === 'subAgentFlow' && subAgentFlow && subAgentFlowId) {
      // Only reload if switching to a different SubAgentFlow
      if (lastLoadedSubAgentFlowIdRef.current !== subAgentFlowId) {
        setTargetContext('subAgentFlow', subAgentFlowId);
        loadConversationHistory(subAgentFlow.conversationHistory);
        lastLoadedSubAgentFlowIdRef.current = subAgentFlowId;
        lastLoadedWorkflowIdRef.current = null;
      }
    } else if (mode === 'workflow' && activeWorkflow) {
      // Only reload if switching to a different workflow
      // This prevents reloading during refinement (same workflow ID, updated reference)
      if (lastLoadedWorkflowIdRef.current !== activeWorkflow.id) {
        setTargetContext('workflow');
        loadConversationHistory(activeWorkflow.conversationHistory);
        lastLoadedWorkflowIdRef.current = activeWorkflow.id;
        lastLoadedSubAgentFlowIdRef.current = null;
      }
    }

    // Reset context when unmounting (only for subAgentFlow mode)
    return () => {
      if (mode === 'subAgentFlow') {
        setTargetContext('workflow');
      }
    };
  }, [
    isVisible,
    mode,
    activeWorkflow,
    subAgentFlow,
    subAgentFlowId,
    setTargetContext,
    loadConversationHistory,
  ]);

  // Phase 7 (T034): Accessibility - Close panel on Escape key
  useEffect(() => {
    if (!isVisible) {
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isProcessing) {
        e.preventDefault();
        e.stopPropagation();
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVisible, handleClose, isProcessing]);

  // Early return if not visible
  if (!isVisible) {
    return null;
  }

  // Handle sending refinement request
  const handleSend = async (message: string) => {
    if (!conversationHistory || !activeWorkflow) {
      return;
    }

    // Phase 3.7: Add user message and loading AI message immediately for instant feedback
    addUserMessage(message);

    const requestId = `refine-${mode === 'subAgentFlow' ? 'subagentflow-' : ''}${Date.now()}-${Math.random()}`;
    const aiMessageId = `ai-${Date.now()}-${Math.random()}`;

    // Add loading AI message bubble immediately
    addLoadingAiMessage(aiMessageId);
    startProcessing(requestId);

    try {
      if (mode === 'subAgentFlow' && subAgentFlowId && subAgentFlow) {
        // SubAgentFlow refinement
        const result = await refineSubAgentFlow(
          activeWorkflow.id,
          subAgentFlowId,
          message,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          selectedModel,
          allowedTools
        );

        if (result.type === 'success') {
          const { refinedInnerWorkflow, aiMessage, updatedConversationHistory } = result.payload;

          // Update SubAgentFlow in store
          updateSubAgentFlow(subAgentFlowId, {
            nodes: refinedInnerWorkflow.nodes,
            connections: refinedInnerWorkflow.connections,
            conversationHistory: updatedConversationHistory,
          });

          // Update canvas nodes/edges
          const newNodes = refinedInnerWorkflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: { x: node.position.x, y: node.position.y },
            data: node.data,
          }));
          const newEdges = refinedInnerWorkflow.connections.map((conn) => ({
            id: conn.id,
            source: conn.from,
            target: conn.to,
            sourceHandle: conn.fromPort,
            targetHandle: conn.toPort,
          }));

          setNodes(newNodes);
          setEdges(newEdges);

          // Update loading message
          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        } else if (result.type === 'clarification') {
          const { aiMessage, updatedConversationHistory } = result.payload;

          // Update SubAgentFlow conversation history only
          updateSubAgentFlow(subAgentFlowId, {
            conversationHistory: updatedConversationHistory,
          });

          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        }
      } else {
        // Main workflow refinement with streaming progress
        let hasReceivedProgress = false;
        let latestExplanatoryText = '';

        const onProgress: RefinementProgressCallback = (payload) => {
          hasReceivedProgress = true;

          // Tool Loading Animation: Use contentType from Extension to detect tool execution
          if (payload.contentType === 'tool_use') {
            // Tool execution in progress
            updateMessageToolInfo(aiMessageId, payload.chunk);
          } else if (payload.contentType === 'text') {
            // Text content arrived = tool execution completed
            updateMessageToolInfo(aiMessageId, null);
          }

          // Update message content with explanatory text only (tool info shown separately by ToolExecutionIndicator)
          // Use accumulatedText as fallback if explanatoryText is undefined
          updateMessageContent(aiMessageId, payload.explanatoryText ?? payload.accumulatedText);
          // Track explanatory text separately (for preserving in chat history)
          // Note: explanatoryText can be empty string if AI only uses tools
          if (payload.explanatoryText !== undefined) {
            latestExplanatoryText = payload.explanatoryText;
          }
          console.log('[RefinementChatPanel] onProgress:', {
            hasReceivedProgress,
            accumulatedTextLength: payload.accumulatedText.length,
            explanatoryTextLength: payload.explanatoryText?.length ?? 0,
            latestExplanatoryTextLength: latestExplanatoryText.length,
          });
        };

        const result = await refineWorkflow(
          activeWorkflow.id,
          message,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          onProgress,
          selectedModel,
          allowedTools
        );

        if (result.type === 'success') {
          updateWorkflow(result.payload.refinedWorkflow);

          console.log('[RefinementChatPanel] handleSend success:', {
            hasReceivedProgress,
            latestExplanatoryTextLength: latestExplanatoryText.length,
            latestExplanatoryTextPreview: latestExplanatoryText.substring(0, 100),
            willUseFinishProcessing: hasReceivedProgress && latestExplanatoryText.length > 0,
          });

          if (hasReceivedProgress && latestExplanatoryText) {
            // Streaming occurred with explanatory text
            // Replace display text with explanatory text only (remove tool info)
            updateMessageContent(aiMessageId, latestExplanatoryText);
            updateMessageLoadingState(aiMessageId, false);

            // Add completion message as new bubble
            const completionMessageId = `ai-completion-${Date.now()}-${Math.random()}`;
            addLoadingAiMessage(completionMessageId);
            updateMessageContent(completionMessageId, result.payload.aiMessage.content);
            updateMessageLoadingState(completionMessageId, false);

            // Preserve frontend messages (don't overwrite with server history)
            console.log('[RefinementChatPanel] handleSend: Using finishProcessing');
            finishProcessing();
          } else {
            // No streaming or no explanatory text: just show completion message
            console.log('[RefinementChatPanel] handleSend: Using handleRefinementSuccess');
            updateMessageContent(aiMessageId, result.payload.aiMessage.content);
            updateMessageLoadingState(aiMessageId, false);

            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        } else if (result.type === 'clarification') {
          // Always use the complete clarification message from result.payload
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);

          if (hasReceivedProgress) {
            // Streaming occurred, use finishProcessing to preserve frontend messages
            finishProcessing();
          } else {
            // No streaming, update conversation history normally
            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        }
      }
    } catch (error) {
      handleRefinementError(error, aiMessageId);
    }
  };

  // Handle retry for failed refinements
  const handleRetry = async (messageId: string) => {
    if (!conversationHistory || !activeWorkflow) {
      return;
    }

    // Find the user message that triggered this AI response
    const messages = conversationHistory.messages;
    const errorMessageIndex = messages.findIndex((msg) => msg.id === messageId);

    if (errorMessageIndex <= 0) {
      return;
    }

    const userMessage = messages[errorMessageIndex - 1];
    if (userMessage.sender !== 'user') {
      return;
    }

    // Reuse existing AI message for retry
    const aiMessageId = messageId;
    updateMessageErrorState(aiMessageId, false);
    updateMessageLoadingState(aiMessageId, true);

    const requestId = `refine-${mode === 'subAgentFlow' ? 'subagentflow-' : ''}${Date.now()}-${Math.random()}`;
    startProcessing(requestId);

    try {
      if (mode === 'subAgentFlow' && subAgentFlowId && subAgentFlow) {
        // SubAgentFlow retry
        const result = await refineSubAgentFlow(
          activeWorkflow.id,
          subAgentFlowId,
          userMessage.content,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          selectedModel,
          allowedTools
        );

        if (result.type === 'success') {
          const { refinedInnerWorkflow, aiMessage, updatedConversationHistory } = result.payload;

          updateSubAgentFlow(subAgentFlowId, {
            nodes: refinedInnerWorkflow.nodes,
            connections: refinedInnerWorkflow.connections,
            conversationHistory: updatedConversationHistory,
          });

          const newNodes = refinedInnerWorkflow.nodes.map((node) => ({
            id: node.id,
            type: node.type,
            position: { x: node.position.x, y: node.position.y },
            data: node.data,
          }));
          const newEdges = refinedInnerWorkflow.connections.map((conn) => ({
            id: conn.id,
            source: conn.from,
            target: conn.to,
            sourceHandle: conn.fromPort,
            targetHandle: conn.toPort,
          }));

          setNodes(newNodes);
          setEdges(newEdges);

          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        } else if (result.type === 'clarification') {
          const { aiMessage, updatedConversationHistory } = result.payload;

          updateSubAgentFlow(subAgentFlowId, {
            conversationHistory: updatedConversationHistory,
          });

          updateMessageContent(aiMessageId, aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);
          handleRefinementSuccess(aiMessage, updatedConversationHistory);
        }
      } else {
        // Main workflow retry with streaming progress
        let hasReceivedProgress = false;
        let latestExplanatoryText = '';

        const onProgress: RefinementProgressCallback = (payload) => {
          hasReceivedProgress = true;

          // Tool Loading Animation: Use contentType from Extension to detect tool execution
          if (payload.contentType === 'tool_use') {
            // Tool execution in progress
            updateMessageToolInfo(aiMessageId, payload.chunk);
          } else if (payload.contentType === 'text') {
            // Text content arrived = tool execution completed
            updateMessageToolInfo(aiMessageId, null);
          }

          // Update message content with explanatory text only (tool info shown separately by ToolExecutionIndicator)
          // Use accumulatedText as fallback if explanatoryText is undefined
          updateMessageContent(aiMessageId, payload.explanatoryText ?? payload.accumulatedText);
          // Track explanatory text separately (for preserving in chat history)
          // Note: explanatoryText can be empty string if AI only uses tools
          if (payload.explanatoryText !== undefined) {
            latestExplanatoryText = payload.explanatoryText;
          }
          console.log('[RefinementChatPanel] onProgress:', {
            hasReceivedProgress,
            accumulatedTextLength: payload.accumulatedText.length,
            explanatoryTextLength: payload.explanatoryText?.length ?? 0,
            latestExplanatoryTextLength: latestExplanatoryText.length,
          });
        };

        const result = await refineWorkflow(
          activeWorkflow.id,
          userMessage.content,
          activeWorkflow,
          conversationHistory,
          requestId,
          useSkills,
          timeoutSeconds * 1000,
          onProgress,
          selectedModel,
          allowedTools
        );

        if (result.type === 'success') {
          updateWorkflow(result.payload.refinedWorkflow);

          if (hasReceivedProgress && latestExplanatoryText) {
            // Streaming occurred with explanatory text
            // Replace display text with explanatory text only (remove tool info)
            updateMessageContent(aiMessageId, latestExplanatoryText);
            updateMessageLoadingState(aiMessageId, false);

            // Add completion message as new bubble
            const completionMessageId = `ai-completion-${Date.now()}-${Math.random()}`;
            addLoadingAiMessage(completionMessageId);
            updateMessageContent(completionMessageId, result.payload.aiMessage.content);
            updateMessageLoadingState(completionMessageId, false);

            // Preserve frontend messages (don't overwrite with server history)
            finishProcessing();
          } else {
            // No streaming or no explanatory text: just show completion message
            updateMessageContent(aiMessageId, result.payload.aiMessage.content);
            updateMessageLoadingState(aiMessageId, false);

            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        } else if (result.type === 'clarification') {
          // Always use the complete clarification message from result.payload
          updateMessageContent(aiMessageId, result.payload.aiMessage.content);
          updateMessageLoadingState(aiMessageId, false);

          if (hasReceivedProgress) {
            // Streaming occurred, use finishProcessing to preserve frontend messages
            finishProcessing();
          } else {
            // No streaming, update conversation history normally
            handleRefinementSuccess(
              result.payload.aiMessage,
              result.payload.updatedConversationHistory
            );
          }
        }
      }
    } catch (error) {
      handleRefinementError(error, aiMessageId);
    }
  };

  // Common error handling for refinement requests
  const handleRefinementError = (error: unknown, aiMessageId: string) => {
    // Handle cancellation
    if (error instanceof WorkflowRefinementError && error.code === 'CANCELLED') {
      removeMessage(aiMessageId);
      handleRefinementFailed();
      return;
    }

    // Set error state on AI message
    if (error instanceof WorkflowRefinementError) {
      updateMessageErrorState(
        aiMessageId,
        true,
        error.code as
          | 'COMMAND_NOT_FOUND'
          | 'TIMEOUT'
          | 'PARSE_ERROR'
          | 'VALIDATION_ERROR'
          | 'PROHIBITED_NODE_TYPE'
          | 'UNKNOWN_ERROR'
      );
    } else {
      updateMessageErrorState(aiMessageId, true, 'UNKNOWN_ERROR');
    }

    console.error('Refinement failed:', error);
    handleRefinementFailed();
  };

  const handleClearHistoryClick = () => {
    setIsConfirmClearOpen(true);
  };

  const handleConfirmClear = async () => {
    if (!activeWorkflow) {
      return;
    }

    try {
      if (mode === 'subAgentFlow' && subAgentFlowId && conversationHistory) {
        // Clear SubAgentFlow conversation history locally
        clearHistory();
        updateSubAgentFlow(subAgentFlowId, {
          conversationHistory: {
            ...conversationHistory,
            messages: [],
            currentIteration: 0,
            updatedAt: new Date().toISOString(),
          },
        });
      } else {
        // Clear main workflow conversation via Extension Host
        const requestId = `clear-${Date.now()}-${Math.random()}`;
        await clearConversation(activeWorkflow.id, requestId);
        clearHistory();
      }

      setIsConfirmClearOpen(false);
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      setIsConfirmClearOpen(false);
    }
  };

  const handleCancelClear = () => {
    setIsConfirmClearOpen(false);
  };

  // Determine panel title based on mode
  const panelTitle =
    mode === 'subAgentFlow' ? t('subAgentFlow.aiEdit.title') : t('refinement.title');

  return (
    <div
      className="refinement-chat-panel"
      style={{
        position: 'relative',
        width: `${width}px`,
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderLeft: '1px solid var(--vscode-panel-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <ResponsiveFontProvider width={width}>
        <ResizeHandle onMouseDown={handleMouseDown} />
        {/* Header - Single row layout (simplified after Settings dropdown consolidation) */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0,
          }}
        >
          <h2
            id="refinement-title"
            style={{
              margin: 0,
              fontSize: `${fontSizes.title}px`,
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            {panelTitle}
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <SettingsDropdown
              onClearHistoryClick={handleClearHistoryClick}
              hasMessages={conversationHistory ? conversationHistory.messages.length > 0 : false}
            />

            <button
              type="button"
              onClick={handleClose}
              disabled={isProcessing}
              style={{
                padding: '4px 8px',
                backgroundColor: 'transparent',
                color: 'var(--vscode-foreground)',
                border: 'none',
                borderRadius: '4px',
                cursor: isProcessing ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                opacity: isProcessing ? 0.5 : 1,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Warning Banner - Show when 20+ iterations */}
        {shouldShowWarning() && <WarningBanner />}

        {/* Message List */}
        <MessageList onRetry={handleRetry} />

        {/* Input */}
        <MessageInput onSend={handleSend} />

        {/* Clear Confirmation Dialog */}
        <ConfirmDialog
          isOpen={isConfirmClearOpen}
          title={t('refinement.clearDialog.title')}
          message={t('refinement.clearDialog.message')}
          confirmLabel={t('refinement.clearDialog.confirm')}
          cancelLabel={t('refinement.clearDialog.cancel')}
          onConfirm={handleConfirmClear}
          onCancel={handleCancelClear}
        />
      </ResponsiveFontProvider>
    </div>
  );
}
