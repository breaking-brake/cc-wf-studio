/**
 * Claude Code Workflow Studio - Refinement State Store
 *
 * Zustand store for managing AI-assisted workflow refinement chat state
 * Based on: /specs/001-ai-workflow-refinement/quickstart.md Section 3.1
 */

import type {
  AiCliProvider,
  ClaudeModel,
  CopilotModel,
  CopilotModelInfo,
} from '@shared/types/messages';
import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';
import { create } from 'zustand';
import { listCopilotModels } from '../services/refinement-service';

// localStorage keys
const MODEL_STORAGE_KEY = 'cc-wf-studio.refinement.selectedModel';
const COPILOT_MODEL_STORAGE_KEY = 'cc-wf-studio.refinement.selectedCopilotModel';
const ALLOWED_TOOLS_STORAGE_KEY = 'cc-wf-studio.refinement.allowedTools';
const PROVIDER_STORAGE_KEY = 'cc-wf-studio.refinement.selectedProvider';
// Note: This key is shared with Toolbar.tsx for the "Copilot (Beta)" toggle
const COPILOT_ENABLED_STORAGE_KEY = 'cc-wf-studio:copilot-beta-enabled';
// Note: This key is shared with Toolbar.tsx for the "Codex (Beta)" toggle
const CODEX_ENABLED_STORAGE_KEY = 'cc-wf-studio:codex-beta-enabled';

// Available tools for Claude Code CLI (used in AI editing allowed tools)
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

