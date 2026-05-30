# Quickstart Guide: AI-Assisted Workflow Refinement

## Overview

このガイドでは、AI支援ワークフロー改善機能の実装方法を段階的に説明します。この機能により、ユーザーはチャット形式でワークフローを繰り返し改善できます。

---

## Prerequisites

- VSCode Extension開発環境がセットアップ済み
- 既存のWorkflow Studioコードベースが動作している
- Claude Code CLIがインストール済み（既存のAI生成機能で使用）
- TypeScript 5.3, React 18.2の知識

---

## Implementation Phases

### Phase 1: 型定義とデータモデル

#### 1.1 型定義の追加

`src/shared/types/workflow-definition.ts`に会話履歴の型を追加:

```typescript
/**
 * Conversation history for workflow refinement
 */
export interface ConversationHistory {
  schemaVersion: '1.0.0';
  messages: ConversationMessage[];
  currentIteration: number;
  maxIterations: 20;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Individual message in conversation
 */
export interface ConversationMessage {
  id: string; // UUID v4
  sender: 'user' | 'ai';
  content: string; // 1-5000 characters
  timestamp: string; // ISO 8601
  workflowSnapshotId?: string; // Optional
}

/**
 * Extended Workflow interface with conversation history
 */
export interface Workflow {
  // ... existing fields ...
  conversationHistory?: ConversationHistory;
}
```

#### 1.2 メッセージ型の追加

`src/shared/types/messages.ts`に新しいメッセージ型を追加:

```typescript
// Webview → Extension Host
export interface RefineWorkflowMessage {
  type: 'REFINE_WORKFLOW';
  requestId: string;
  payload: {
    workflowId: string;
    userMessage: string;
    currentWorkflow: Workflow;
    conversationHistory: ConversationHistory;
    timeoutMs?: number;
  };
}

// Extension Host → Webview (Success)
export interface RefinementSuccessMessage {
  type: 'REFINEMENT_SUCCESS';
  requestId: string;
  payload: {
    refinedWorkflow: Workflow;
    aiMessage: ConversationMessage;
    updatedConversationHistory: ConversationHistory;
    changesSummary?: string;
    executionTimeMs: number;
    timestamp: string;
  };
}

// Extension Host → Webview (Error)
export interface RefinementFailedMessage {
  type: 'REFINEMENT_FAILED';
  requestId: string;
  payload: {
    error: {
      code: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'ITERATION_LIMIT_REACHED' | 'UNKNOWN_ERROR';
      message: string;
      details?: string;
    };
    executionTimeMs: number;
    timestamp: string;
  };
}

// Clear conversation messages
export interface ClearConversationMessage {
  type: 'CLEAR_CONVERSATION';
  requestId: string;
  payload: {
    workflowId: string;
  };
}

export interface ConversationClearedMessage {
  type: 'CONVERSATION_CLEARED';
  requestId: string;
  payload: {
    workflowId: string;
  };
}
```

---

### Phase 2: Extension Host (Backend)

#### 2.1 Refinement Service

`src/extension/services/refinement-service.ts`を作成:

```typescript
import type { Workflow, ConversationHistory, ConversationMessage } from '../../shared/types/workflow-definition';
import { executeClaudeCodeCLI, parseClaudeCodeOutput } from './claude-code-service';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';

/**
 * Construct refinement prompt with conversation context
 */
export function constructRefinementPrompt(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string
): string {
  // Get last 6 messages (3 rounds)
  const recentMessages = conversationHistory.messages.slice(-6);

  return `You are an expert workflow designer for CC Workflow Studio.

**Task**: Refine the existing workflow based on user's feedback.

**Current Workflow**:
${JSON.stringify(currentWorkflow, null, 2)}

**Conversation History** (last ${recentMessages.length} messages):
${recentMessages.map(msg => `[${msg.sender.toUpperCase()}]: ${msg.content}`).join('\n')}

**User's Refinement Request**:
${userMessage}

**Refinement Guidelines**:
1. Preserve existing nodes unless explicitly requested to remove
2. Add new nodes ONLY if user asks for new functionality
3. Modify node properties based on feedback
4. Maintain workflow connectivity and validity

**Output**: Output ONLY valid JSON matching the Workflow interface.`;
}

/**
 * Execute workflow refinement
 */
export async function refineWorkflow(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userMessage: string,
  timeoutMs = 60000
): Promise<{
  success: boolean;
  refinedWorkflow?: Workflow;
  error?: { code: string; message: string; details?: string };
  executionTimeMs: number;
}> {
  const startTime = Date.now();

  try {
    // Step 1: Construct prompt
    const prompt = constructRefinementPrompt(currentWorkflow, conversationHistory, userMessage);

    // Step 2: Execute Claude Code CLI
    const result = await executeClaudeCodeCLI(prompt, timeoutMs);

    if (!result.success || !result.output) {
      return {
        success: false,
        error: result.error,
        executionTimeMs: result.executionTimeMs,
      };
    }

    // Step 3: Parse workflow
    const parsed = parseClaudeCodeOutput(result.output);
    if (!parsed.success || !parsed.workflow) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: 'Failed to parse AI response',
          details: parsed.error,
        },
        executionTimeMs: Date.now() - startTime,
      };
    }

    // Step 4: Validate workflow
    const validation = validateAIGeneratedWorkflow(parsed.workflow);
    if (!validation.isValid) {
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Refined workflow failed validation',
          details: validation.errors.join(', '),
        },
        executionTimeMs: Date.now() - startTime,
      };
    }

    return {
      success: true,
      refinedWorkflow: parsed.workflow,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Unexpected error during refinement',
        details: error instanceof Error ? error.message : String(error),
      },
      executionTimeMs: Date.now() - startTime,
    };
  }
}
```

