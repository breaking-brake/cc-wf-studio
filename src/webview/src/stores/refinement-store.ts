/**
 * Claude Code Workflow Studio - Refinement State Store
 *
 * Zustand store for managing AI-assisted workflow refinement chat state
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.1
 */

import type { ClaudeModel } from '@shared/types/messages';
import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';
import { create } from 'zustand';

// localStorage keys
const MODEL_STORAGE_KEY = 'cc-wf-studio.refinement.selectedModel';
const ALLOWED_TOOLS_STORAGE_KEY = 'cc-wf-studio.refinement.allowedTools';

// Available tools for Claude Code CLI
export const AVAILABLE_TOOLS = [
  'AskUserQuestion',
  'Bash',
  'BashOutput',
  'Edit',
  'ExitPlanMode',
  'Glob',
  'Grep',
  'KillShell',
  'MCPSearch',
  'NotebookEdit',
  'Read',
  'Skill',
  'SlashCommand',
  'Task',
  'TodoWrite',
  'WebFetch',
  'WebSearch',
  'Write',
] as const;

// Default allowed tools (read-only tools for security)
export const DEFAULT_ALLOWED_TOOLS: string[] = [
  'Read',
  'Grep',
  'Glob',
  'WebSearch',
  'WebFetch',
  'TodoWrite',
];

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

/**
 * Load allowed tools from localStorage
 * Returns DEFAULT_ALLOWED_TOOLS if no value is stored or value is invalid
 */
function loadAllowedToolsFromStorage(): string[] {
  try {
    const saved = localStorage.getItem(ALLOWED_TOOLS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.every((t) => typeof t === 'string')) {
        return parsed;
      }
    }
  } catch {
    // localStorage may not be available or JSON parse failed
  }
  return DEFAULT_ALLOWED_TOOLS;
}

/**
 * Save allowed tools to localStorage
 */
function saveAllowedToolsToStorage(tools: string[]): void {
  try {
    localStorage.setItem(ALLOWED_TOOLS_STORAGE_KEY, JSON.stringify(tools));
  } catch {
    // localStorage may not be available in some contexts
  }
}

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
  useSkills: boolean;
  timeoutSeconds: number;
  selectedModel: ClaudeModel;
  allowedTools: string[];

  // SubAgentFlow Refinement State
  targetType: 'workflow' | 'subAgentFlow';
  targetSubAgentFlowId: string | null;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleUseSkills: () => void;
  setTimeoutSeconds: (seconds: number) => void;
  setSelectedModel: (model: ClaudeModel) => void;
  setAllowedTools: (tools: string[]) => void;
  toggleAllowedTool: (toolName: string) => void;
  resetAllowedTools: () => void;
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

  // Tool Execution Actions (Tool Loading Animation)
  updateMessageToolInfo: (messageId: string, toolInfo: string | null) => void;

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
  useSkills: true,
  timeoutSeconds: 0, // Default timeout: None (0 = use system guard)
  selectedModel: loadModelFromStorage(), // Load from localStorage, default: 'haiku'
  allowedTools: loadAllowedToolsFromStorage(), // Load from localStorage, default: DEFAULT_ALLOWED_TOOLS

  // SubAgentFlow Refinement Initial State
  targetType: 'workflow',
  targetSubAgentFlowId: null,

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

  setAllowedTools: (tools: string[]) => {
    set({ allowedTools: tools });
    saveAllowedToolsToStorage(tools);
  },

  toggleAllowedTool: (toolName: string) => {
    const currentTools = get().allowedTools;
    const newTools = currentTools.includes(toolName)
      ? currentTools.filter((t) => t !== toolName)
      : [...currentTools, toolName];
    set({ allowedTools: newTools });
    saveAllowedToolsToStorage(newTools);
  },

  resetAllowedTools: () => {
    set({ allowedTools: DEFAULT_ALLOWED_TOOLS });
    saveAllowedToolsToStorage(DEFAULT_ALLOWED_TOOLS);
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

  // Tool Execution Actions (Tool Loading Animation)
  updateMessageToolInfo: (messageId: string, toolInfo: string | null) => {
    const history = get().conversationHistory;
    if (!history) {
      return;
    }

    const updatedMessages = history.messages.map((msg) =>
      msg.id === messageId ? { ...msg, toolInfo } : msg
    );

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
