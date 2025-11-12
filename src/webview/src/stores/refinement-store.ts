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

  // Actions
  openChat: () => void;
  closeChat: () => void;
  initConversation: () => void;
  loadConversationHistory: (history: ConversationHistory | undefined) => void;
  setInput: (input: string) => void;
  startProcessing: () => void;
  handleRefinementSuccess: (
    aiMessage: ConversationMessage,
    updatedHistory: ConversationHistory
  ) => void;
  handleRefinementFailed: () => void;
  clearHistory: () => void;

  // Computed
  canSend: () => boolean;
  isApproachingLimit: () => boolean;
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

  startProcessing: () => {
    set({ isProcessing: true, currentInput: '' });
  },

  handleRefinementSuccess: (
    aiMessage: ConversationMessage,
    updatedHistory: ConversationHistory
  ) => {
    set({
      conversationHistory: updatedHistory,
      isProcessing: false,
    });
  },

  handleRefinementFailed: () => {
    set({ isProcessing: false });
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

    // Cannot send if iteration limit reached
    if (conversationHistory.currentIteration >= conversationHistory.maxIterations) {
      return false;
    }

    return true;
  },

  isApproachingLimit: () => {
    const { conversationHistory } = get();

    if (!conversationHistory) {
      return false;
    }

    // Approaching limit if 18 or more iterations completed (2 or fewer remaining)
    return conversationHistory.currentIteration >= 18;
  },
}));