#### 2.2 Message Handler

`src/extension/commands/workflow-refinement.ts`を作成:

```typescript
import type * as vscode from 'vscode';
import type { RefineWorkflowMessage, RefinementSuccessMessage, RefinementFailedMessage } from '../../shared/types/messages';
import type { ConversationMessage } from '../../shared/types/workflow-definition';
import { refineWorkflow } from '../services/refinement-service';

export async function handleRefineWorkflow(
  message: RefineWorkflowMessage,
  webview: vscode.Webview
): Promise<void> {
  const { requestId, payload } = message;
  const { workflowId, userMessage, currentWorkflow, conversationHistory, timeoutMs } = payload;

  try {
    // Check iteration limit
    if (conversationHistory.currentIteration >= conversationHistory.maxIterations) {
      const failedMessage: RefinementFailedMessage = {
        type: 'REFINEMENT_FAILED',
        requestId,
        payload: {
          error: {
            code: 'ITERATION_LIMIT_REACHED',
            message: `Maximum iteration limit (${conversationHistory.maxIterations}) reached`,
          },
          executionTimeMs: 0,
          timestamp: new Date().toISOString(),
        },
      };
      webview.postMessage(failedMessage);
      return;
    }

    // Execute refinement
    const result = await refineWorkflow(
      currentWorkflow,
      conversationHistory,
      userMessage,
      timeoutMs
    );

    if (!result.success || !result.refinedWorkflow) {
      const failedMessage: RefinementFailedMessage = {
        type: 'REFINEMENT_FAILED',
        requestId,
        payload: {
          error: result.error!,
          executionTimeMs: result.executionTimeMs,
          timestamp: new Date().toISOString(),
        },
      };
      webview.postMessage(failedMessage);
      return;
    }

    // Create AI message
    const aiMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'ai',
      content: 'ワークフローを改善しました。', // TODO: Extract from AI response
      timestamp: new Date().toISOString(),
    };

    // Update conversation history
    const updatedHistory = {
      ...conversationHistory,
      messages: [
        ...conversationHistory.messages,
        {
          id: crypto.randomUUID(),
          sender: 'user' as const,
          content: userMessage,
          timestamp: new Date().toISOString(),
        },
        aiMessage,
      ],
      currentIteration: conversationHistory.currentIteration + 1,
      updatedAt: new Date().toISOString(),
    };

    // Add conversation history to refined workflow
    result.refinedWorkflow.conversationHistory = updatedHistory;

    // Send success response
    const successMessage: RefinementSuccessMessage = {
      type: 'REFINEMENT_SUCCESS',
      requestId,
      payload: {
        refinedWorkflow: result.refinedWorkflow,
        aiMessage,
        updatedConversationHistory: updatedHistory,
        executionTimeMs: result.executionTimeMs,
        timestamp: new Date().toISOString(),
      },
    };
    webview.postMessage(successMessage);
  } catch (error) {
    const failedMessage: RefinementFailedMessage = {
      type: 'REFINEMENT_FAILED',
      requestId,
      payload: {
        error: {
          code: 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
        executionTimeMs: 0,
        timestamp: new Date().toISOString(),
      },
    };
    webview.postMessage(failedMessage);
  }
}
```

#### 2.3 Register Handler

`src/extension/extension.ts`に追加:

```typescript
// Import
import { handleRefineWorkflow } from './commands/workflow-refinement';

// In message handler
webview.onDidReceiveMessage(async (message) => {
  switch (message.type) {
    // ... existing cases ...
    case 'REFINE_WORKFLOW':
      await handleRefineWorkflow(message, panel.webview);
      break;
    // ...
  }
});
```

---

### Phase 3: Webview UI (Frontend)

#### 3.1 Zustand Store

`src/webview/src/stores/refinement-store.ts`を作成:

