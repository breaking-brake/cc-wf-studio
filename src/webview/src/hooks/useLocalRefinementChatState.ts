/**
 * useLocalRefinementChatState Hook
 *
 * Provides local chat state management for RefinementChatPanel in controlled mode.
 * Used by SubAgentFlowDialog to maintain isolated chat history from main workflow.
 */

import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';
import { useCallback, useMemo, useState } from 'react';
import type { SessionStatus } from '../stores/refinement-store';
import type { RefinementChatState, RefinementErrorCode } from '../types/refinement-chat-state';

interface UseLocalRefinementChatStateOptions {
  /** Callback when refinement succeeds (to persist conversation history) */
  onRefinementSuccess?: (updatedHistory: ConversationHistory) => void;
}

interface UseLocalRefinementChatStateReturn {
  /** The complete chat state object for RefinementChatPanel */
  chatState: RefinementChatState;
  /** Initialize or reset conversation history */
  initializeHistory: (history: ConversationHistory | null) => void;
  /** Reset all state to initial values */
  reset: () => void;
}

/**
 * Creates an empty conversation history object
 */
function createEmptyConversationHistory(): ConversationHistory {
  return {
    schemaVersion: '1.0.0',
    messages: [],
    currentIteration: 0,
    maxIterations: 20,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Hook for managing local refinement chat state
 *
 * @example
 * ```tsx
 * const { chatState, initializeHistory, reset } = useLocalRefinementChatState({
 *   onRefinementSuccess: (history) => {
 *     updateSubAgentFlow(id, { conversationHistory: history });
 *   },
 * });
 *
 * // When opening AI edit panel
 * initializeHistory(subAgentFlow.conversationHistory);
 *
 * // Pass to RefinementChatPanel
 * <RefinementChatPanel chatState={chatState} ... />
 * ```
 */
export function useLocalRefinementChatState(
  options: UseLocalRefinementChatStateOptions = {}
): UseLocalRefinementChatStateReturn {
  const { onRefinementSuccess } = options;

  // Local state
  const [conversationHistory, setConversationHistory] = useState<ConversationHistory | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionStatus, setSessionStatus] = useState<SessionStatus>('none');
  const [currentInput, setCurrentInput] = useState('');
  const [currentRequestId, setCurrentRequestId] = useState<string | null>(null);

  // Initialize or reset history
  const initializeHistory = useCallback((history: ConversationHistory | null) => {
    const historyToUse = history ?? createEmptyConversationHistory();
    setConversationHistory(historyToUse);
    setIsProcessing(false);
    // Set session status based on whether sessionId exists
    setSessionStatus(historyToUse.sessionId ? 'connected' : 'none');
    setCurrentInput('');
    setCurrentRequestId(null);
  }, []);

  // Reset all state
  const reset = useCallback(() => {
    setConversationHistory(null);
    setIsProcessing(false);
    setSessionStatus('none');
    setCurrentInput('');
    setCurrentRequestId(null);
  }, []);

  // State action functions
  const canSend = useCallback(() => {
    return !isProcessing && currentInput.trim().length > 0;
  }, [isProcessing, currentInput]);

  const addUserMessage = useCallback((message: string) => {
    setConversationHistory((prev) => {
      const base = prev || createEmptyConversationHistory();
      const newMessage: ConversationMessage = {
        id: `msg-${Date.now()}-${Math.random()}`,
        sender: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      return {
        ...base,
        messages: [...base.messages, newMessage],
        updatedAt: new Date().toISOString(),
      };
    });
    setCurrentInput('');
  }, []);

  const addLoadingAiMessage = useCallback((messageId: string) => {
    setConversationHistory((prev) => {
      const base = prev || createEmptyConversationHistory();
      const newMessage: ConversationMessage = {
        id: messageId,
        sender: 'ai',
        content: '',
        timestamp: new Date().toISOString(),
        isLoading: true,
      };
      return {
        ...base,
        messages: [...base.messages, newMessage],
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateMessageContent = useCallback((messageId: string, content: string) => {
    setConversationHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.map((msg) => (msg.id === messageId ? { ...msg, content } : msg)),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateMessageLoadingState = useCallback((messageId: string, isLoading: boolean) => {
    setConversationHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.map((msg) => (msg.id === messageId ? { ...msg, isLoading } : msg)),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const updateMessageErrorState = useCallback(
    (messageId: string, isError: boolean, errorCode?: RefinementErrorCode) => {
      setConversationHistory((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          messages: prev.messages.map((msg) =>
            msg.id === messageId ? { ...msg, isError, errorCode } : msg
          ),
          updatedAt: new Date().toISOString(),
        };
      });
    },
    []
  );

  const updateMessageToolInfo = useCallback((messageId: string, toolInfo: string | null) => {
    setConversationHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.map((msg) => (msg.id === messageId ? { ...msg, toolInfo } : msg)),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const removeMessage = useCallback((messageId: string) => {
    setConversationHistory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        messages: prev.messages.filter((msg) => msg.id !== messageId),
        updatedAt: new Date().toISOString(),
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setConversationHistory(createEmptyConversationHistory());
    setSessionStatus('none');
  }, []);

  const startProcessing = useCallback((requestId: string) => {
    setIsProcessing(true);
    setCurrentRequestId(requestId);
  }, []);

  const finishProcessing = useCallback((sessionId?: string, sessionReconnected?: boolean) => {
    setIsProcessing(false);
    setCurrentRequestId(null);

    // Update session status and sessionId in history
    if (sessionId) {
      const newSessionStatus: SessionStatus = sessionReconnected ? 'reconnected' : 'connected';
      setSessionStatus(newSessionStatus);
      setConversationHistory((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sessionId,
          updatedAt: new Date().toISOString(),
        };
      });
    }
  }, []);

  const handleRefinementSuccess = useCallback(
    (_aiMessage: ConversationMessage, updatedHistory: ConversationHistory) => {
      setConversationHistory(updatedHistory);
      setIsProcessing(false);
      setCurrentRequestId(null);

      // Notify parent to persist the history
      onRefinementSuccess?.(updatedHistory);
    },
    [onRefinementSuccess]
  );

  const handleRefinementFailed = useCallback(() => {
    setIsProcessing(false);
    setCurrentRequestId(null);
  }, []);

  const shouldShowWarning = useCallback(() => {
    return (conversationHistory?.currentIteration ?? 0) >= 20;
  }, [conversationHistory]);

  // Build the complete chat state object
  const chatState: RefinementChatState = useMemo(
    () => ({
      conversationHistory,
      isProcessing,
      sessionStatus,
      currentInput,
      currentRequestId,
      setInput: setCurrentInput,
      canSend,
      addUserMessage,
      addLoadingAiMessage,
      updateMessageContent,
      updateMessageLoadingState,
      updateMessageErrorState,
      updateMessageToolInfo,
      removeMessage,
      clearHistory,
      startProcessing,
      finishProcessing,
      handleRefinementSuccess,
      handleRefinementFailed,
      shouldShowWarning,
    }),
    [
      conversationHistory,
      isProcessing,
      sessionStatus,
      currentInput,
      currentRequestId,
      canSend,
      addUserMessage,
      addLoadingAiMessage,
      updateMessageContent,
      updateMessageLoadingState,
      updateMessageErrorState,
      updateMessageToolInfo,
      removeMessage,
      clearHistory,
      startProcessing,
      finishProcessing,
      handleRefinementSuccess,
      handleRefinementFailed,
      shouldShowWarning,
    ]
  );

  return {
    chatState,
    initializeHistory,
    reset,
  };
}
