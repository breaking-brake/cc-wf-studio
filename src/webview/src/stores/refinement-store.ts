/**
 * Claude Code Workflow Studio - Refinement State Store
 *
 * Zustand store for managing AI-assisted workflow refinement chat state
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.1
 * Updated: Issue #265 - Added codebase index state management
 */

import type { IndexStatus, SearchResult } from '@shared/types/codebase-index';
import type { ClaudeModel } from '@shared/types/messages';
import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';
import { create } from 'zustand';
import { getSetting, setSetting } from '../services/codebase-search-service';

// localStorage key for model selection persistence
const MODEL_STORAGE_KEY = 'cc-wf-studio.refinement.selectedModel';

/**
 * Load selected model from localStorage
 * Returns 'haiku' as default if no value is stored or value is invalid
 */
function loadModelFromStorage(): ClaudeModel {
  try {
    const saved = localStorage.getItem(MODEL_STORAGE_KEY);
    if (saved === 'sonnet' || saved === 'opus' || saved === 'haiku') {
      return saved;
    }
  } catch {
    // localStorage may not be available in some contexts
  }
  return 'haiku'; // Default
}

/**
 * Save selected model to localStorage
 */
function saveModelToStorage(model: ClaudeModel): void {
  try {
    localStorage.setItem(MODEL_STORAGE_KEY, model);
  } catch {
    // localStorage may not be available in some contexts
  }
}

// ============================================================================
// Store State Interface
// ============================================================================

/**
 * Search results attached to a message
 */
export interface MessageSearchResults {
  /** Message ID these results belong to */
  messageId: string;
  /** Search results */
  results: SearchResult[];
  /** Search query used */
  query: string;
  /** Whether this was from @codebase command (true) or auto-search (false) */
  isExplicit: boolean;
}

interface RefinementStore {
  // State
  isOpen: boolean;
  conversationHistory: ConversationHistory | null;
  isProcessing: boolean;
  currentInput: string;
  currentRequestId: string | null;
  useSkills: boolean;
  timeoutSeconds: number;
  selectedModel: ClaudeModel;

  // SubAgentFlow Refinement State
  targetType: 'workflow' | 'subAgentFlow';
  targetSubAgentFlowId: string | null;

  // Codebase Index State (Issue #265)
  indexStatus: IndexStatus | null;
  isIndexBuilding: boolean;
  indexBuildProgress: number;
  messageSearchResults: Map<string, MessageSearchResults>;
  useCodebaseSearch: boolean; // Beta feature - default OFF

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleUseSkills: () => void;
  setTimeoutSeconds: (seconds: number) => void;
  setSelectedModel: (model: ClaudeModel) => void;
  initConversation: () => void;
  loadConversationHistory: (history: ConversationHistory | undefined) => void;
  setTargetContext: (
    targetType: 'workflow' | 'subAgentFlow',
    subAgentFlowId?: string | null
  ) => void;
  setInput: (input: string) => void;
  addUserMessage: (message: string) => void;
  startProcessing: (requestId: string) => void;
  handleRefinementSuccess: (
    aiMessage: ConversationMessage,
    updatedHistory: ConversationHistory
  ) => void;
  handleRefinementFailed: () => void;
  /**
   * Finish processing without replacing conversation history.
   * Use this when frontend has already managed messages (e.g., streaming with explanatory text).
   */
  finishProcessing: () => void;
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
      | 'PROHIBITED_NODE_TYPE'
      | 'UNKNOWN_ERROR'
  ) => void;

  // Phase 3.11: Message removal operation
  removeMessage: (messageId: string) => void;

  // Codebase Index Actions (Issue #265)
  setIndexStatus: (status: IndexStatus | null) => void;
  setIndexBuilding: (isBuilding: boolean, progress?: number) => void;
  setMessageSearchResults: (messageId: string, results: MessageSearchResults) => void;
  getMessageSearchResults: (messageId: string) => MessageSearchResults | undefined;
  clearMessageSearchResults: (messageId: string) => void;
  toggleUseCodebaseSearch: () => void;
  setUseCodebaseSearch: (enabled: boolean) => void;
  loadCodebaseSearchSetting: () => Promise<void>;

  // Computed
  canSend: () => boolean;
  shouldShowWarning: () => boolean;
  isIndexReady: () => boolean;
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
  useSkills: true,
  timeoutSeconds: 0, // Default timeout: Unlimited (0 = no timeout)
  selectedModel: loadModelFromStorage(), // Load from localStorage, default: 'haiku'

  // SubAgentFlow Refinement Initial State
  targetType: 'workflow',
  targetSubAgentFlowId: null,

  // Codebase Index Initial State (Issue #265)
  indexStatus: null,
  isIndexBuilding: false,
  indexBuildProgress: 0,
  messageSearchResults: new Map(),
  useCodebaseSearch: false, // Beta feature - default OFF

  // Actions
  openChat: () => {
    set({ isOpen: true });
  },

  closeChat: () => {
    set({ isOpen: false });
  },

  toggleUseSkills: () => {
    set({ useSkills: !get().useSkills });
  },

  setTimeoutSeconds: (seconds: number) => {
    set({ timeoutSeconds: seconds });
  },

  setSelectedModel: (model: ClaudeModel) => {
    set({ selectedModel: model });
    saveModelToStorage(model);
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

  setTargetContext: (targetType: 'workflow' | 'subAgentFlow', subAgentFlowId?: string | null) => {
    set({
      targetType,
      targetSubAgentFlowId: targetType === 'subAgentFlow' ? (subAgentFlowId ?? null) : null,
    });
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

  finishProcessing: () => {
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
      | 'PROHIBITED_NODE_TYPE'
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

  // Codebase Index Actions (Issue #265)
  setIndexStatus: (status: IndexStatus | null) => {
    set({ indexStatus: status });
  },

  setIndexBuilding: (isBuilding: boolean, progress = 0) => {
    set({ isIndexBuilding: isBuilding, indexBuildProgress: progress });
  },

  setMessageSearchResults: (messageId: string, results: MessageSearchResults) => {
    const currentMap = get().messageSearchResults;
    const newMap = new Map(currentMap);
    newMap.set(messageId, results);
    set({ messageSearchResults: newMap });
  },

  getMessageSearchResults: (messageId: string) => {
    return get().messageSearchResults.get(messageId);
  },

  clearMessageSearchResults: (messageId: string) => {
    const currentMap = get().messageSearchResults;
    const newMap = new Map(currentMap);
    newMap.delete(messageId);
    set({ messageSearchResults: newMap });
  },

  toggleUseCodebaseSearch: () => {
    const newValue = !get().useCodebaseSearch;
    set({ useCodebaseSearch: newValue });
    // Persist to VSCode settings
    setSetting('codebaseReference.enabled', newValue);
  },

  setUseCodebaseSearch: (enabled: boolean) => {
    set({ useCodebaseSearch: enabled });
  },

  loadCodebaseSearchSetting: async () => {
    const value = await getSetting<boolean>('codebaseReference.enabled');
    if (value !== undefined) {
      set({ useCodebaseSearch: value });
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

  isIndexReady: () => {
    const { indexStatus } = get();
    return indexStatus?.state === 'ready';
  },
}));
