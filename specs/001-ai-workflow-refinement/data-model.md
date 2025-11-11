# Data Model: AI-Assisted Workflow Refinement

## Overview

このドキュメントは、ワークフロー改善チャット機能で使用するデータモデルを定義します。既存の`Workflow`型を拡張し、会話履歴を含むようにします。

---

## Entity Definitions

### 1. ConversationHistory

ワークフローに関連付けられた会話履歴全体を表現します。

**Fields:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `schemaVersion` | `string` | Yes | スキーマバージョン（将来の移行用） | Must be `"1.0.0"` |
| `messages` | `ConversationMessage[]` | Yes | 会話メッセージのリスト | Array of valid ConversationMessage |
| `currentIteration` | `number` | Yes | 現在の反復回数 | 0 <= value <= maxIterations |
| `maxIterations` | `number` | Yes | 最大反復回数 | Must be `20` |
| `createdAt` | `string` | Yes | 会話開始日時 | ISO 8601 timestamp |
| `updatedAt` | `string` | Yes | 最終更新日時 | ISO 8601 timestamp |

**Example:**

```json
{
  "schemaVersion": "1.0.0",
  "messages": [
    {
      "id": "msg-123",
      "sender": "user",
      "content": "もっとエラーハンドリングを追加して",
      "timestamp": "2025-11-12T10:30:00.000Z"
    },
    {
      "id": "msg-124",
      "sender": "ai",
      "content": "エラーハンドリングノードを2つ追加しました。",
      "timestamp": "2025-11-12T10:30:25.000Z"
    }
  ],
  "currentIteration": 1,
  "maxIterations": 20,
  "createdAt": "2025-11-12T10:30:00.000Z",
  "updatedAt": "2025-11-12T10:30:25.000Z"
}
```

---

### 2. ConversationMessage

個別の会話メッセージを表現します。

**Fields:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `id` | `string` | Yes | メッセージの一意ID | UUID v4 format |
| `sender` | `'user' \| 'ai'` | Yes | 送信者タイプ | Must be `"user"` or `"ai"` |
| `content` | `string` | Yes | メッセージ内容 | 1 <= length <= 5000 characters |
| `timestamp` | `string` | Yes | メッセージ送信日時 | ISO 8601 timestamp |
| `workflowSnapshotId` | `string` | No | 関連するワークフロースナップショットID（オプション） | UUID v4 format (optional) |

**Validation Rules:**

- `content`: 空文字列は不可、5000文字制限
- `sender`: "user" または "ai" のみ
- `timestamp`: 有効なISO 8601形式

**Example:**

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "sender": "user",
  "content": "このワークフローにエラーハンドリングを追加してください。ネットワークエラーとタイムアウトに対応したいです。",
  "timestamp": "2025-11-12T10:30:00.123Z"
}
```

---

### 3. Workflow (Extended)

既存の`Workflow`型を拡張し、`conversationHistory`フィールドを追加します。

**New Field:**

| Field | Type | Required | Description | Validation |
|-------|------|----------|-------------|------------|
| `conversationHistory` | `ConversationHistory` | No | ワークフローの会話履歴（オプション） | Valid ConversationHistory object |

**Example (Full Workflow with Conversation):**

```json
{
  "id": "workflow-123",
  "name": "my-workflow",
  "description": "Sample workflow",
  "version": "1.0.0",
  "nodes": [...],
  "connections": [...],
  "createdAt": "2025-11-12T10:00:00.000Z",
  "updatedAt": "2025-11-12T10:30:25.000Z",
  "conversationHistory": {
    "schemaVersion": "1.0.0",
    "messages": [
      {
        "id": "msg-001",
        "sender": "user",
        "content": "エラーハンドリングを追加",
        "timestamp": "2025-11-12T10:30:00.000Z"
      },
      {
        "id": "msg-002",
        "sender": "ai",
        "content": "IfElseノードを2つ追加しました",
        "timestamp": "2025-11-12T10:30:20.000Z"
      }
    ],
    "currentIteration": 1,
    "maxIterations": 20,
    "createdAt": "2025-11-12T10:30:00.000Z",
    "updatedAt": "2025-11-12T10:30:20.000Z"
  }
}
```

---

## State Transitions

### Conversation Lifecycle

```
[初期状態: conversationHistory = null]
    ↓
[ユーザーが「AIで修正」ボタンをクリック]
    ↓
[conversationHistory初期化: currentIteration = 0, messages = []]
    ↓
[ユーザーがメッセージを送信]
    ↓
[User messageを追加, currentIteration++]
    ↓
[Extension HostがClaude Code CLIを実行]
    ↓
[AIの応答を受信]
    ↓
[AI messageを追加, updatedAt更新]
    ↓
