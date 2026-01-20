# AI-Assisted Workflow Refinement Chat Feature: Research Document

## 概要

本ドキュメントは、VSCode拡張機能におけるAI支援型ワークフロー改善チャット機能の実装に向けた調査結果をまとめたものです。既存のコードベースには会話履歴の型定義（`conversation.d.ts`）が存在していることを確認しており、それを踏まえた推奨事項を提示します。

---

## 1. Chat UI Best Practices in VSCode Extensions

### Decision（推奨アプローチ）

**カスタムReactベースのチャットUIを構築する**

理由:
- VSCodeの公式Chat APIは存在するが、ワークフロービジュアルエディタとの緊密な統合が必要なため、カスタム実装が最適
- 既存のWebviewアーキテクチャ（React + Zustand）との一貫性を保てる
- ワークフロー編集とチャットの同時表示など、独自のUX要件に対応可能

### 具体的な実装アプローチ

#### 1.1 コンポーネント構造

```
ChatPanel (Container)
├── ChatHeader (Title, Iteration Counter, Close Button)
├── MessageList (Virtualized)
│   ├── MessageBubble (User)
│   ├── MessageBubble (AI)
│   └── WorkflowDiffPreview (Snapshot comparison)
├── TypingIndicator (AI応答中)
└── MessageInput (Textarea with Send Button)
```

#### 1.2 レイアウトパターン

**推奨: モーダルダイアログパターン**
- 既存の`AiGenerationDialog`と同様のモーダルダイアログとして実装
- ワークフローキャンバスの上にオーバーレイ表示
- ユーザーがESCキーで閉じることが可能
- ダイアログを閉じてもチャット履歴は保持される

#### 1.3 アクセシビリティ対応

**必須要件:**
- **ARIA Labels**: `role="log"` for message list, `aria-live="polite"` for new messages
- **Keyboard Navigation**:
  - Tab/Shift+Tab でフォーカス移動
  - Ctrl/Cmd+Enter でメッセージ送信
  - Esc でダイアログを閉じる
- **Screen Reader Support**:
  - メッセージ送信者の明示（"User said: ...", "AI replied: ..."）
  - タイムスタンプの読み上げ対応
- **Color Contrast**: WCAG AA準拠（最低4.5:1）

#### 1.4 VSCode Theme Integration

**既存コードベースとの整合性:**
- VSCode CSS Variables を使用（既存の `AiGenerationDialog.tsx` と同様）
- `var(--vscode-editor-background)`
- `var(--vscode-input-background)`
- `var(--vscode-foreground)`
- `var(--vscode-descriptionForeground)`

### Alternatives Considered（検討した代替案）

#### 1. VSCode Native Chat API
**却下理由:**
- ワークフローエディタとの統合が困難
- UI/UXのカスタマイズ性が低い

#### 2. Split Pane Layout
**却下理由:**
- 既存のダイアログパターンから外れる
- 実装コストが高い
- モーダルダイアログの方がユーザーが集中しやすい

---

## 2. Conversation History Storage in JSON

### Decision（推奨アプローチ）

**ワークフローファイル内に会話履歴を埋め込む**

理由:
- ワークフローと会話履歴の整合性を保ちやすい
- ファイル管理がシンプル（1ワークフロー = 1ファイル）
- エクスポート/インポート時に会話履歴も含まれる

### 具体的なスキーマ設計

#### 2.1 Workflow JSON拡張

```typescript
// src/shared/types/workflow-definition.ts に追加
export interface Workflow {
  id: string;
  name: string;
  version: string;
  nodes: WorkflowNode[];
  connections: Connection[];
  createdAt: string;
  updatedAt: string;

  // 新規追加: 会話履歴（オプショナル）
  conversationHistory?: ConversationHistory;
}

export interface ConversationHistory {
  schemaVersion: '1.0.0';
  messages: ConversationMessage[];
  currentIteration: number;
  maxIterations: 20;
  createdAt: string;
  updatedAt: string;
}

export interface ConversationMessage {
  id: string;
  sender: 'user' | 'ai';
  content: string;
  timestamp: string;
  workflowSnapshotId?: string; // Optional reference to snapshot
}
```

#### 2.2 会話履歴のバージョニング戦略

**バージョン移行戦略:**
1. **後方互換性の維持**: 古いバージョンの会話履歴も読み込み可能
2. **自動マイグレーション**: 読み込み時に最新バージョンに変換
3. **明示的なバージョン記録**: `schemaVersion` フィールドで管理

#### 2.3 パフォーマンス考慮事項

**制約:**
- **推奨反復回数**: 20回（超過時は警告表示）
- **メッセージ長**: 最大5000文字（ユーザー入力）
- **スナップショット**: 初回ワークフロー + 改善版を保持（差分管理は将来対応）

