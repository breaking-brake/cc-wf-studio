/**
 * Shared types for Refinement Chat State
 *
 * Used by RefinementChatPanel (controlled component) and its parent components
 * (App.tsx for main workflow, SubAgentFlowDialog for SubAgentFlow)
 */

import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';

/** Error codes for refinement failures */
export type RefinementErrorCode =
  | 'COMMAND_NOT_FOUND'
  | 'TIMEOUT'
  | 'PARSE_ERROR'
  | 'VALIDATION_ERROR'
  | 'PROHIBITED_NODE_TYPE'
  | 'UNKNOWN_ERROR';

/**
 * Refinement Chat State
 *
 * Contains all state and actions needed for the refinement chat panel.
 * This type is used to make RefinementChatPanel a controlled component.
 */
export interface RefinementChatState {
  // State
  conversationHistory: ConversationHistory | null;
  isProcessing: boolean;
  currentInput: string;
  currentRequestId: string | null;

  // Actions
  setInput: (input: string) => void;
  canSend: () => boolean;
  addUserMessage: (message: string) => void;
  addLoadingAiMessage: (messageId: string) => void;
  updateMessageContent: (messageId: string, content: string) => void;
  updateMessageLoadingState: (messageId: string, isLoading: boolean) => void;
  updateMessageErrorState: (
    messageId: string,
    isError: boolean,
    errorCode?: RefinementErrorCode
  ) => void;
  updateMessageToolInfo: (messageId: string, toolInfo: string | null) => void;
  removeMessage: (messageId: string) => void;
  clearHistory: () => void;
  startProcessing: (requestId: string) => void;
  finishProcessing: (sessionId?: string) => void;
  handleRefinementSuccess: (
    aiMessage: ConversationMessage,
    updatedHistory: ConversationHistory
  ) => void;
  handleRefinementFailed: () => void;
  shouldShowWarning: () => boolean;
}