[ワークフローを自動更新]
    ↓
[繰り返し: currentIteration < maxIterations]
    ↓
[終了条件: currentIteration == maxIterations]
```

### Iteration Counter States

| State | Condition | UI Behavior |
|-------|-----------|-------------|
| Normal | `currentIteration < 18` | 通常表示（カウンター: X/20） |
| Warning | `18 <= currentIteration < 20` | 警告色で表示（カウンター: X/20） |
| Limit Reached | `currentIteration == 20` | 送信ボタン無効化、警告メッセージ表示 |

---

## Validation Rules

### ConversationHistory Validation

```typescript
function validateConversationHistory(history: ConversationHistory): ValidationResult {
  const errors: string[] = [];

  // Schema version check
  if (history.schemaVersion !== '1.0.0') {
    errors.push('Invalid schemaVersion: must be "1.0.0"');
  }

  // Iteration count validation
  if (history.currentIteration < 0 || history.currentIteration > history.maxIterations) {
    errors.push(`Invalid currentIteration: ${history.currentIteration} (must be 0-${history.maxIterations})`);
  }

  if (history.maxIterations !== 20) {
    errors.push('Invalid maxIterations: must be 20');
  }

  // Messages validation
  for (const message of history.messages) {
    const msgErrors = validateConversationMessage(message);
    errors.push(...msgErrors);
  }

  // Timestamp validation
  if (!isValidISOTimestamp(history.createdAt)) {
    errors.push('Invalid createdAt timestamp');
  }

  if (!isValidISOTimestamp(history.updatedAt)) {
    errors.push('Invalid updatedAt timestamp');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
```

### ConversationMessage Validation

```typescript
function validateConversationMessage(message: ConversationMessage): string[] {
  const errors: string[] = [];

  // ID validation (UUID v4)
  if (!isValidUUIDv4(message.id)) {
    errors.push(`Invalid message ID: ${message.id}`);
  }

  // Sender validation
  if (message.sender !== 'user' && message.sender !== 'ai') {
    errors.push(`Invalid sender: ${message.sender} (must be "user" or "ai")`);
  }

  // Content validation
  if (message.content.length === 0) {
    errors.push('Message content cannot be empty');
  }

  if (message.content.length > 5000) {
    errors.push(`Message content too long: ${message.content.length} characters (max 5000)`);
  }

  // Timestamp validation
  if (!isValidISOTimestamp(message.timestamp)) {
    errors.push('Invalid timestamp');
  }

  return errors;
}
```

---

## Relationships

### Entity Relationship Diagram

```
Workflow (1) ----has----> (0..1) ConversationHistory
                              |
                              |
                              has
                              |
                              ↓
                         (0..40) ConversationMessage
```

**Notes:**
- 1つのWorkflowは0または1つのConversationHistoryを持つ（オプショナル）
- 1つのConversationHistoryは0～40個のConversationMessageを持つ（最大20往復）
- ConversationMessageはWorkflowSnapshotを参照できる（オプショナル、将来拡張用）

---

## Storage Considerations

### File Size Estimation

**Assumptions:**
- Average message length: 500 characters (user) + 200 characters (AI)
- 20 iterations (40 messages total)
- JSON overhead: ~30%

**Calculation:**
```
User messages: 20 × 500 chars = 10,000 chars
AI messages: 20 × 200 chars = 4,000 chars
Metadata (timestamps, IDs): ~2,000 chars
Total raw: ~16,000 chars
With JSON overhead: ~21,000 chars ≈ 21KB
```

**Maximum Case:**
- User messages at max length (5000 chars): 20 × 5000 = 100KB
- AI messages at average length: 4KB
- Total: ~135KB (worst case, still acceptable)

### Migration Strategy

**Future Schema Versions:**

When schema version needs to change (e.g., 1.0.0 → 1.1.0):

```typescript
function migrateConversationHistory(history: any): ConversationHistory {
  if (history.schemaVersion === '1.0.0') {
    // Already current version
    return history as ConversationHistory;
  }

  // Future: handle older versions
  // if (history.schemaVersion === '0.9.0') {
  //   return migrate_0_9_to_1_0(history);
  // }

  throw new Error(`Unsupported schema version: ${history.schemaVersion}`);
}
```

---

## Summary

このデータモデルは以下の特徴を持ちます:

1. **シンプル**: 既存のWorkflow構造に最小限の追加
2. **拡張可能**: schemaVersionによる将来の移行対応
3. **バリデーション可能**: 明確な検証ルール
4. **パフォーマンス**: ファイルサイズは許容範囲内（<150KB worst case）
5. **一貫性**: 既存の型定義スタイルに準拠

次のステップ: `contracts/refinement-messages.json`でメッセージプロトコルを定義します。