**ファイルサイズ試算（20往復時）:**
```
メッセージ（20往復 × 2 = 40メッセージ × 平均2000文字）: ~160KB
ワークフロースナップショット（簡略化）: 参照IDのみ保存
合計: ~200KB（許容範囲内）
```

**注意事項:**
- 20回以降も送信可能だが、ファイルサイズ増加とパフォーマンス低下のリスクがある
- 警告バナーでユーザーに会話履歴クリアを推奨
- 50往復（100メッセージ）の場合: ~400KB（やや大きいが技術的には可能）

### Alternatives Considered（検討した代替案）

#### 1. 会話履歴を別ファイルに分離
**却下理由:**
- ファイル管理の複雑化
- ワークフローと会話の同期問題

#### 2. IndexedDBへの保存
**却下理由:**
- ファイルとしてエクスポート不可
- バックアップ・共有が困難

---

## 3. Iterative AI Refinement Patterns

### Decision（推奨アプローチ）

**コンテキスト累積型プロンプト + ユーザー承認フロー**

理由:
- 会話履歴全体をコンテキストとして含めることで、一貫性のある改善が可能
- ユーザー承認フローを挟むことで、品質劣化を防止
- 既存のワークフロー生成機能との一貫性

### 具体的なプロンプト構築パターン

#### 3.1 Prompt Template

```typescript
function constructRefinementPrompt(
  currentWorkflow: Workflow,
  conversationHistory: ConversationHistory,
  userRequest: string
): string {
  const previousMessages = conversationHistory.messages.slice(-6); // 直近3往復

  return `You are an expert workflow designer for CC Workflow Studio.

**Task**: Refine the existing workflow based on user's feedback.

**Current Workflow**:
${JSON.stringify(currentWorkflow, null, 2)}

**Conversation History** (last ${previousMessages.length} messages):
${previousMessages.map(msg =>
  `[${msg.sender.toUpperCase()}]: ${msg.content}`
).join('\n')}

**User's Refinement Request**:
${userRequest}

**Refinement Guidelines**:
1. Preserve existing nodes unless explicitly requested to remove
2. Add new nodes ONLY if user asks for new functionality
3. Modify node properties (prompt, conditions, etc.) based on feedback
4. Maintain workflow connectivity and validity
5. Provide a brief summary of changes

**Output Requirements**:
- Output ONLY valid JSON matching the Workflow interface
- Include all required fields (id, name, version, nodes, connections, etc.)
- All validation rules must be satisfied

Output the refined workflow as JSON.`;
}
```

#### 3.2 コンテキストウィンドウ管理

**戦略**:
1. **メッセージのトリミング**: 直近3-5往復のみ含める（6-10メッセージ）
2. **ワークフロー状態**: 最新のワークフローのみ送信
3. **圧縮手法**: 古いメッセージは省略

#### 3.3 品質保証メカニズム

**実装戦略**:

1. **自動適用**: AIの改善結果を自動的にキャンバスに反映（既存のAI生成と同様）
2. **反復回数の追跡**: 現在の反復回数を表示
3. **警告表示**: 20回以降は警告バナーを表示（送信は可能）
4. **バリデーション**: 既存のワークフロー検証機能を使用

### Alternatives Considered（検討した代替案）

#### 1. 承認ダイアログ付きフロー
**却下理由:**
- UXが煩雑になる
- 既存のAI生成機能は自動適用している
- Undo機能で対応可能

---

## 4. React Chat Component Architecture

### Decision（推奨アプローチ）

**Zustandベースの状態管理 + シンプルなスクロール管理**

理由:
- 既存のワークフローストア（Zustand）との一貫性
- 20往復（40メッセージ）程度なら仮想化不要
- シンプルな実装でメンテナンスしやすい

### 具体的なコンポーネント設計

#### 4.1 Zustand Store Structure

```typescript
// src/webview/src/stores/refinement-store.ts (新規作成)
import { create } from 'zustand';
import type { ConversationHistory, ConversationMessage } from '@shared/types/workflow-definition';

interface RefinementStore {
  // State
  isOpen: boolean;
  conversationHistory: ConversationHistory | null;
  isProcessing: boolean;
  currentInput: string;

  // Actions
  openChat: () => void;
  closeChat: () => void;
  initConversation: (workflowId: string) => void;
  sendMessage: (content: string) => void;
  setInput: (input: string) => void;
  clearHistory: () => void;

  // Computed
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

  initConversation: (workflowId) => {
    const newHistory: ConversationHistory = {
      schemaVersion: '1.0.0',
      messages: [],
      currentIteration: 0,
      maxIterations: 20,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    set({ conversationHistory: newHistory });
  },

  sendMessage: async (content) => {
    const history = get().conversationHistory;
    if (!history) return;

    // Add user message
    const userMessage: ConversationMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      content,
      timestamp: new Date().toISOString(),
    };

    set({
      conversationHistory: {
        ...history,
        messages: [...history.messages, userMessage],
        currentIteration: history.currentIteration + 1,
        updatedAt: new Date().toISOString(),
      },
      isProcessing: true,
      currentInput: '',
    });

    // Send to extension host (via message passing)
    // Extension will respond with AI message
  },

  canSend: () => {
    const { conversationHistory, isProcessing, currentInput } = get();
    if (!conversationHistory || isProcessing) return false;
    if (!currentInput.trim()) return false;
    return true; // 常に送信可能（制限なし）
  },

  shouldShowWarning: () => {
    const { conversationHistory } = get();
    if (!conversationHistory) return false;
    return conversationHistory.currentIteration >= 20;
  },
}));
```

