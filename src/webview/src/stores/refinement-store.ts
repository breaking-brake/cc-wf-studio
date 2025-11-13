/**
 * Claude Code Workflow Studio - Refinement State Store
 *
 * Zustand store for managing AI-assisted workflow refinement chat state
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.1
 */

import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';
import { create } from 'zustand';

// ============================================================================
// Store State Interface
// ============================================================================

interface RefinementStore {
  // State
  isOpen: boolean;
  conversationHistory: ConversationHistory | null;
  isProcessing: boolean;
  currentInput: string;
  currentRequestId: string | null;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  initConversation: () => void;
  loadConversationHistory: (history: ConversationHistory | undefined) => void;
  setInput: (input: string) => void;
  addUserMessage: (message: string) => void;
  startProcessing: (requestId: string) => void;
  handleRefinementSuccess: (
    aiMessage: ConversationMessage,
    updatedHistory: ConversationHistory
  ) => void;
  handleRefinementFailed: () => void;
  clearHistory: () => void;

  // Phase 3.7: Message operations for loading state
  addLoadingAiMessage: (messageId: string) => void;
  updateMessageLoadingState: (messageId: string, isLoading: boolean) => void;
  updateMessageContent: (messageId: string, content: string) => void;

  // Phase 3.8: Error state operations
  updateMessageErrorState: (
    messageId: string,
    isError: boolean,
    errorCode?:
      | 'COMMAND_NOT_FOUND'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'UNKNOWN_ERROR'
  ) => void;

  // Phase 3.11: Message removal operation
  removeMessage: (messageId: string) => void;

  // Computed
  canSend: () => boolean;
  shouldShowWarning: () => boolean;
}

// ============================================================================
// Store Implementation
// ============================================================================

/**
 * Zustand store for refinement chat state management
 */
export const useRefinementStore = create<RefinementStore>((set, get) => ({
  // Initial State
  isOpen: false,
  conversationHistory: null,
  isProcessing: false,
  currentInput: '',
  currentRequestId: null,

  // Actions
  openChat: () => {
    set({ isOpen: true });
  },

  closeChat: () => {
    set({ isOpen: false });
  },

  initConversation: () => {
    const history: ConversationHistory = {
      schemaVersion: '1.0.0',
      messages: [],
      currentIteration: 0,
      maxIterations: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ conversationHistory: history });
  },

  loadConversationHistory: (history: ConversationHistory | undefined) => {
    if (history) {
      set({ conversationHistory: history });
    } else {
      // Initialize new conversation if no history exists
      get().initConversation();
    }
  },

  setInput: (input: string) => {
    set({ currentInput: input });
  },

  addUserMessage: (message: string) => {
    const history = get().conversationHistory;
    if (!history) {
      return;
    }

    const userMessage: ConversationMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      sender: 'user',
      content: message,
      timestamp: new Date().toISOString(),
    };

    set({
      conversationHistory: {
        ...history,
        messages: [...history.messages, userMessage],
        updatedAt: new Date().toISOString(),
      },
      currentInput: '',
    });
  },

  startProcessing: (requestId: string) => {
    set({ isProcessing: true, currentRequestId: requestId });
  },

  handleRefinementSuccess: (
    _aiMessage: ConversationMessage,
    updatedHistory: ConversationHistory
  ) => {
    set({
      conversationHistory: updatedHistory,
      isProcessing: false,
      currentRequestId: null,
    });
  },

  handleRefinementFailed: () => {
    set({ isProcessing: false, currentRequestId: null });
  },

  clearHistory: () => {
    const history = get().conversationHistory;
    if (history) {
      set({
        conversationHistory: {
          ...history,
          messages: [],
          currentIteration: 0,
          updatedAt: new Date().toISOString(),
        },
      });
    }
  },

  // Phase 3.7: Message operations
  addLoadingAiMessage: (messageId: string) => {
    const history = get().conversationHistory;
    if (!history) {
      return;
    }

    const loadingMessage: ConversationMessage = {
      id: messageId,
      sender: 'ai',
      content: '', // Empty content during loading
      timestamp: new Date().toISOString(),
      isLoading: true,
    };

    set({
      conversationHistory: {
        ...history,
        messages: [...history.messages, loadingMessage],
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateMessageLoadingState: (messageId: string, isLoading: boolean) => {
    const history = get().conversationHistory;
    if (!history) {
      return;
    }

    const updatedMessages = history.messages.map((msg) =>
      msg.id === messageId ? { ...msg, isLoading } : msg
    );

    set({
      conversationHistory: {
        ...history,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  updateMessageContent: (messageId: string, content: string) => {
    const history = get().conversationHistory;
    if (!history) {
      return;
    }

    const updatedMessages = history.messages.map((msg) =>
      msg.id === messageId ? { ...msg, content } : msg
    );

    set({
      conversationHistory: {
        ...history,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  // Phase 3.8: Error state operations
  updateMessageErrorState: (
    messageId: string,
    isError: boolean,
    errorCode?:
      | 'COMMAND_NOT_FOUND'
      | 'TIMEOUT'
      | 'PARSE_ERROR'
      | 'VALIDATION_ERROR'
      | 'UNKNOWN_ERROR'
  ) => {
    const history = get().conversationHistory;
    if (!history) {
      return;
    }

    const updatedMessages = history.messages.map((msg) =>
      msg.id === messageId ? { ...msg, isError, errorCode, isLoading: false } : msg
    );

    set({
      conversationHistory: {
        ...history,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  // Phase 3.11: Message removal operation
  removeMessage: (messageId: string) => {
    const history = get().conversationHistory;
    if (!history) {
      return;
    }

    const updatedMessages = history.messages.filter((msg) => msg.id !== messageId);

    set({
      conversationHistory: {
        ...history,
        messages: updatedMessages,
        updatedAt: new Date().toISOString(),
      },
    });
  },

  // Computed Methods
  canSend: () => {
    const { conversationHistory, isProcessing, currentInput } = get();

    // Cannot send if processing or no input
    if (isProcessing) {
      return false;
    }

    if (!currentInput.trim()) {
      return false;
    }

    // Cannot send if no conversation history initialized
    if (!conversationHistory) {
      return false;
    }

    // No hard limit - always allow sending if other conditions are met
    return true;
  },

  shouldShowWarning: () => {
    const { conversationHistory } = get();

    if (!conversationHistory) {
      return false;
    }

    // Show warning when 20 or more iterations have been completed
    return conversationHistory.currentIteration >= 20;
  },
}));