```typescript
import { create } from 'zustand';
import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';

interface RefinementStore {
  isOpen: boolean;
  conversationHistory: ConversationHistory | null;
  isProcessing: boolean;
  currentInput: string;

  openChat: () => void;
  closeChat: () => void;
  initConversation: () => void;
  setInput: (input: string) => void;
  sendMessage: (content: string) => void;
  handleRefinementSuccess: (aiMessage: ConversationMessage, updatedHistory: ConversationHistory) => void;
  handleRefinementFailed: (error: any) => void;
  clearHistory: () => void;

  canSend: () => boolean;
  isApproachingLimit: () => boolean;
}

export const useRefinementStore = create<RefinementStore>((set, get) => ({
  isOpen: false,
  conversationHistory: null,
  isProcessing: false,
  currentInput: '',

  openChat: () => set({ isOpen: true }),
  closeChat: () => set({ isOpen: false }),

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

  setInput: (input) => set({ currentInput: input }),

  sendMessage: (content) => {
    // This will trigger message to Extension Host
    set({ isProcessing: true, currentInput: '' });
    // Actual sending handled by service layer
  },

  handleRefinementSuccess: (aiMessage, updatedHistory) => {
    set({
      conversationHistory: updatedHistory,
      isProcessing: false,
    });
  },

  handleRefinementFailed: (error) => {
    set({ isProcessing: false });
    // Show error notification
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

  canSend: () => {
    const { conversationHistory, isProcessing, currentInput } = get();
    if (!conversationHistory || isProcessing) return false;
    if (!currentInput.trim()) return false;
    return conversationHistory.currentIteration < conversationHistory.maxIterations;
  },

  isApproachingLimit: () => {
    const { conversationHistory } = get();
    if (!conversationHistory) return false;
    return conversationHistory.currentIteration >= 18;
  },
}));
```

#### 3.2 Chat Panel Component

`src/webview/src/components/dialogs/RefinementChatPanel.tsx`を作成:

```typescript
import { useRefinementStore } from '../../stores/refinement-store';
import { MessageList } from '../chat/MessageList';
import { MessageInput } from '../chat/MessageInput';
import { IterationCounter } from '../chat/IterationCounter';

export function RefinementChatPanel() {
  const { isOpen, closeChat } = useRefinementStore();

  if (!isOpen) return null;

  return (
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
        zIndex: 1000,
      }}
      onClick={closeChat}
    >
      <div
        style={{
          width: '80%',
          maxWidth: '800px',
          height: '80%',
          backgroundColor: 'var(--vscode-editor-background)',
          borderRadius: '8px',
          display: 'flex',
          flexDirection: 'column',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid var(--vscode-panel-border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <h2>AIで修正</h2>
          <IterationCounter />
        </div>

        {/* Message List */}
        <MessageList />

        {/* Input */}
        <MessageInput />
      </div>
    </div>
  );
}
```

#### 3.3 Add Button to Toolbar

`src/webview/src/components/Toolbar.tsx`に追加:

```typescript
import { useRefinementStore } from '../stores/refinement-store';

// Inside Toolbar component
const { openChat, initConversation } = useRefinementStore();

const handleOpenChat = () => {
  initConversation();
  openChat();
};

return (
  <div className="toolbar">
    {/* ... existing buttons ... */}
    <button onClick={handleOpenChat}>
      AIで修正
    </button>
  </div>
);
```

---

### Phase 4: Internationalization

`src/webview/src/i18n/translations/ja.ts`に追加:

```typescript
refinement: {
  title: 'AIで修正',
  inputPlaceholder: 'ワークフローの改善内容を入力してください...',
  sendButton: '送信',
  charactersRemaining: '残り {{count}} 文字',
  iterationCounter: '{{current}}/{{max}} 回',
  approachingLimit: '反復回数の上限に近づいています',
  limitReached: '反復回数の上限に達しました',
  clearHistoryButton: '会話履歴をクリア',
  clearHistoryConfirm: '会話履歴をクリアしますか?',
  errors: {
    TIMEOUT: 'タイムアウトしました。もう一度お試しください。',
    VALIDATION_ERROR: '無効なワークフローが生成されました。',
    ITERATION_LIMIT_REACHED: '反復回数の上限に達しました。',
    // ... other errors
  },
},
```

---

## Testing Strategy

### Unit Tests

```typescript
// src/webview/src/stores/refinement-store.test.ts
describe('RefinementStore', () => {
  it('should initialize conversation', () => {
    const store = useRefinementStore.getState();
    store.initConversation();
    expect(store.conversationHistory).not.toBeNull();
    expect(store.conversationHistory?.currentIteration).toBe(0);
  });

  it('should prevent sending when at limit', () => {
    const store = useRefinementStore.getState();
    store.initConversation();
    // Simulate reaching limit
    store.conversationHistory!.currentIteration = 20;
    expect(store.canSend()).toBe(false);
  });
});
```

### Integration Tests

1. Open chat panel
2. Send refinement request
3. Verify AI response appears
4. Verify workflow updates on canvas
5. Verify conversation history persists

---

## Next Steps

1. Implement Phase 1 (型定義)
2. Implement Phase 2 (Extension Host)
3. Implement Phase 3 (Webview UI)
4. Add internationalization
5. Write tests
6. Manual E2E testing

Refer to `/speckit.tasks` for detailed task breakdown.