#### 4.2 MessageList Component

```typescript
// src/webview/src/components/chat/MessageList.tsx (新規作成)
import { useEffect, useRef } from 'react';
import { useRefinementStore } from '../../stores/refinement-store';
import { MessageBubble } from './MessageBubble';

export function MessageList() {
  const messages = useRefinementStore(state => state.conversationHistory?.messages ?? []);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length]);

  return (
    <div
      ref={listRef}
      role="log"
      aria-live="polite"
      aria-label="Conversation history"
      style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
      }}
    >
      {messages.map(message => (
        <MessageBubble key={message.id} message={message} />
      ))}
    </div>
  );
}
```

#### 4.3 MessageInput Component

```typescript
// src/webview/src/components/chat/MessageInput.tsx (新規作成)
import { useRefinementStore } from '../../stores/refinement-store';
import { useTranslation } from '../../i18n/i18n-context';

export function MessageInput() {
  const { currentInput, setInput, sendMessage, canSend } = useRefinementStore();
  const { t } = useTranslation();

  const handleSend = () => {
    if (!canSend()) return;
    sendMessage(currentInput);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  };

  const maxLength = 5000;
  const remaining = maxLength - currentInput.length;

  return (
    <div style={{ padding: '16px', borderTop: '1px solid var(--vscode-panel-border)' }}>
      <textarea
        value={currentInput}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={t('refinement.inputPlaceholder')}
        disabled={!canSend()}
        maxLength={maxLength}
        rows={3}
        style={{
          width: '100%',
          padding: '8px 12px',
          backgroundColor: 'var(--vscode-input-background)',
          color: 'var(--vscode-input-foreground)',
          border: '1px solid var(--vscode-input-border)',
          borderRadius: '4px',
          resize: 'vertical',
          fontFamily: 'inherit',
          fontSize: '14px',
        }}
        aria-label="Message input"
      />

      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
        <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
          {t('refinement.charactersRemaining', { count: remaining })}
        </span>

        <button
          onClick={handleSend}
          disabled={!canSend()}
          style={{
            padding: '6px 16px',
            backgroundColor: canSend()
              ? 'var(--vscode-button-background)'
              : 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-foreground)',
            border: 'none',
            borderRadius: '4px',
            cursor: canSend() ? 'pointer' : 'not-allowed',
          }}
        >
          {t('refinement.sendButton')}
        </button>
      </div>
    </div>
  );
}
```

### Alternatives Considered（検討した代替案）

#### 1. React Virtuoso（仮想化）
**却下理由:**
- 40メッセージ程度なら仮想化は過剰
- 実装コストが高い
- シンプルなスクロールで十分

---

## 5. 実装ロードマップ

### Phase 1: 基礎インフラ
1. `ConversationHistory`型定義の追加（`workflow-definition.ts`）
2. `refinement-store.ts`の作成
3. Extension ↔ Webview メッセージング拡張（`REFINE_WORKFLOW`, `REFINEMENT_SUCCESS`, `REFINEMENT_FAILED`）
4. 会話履歴のシリアライズ/デシリアライズ機能

### Phase 2: UI Components
1. `MessageList.tsx`
2. `MessageBubble.tsx`
3. `MessageInput.tsx`
4. `IterationCounter.tsx`
5. `RefinementChatPanel.tsx` (Container)
6. Toolbar に「AIで修正」ボタン追加

### Phase 3: AI統合
1. Refinement Prompt構築ロジック
2. Extension Host での `handleRefineWorkflow()` 実装
3. エラーハンドリング・タイムアウト処理

### Phase 4: 国際化・テスト
1. i18nリソース追加（5言語）
2. ユニットテスト
3. 統合テスト

---

## 6. まとめ

**推奨技術スタック:**
- **UI Framework**: React 18.2 + TypeScript 5.3（既存と同じ）
- **State Management**: Zustand（既存の `workflow-store` と統一）
- **Styling**: VSCode CSS Variables（テーマ統合）
- **Accessibility**: ARIA labels + keyboard navigation（WCAG AA準拠）

**推奨アーキテクチャ:**
- **データ構造**: Workflow JSON内に`conversationHistory`フィールドを追加
- **プロンプトパターン**: コンテキスト累積型（直近3-5往復）
- **UI Pattern**: モーダルダイアログ（既存の`AiGenerationDialog`と統一）