// Official Claude Code tools for hooks matcher (PreToolUse, PostToolUse)
// Based on: https://code.claude.com/docs/en/hooks
export const HOOKS_MATCHER_TOOLS = [
  'Bash',
  'BashOutput',
  'Edit',
  'ExitPlanMode',
  'Glob',
  'Grep',
  'KillShell',
  'NotebookEdit',
  'Read',
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
 * Load selected Copilot model from localStorage
 * Returns 'claude-haiku-4.5' as default if no value is stored
 * Note: CopilotModel is now a dynamic string type, so any non-empty string is valid
 */
function loadCopilotModelFromStorage(): CopilotModel {
  try {
    const saved = localStorage.getItem(COPILOT_MODEL_STORAGE_KEY);
    if (saved && saved.trim() !== '') {
      return saved;
    }
  } catch {
    // localStorage may not be available in some contexts
  }
  return 'claude-haiku-4.5'; // Default fallback
}

/**
 * Save selected Copilot model to localStorage
 */
function saveCopilotModelToStorage(model: CopilotModel): void {
  try {
    localStorage.setItem(COPILOT_MODEL_STORAGE_KEY, model);
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

/**
 * Load selected provider from localStorage
 * Returns 'claude-code' as default if no value is stored or value is invalid
 */
function loadProviderFromStorage(): AiCliProvider {
  try {
    const saved = localStorage.getItem(PROVIDER_STORAGE_KEY);
    if (saved === 'claude-code' || saved === 'copilot') {
      return saved;
    }
  } catch {
    // localStorage may not be available in some contexts
  }
  return 'claude-code'; // Default
}

/**
 * Save selected provider to localStorage
 */
function saveProviderToStorage(provider: AiCliProvider): void {
  try {
    localStorage.setItem(PROVIDER_STORAGE_KEY, provider);
  } catch {
    // localStorage may not be available in some contexts
  }
}

/**
 * Load Copilot enabled state from localStorage
 * Returns false as default if no value is stored
 */
function loadCopilotEnabledFromStorage(): boolean {
  try {
    const saved = localStorage.getItem(COPILOT_ENABLED_STORAGE_KEY);
    return saved === 'true';
  } catch {
    // localStorage may not be available in some contexts
  }
  return false;
}

/**
 * Save Copilot enabled state to localStorage
 */
function saveCopilotEnabledToStorage(enabled: boolean): void {
  try {
    localStorage.setItem(COPILOT_ENABLED_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage may not be available in some contexts
  }
}

/**
 * Load Codex enabled state from localStorage
 * Returns false as default if no value is stored
 */
function loadCodexEnabledFromStorage(): boolean {
  try {
    const saved = localStorage.getItem(CODEX_ENABLED_STORAGE_KEY);
    return saved === 'true';
  } catch {
    // localStorage may not be available in some contexts
  }
  return false;
}

/**
 * Save Codex enabled state to localStorage
 */
function saveCodexEnabledToStorage(enabled: boolean): void {
  try {
    localStorage.setItem(CODEX_ENABLED_STORAGE_KEY, String(enabled));
  } catch {
    // localStorage may not be available in some contexts
  }
}

// ============================================================================
// Session Status Type
// ============================================================================

/**
 * Session status for display in UI
 * - 'none': No session (new conversation, no prior context)
 * - 'connected': sessionId exists and is valid (session continuing)
 * - 'reconnected': Session fallback occurred (previous session expired)
 */
export type SessionStatus = 'none' | 'connected' | 'reconnected';

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
  selectedCopilotModel: CopilotModel;
  allowedTools: string[];
  selectedProvider: AiCliProvider;
  isCopilotEnabled: boolean;
  isCodexEnabled: boolean;

  // Dynamic Copilot Models State
  availableCopilotModels: CopilotModelInfo[];
  isFetchingCopilotModels: boolean;
  copilotModelsError: string | null;

  // Session Status
  sessionStatus: SessionStatus;

  // SubAgentFlow Refinement State
  targetType: 'workflow' | 'subAgentFlow';
  targetSubAgentFlowId: string | null;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  toggleUseSkills: () => void;
  setTimeoutSeconds: (seconds: number) => void;
  setSelectedModel: (model: ClaudeModel) => void;
  setSelectedCopilotModel: (model: CopilotModel) => void;
  setAllowedTools: (tools: string[]) => void;
  toggleAllowedTool: (toolName: string) => void;
  resetAllowedTools: () => void;
  setSelectedProvider: (provider: AiCliProvider) => void;
  toggleCopilotEnabled: () => void;
  toggleCodexEnabled: () => void;
  fetchCopilotModels: () => Promise<void>;
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
   * Optionally accepts sessionId to persist for session continuation.
   * @param sessionId - New session ID from CLI
   * @param sessionReconnected - Whether session fallback occurred
   */
  finishProcessing: (sessionId?: string, sessionReconnected?: boolean) => void;
  clearHistory: () => void;

  // Session Status Actions
  /**
   * Set session status to 'reconnected' (called when session fallback occurred)
   */
  setSessionReconnected: () => void;
  /**
   * Clear session status (called when history is cleared)
   */
  clearSessionStatus: () => void;

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

  // ============================================================================
  // DEBUG: Temporary sessionId editor for testing session reconnection
  // TODO: Remove this before merging to main
  // ============================================================================
  debugSetSessionId: (sessionId: string | undefined) => void;
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
  selectedCopilotModel: loadCopilotModelFromStorage(), // Load from localStorage, default: 'gpt-4o'
  allowedTools: loadAllowedToolsFromStorage(), // Load from localStorage, default: DEFAULT_ALLOWED_TOOLS
  selectedProvider: loadProviderFromStorage(), // Load from localStorage, default: 'claude-code'
  isCopilotEnabled: loadCopilotEnabledFromStorage(), // Load from localStorage, default: false
  isCodexEnabled: loadCodexEnabledFromStorage(), // Load from localStorage, default: false

  // Dynamic Copilot Models Initial State
  availableCopilotModels: [],
  isFetchingCopilotModels: false,
  copilotModelsError: null,

  // Session Status Initial State
  sessionStatus: 'none',

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

  toggleChat: () => {
    set({ isOpen: !get().isOpen });
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

  setSelectedCopilotModel: (model: CopilotModel) => {
    set({ selectedCopilotModel: model });
    saveCopilotModelToStorage(model);
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

  setSelectedProvider: (provider: AiCliProvider) => {
    set({ selectedProvider: provider });
    saveProviderToStorage(provider);
  },

  toggleCopilotEnabled: () => {
    const currentEnabled = get().isCopilotEnabled;
    const newEnabled = !currentEnabled;
    saveCopilotEnabledToStorage(newEnabled);

    // When disabling Copilot, reset provider to 'claude-code'
    if (!newEnabled && get().selectedProvider === 'copilot') {
      set({ isCopilotEnabled: newEnabled, selectedProvider: 'claude-code' });
      saveProviderToStorage('claude-code');
    } else {
      set({ isCopilotEnabled: newEnabled });
    }
  },

  toggleCodexEnabled: () => {
    const currentEnabled = get().isCodexEnabled;
    const newEnabled = !currentEnabled;
    saveCodexEnabledToStorage(newEnabled);
    set({ isCodexEnabled: newEnabled });
  },

  fetchCopilotModels: async () => {
    // Avoid fetching if already in progress
    if (get().isFetchingCopilotModels) {
      return;
    }

    set({ isFetchingCopilotModels: true, copilotModelsError: null });

    try {
      const result = await listCopilotModels();

      if (result.available) {
        set({
          availableCopilotModels: result.models,
          isFetchingCopilotModels: false,
          copilotModelsError: null,
        });

        // If current selected model is not in the list, select the first available
        const currentModel = get().selectedCopilotModel;
        const modelExists = result.models.some((m) => m.family === currentModel);
        if (!modelExists && result.models.length > 0) {
          const firstModel = result.models[0].family;
          set({ selectedCopilotModel: firstModel });
          saveCopilotModelToStorage(firstModel);
        }
      } else {
        set({
          availableCopilotModels: [],
          isFetchingCopilotModels: false,
          copilotModelsError: result.unavailableReason || 'Copilot models not available',
        });
      }
    } catch (error) {
      set({
        availableCopilotModels: [],
        isFetchingCopilotModels: false,
        copilotModelsError:
          error instanceof Error ? error.message : 'Failed to fetch Copilot models',
      });
    }
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
      // Set sessionStatus based on whether sessionId exists
      const sessionStatus = history.sessionId ? 'connected' : 'none';
      set({ conversationHistory: history, sessionStatus });
    } else {
      // Initialize new conversation if no history exists
      get().initConversation();
      set({ sessionStatus: 'none' });
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

  finishProcessing: (sessionId?: string, sessionReconnected?: boolean) => {
    const history = get().conversationHistory;
    if (sessionId && history) {
      // Determine session status
      // If sessionReconnected is true, set to 'reconnected', otherwise 'connected'
      const newSessionStatus = sessionReconnected ? 'reconnected' : 'connected';

      // Update sessionId in conversationHistory for session continuation
      set({
        conversationHistory: {
          ...history,
          sessionId,
          updatedAt: new Date().toISOString(),
        },
        isProcessing: false,
        currentRequestId: null,
        sessionStatus: newSessionStatus,
      });
    } else {
      set({ isProcessing: false, currentRequestId: null });
    }
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
          sessionId: undefined, // Clear session for fresh start
        },
        sessionStatus: 'none', // Clear session status for fresh start
      });
    }
  },

  // Session Status Actions
  setSessionReconnected: () => {
    set({ sessionStatus: 'reconnected' });
  },

  clearSessionStatus: () => {
    set({ sessionStatus: 'none' });
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

  // ============================================================================
  // DEBUG: Temporary sessionId editor for testing session reconnection
  // TODO: Remove this before merging to main
  // ============================================================================
  debugSetSessionId: (sessionId: string | undefined) => {
    const history = get().conversationHistory;
    if (history) {
      console.log('[DEBUG] Setting sessionId:', { previous: history.sessionId, new: sessionId });
      set({
        conversationHistory: {
          ...history,
          sessionId: sessionId || undefined,
          updatedAt: new Date().toISOString(),
        },
        sessionStatus: sessionId ? 'connected' : 'none',
      });
    }
  },
}));
