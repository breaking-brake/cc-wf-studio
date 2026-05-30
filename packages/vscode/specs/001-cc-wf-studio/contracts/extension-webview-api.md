# Extension ↔ Webview Communication API Contract

**Version**: 1.0.0
**Date**: 2025-11-01
**Protocol**: VSCode Webview postMessage API

## Overview

このドキュメントは、VSCode Extension Host と Webview 間の通信インターフェース（API契約）を定義します。すべての通信は `postMessage` API を通じて JSON 形式のメッセージで行われます。

---

## Message Format

すべてのメッセージは以下の基本構造に従います:

```typescript
interface Message<T = unknown> {
  type: string;        // メッセージタイプ（アクション識別子）
  payload?: T;         // ペイロード（タイプ固有のデータ）
  requestId?: string;  // リクエストID（レスポンスとの紐付け用）
}
```

---

## 1. Extension → Webview Messages

Extension Host から Webview へ送信されるメッセージです。

### 1.1 `LOAD_WORKFLOW`

ワークフロー定義を Webview に読み込ませます。

**Type**: `LOAD_WORKFLOW`

**Payload**:
```typescript
interface LoadWorkflowPayload {
  workflow: Workflow;
}
```

**Example**:
```json
{
  "type": "LOAD_WORKFLOW",
  "payload": {
    "workflow": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "sample-workflow",
      "description": "サンプルワークフロー",
      "version": "1.0.0",
      "nodes": [...],
      "connections": [...],
      "createdAt": "2025-11-01T00:00:00.000Z",
      "updatedAt": "2025-11-01T12:00:00.000Z"
    }
  }
}
```

**Webview Response**: `WORKFLOW_LOADED` (success) or `ERROR` (failure)

---

### 1.2 `SAVE_SUCCESS`

ワークフロー保存の成功を通知します。

**Type**: `SAVE_SUCCESS`

**Payload**:
```typescript
interface SaveSuccessPayload {
  filePath: string;
  timestamp: string; // ISO 8601
}
```

**Example**:
```json
{
  "type": "SAVE_SUCCESS",
  "payload": {
    "filePath": "/workspace/.vscode/workflows/sample-workflow.json",
    "timestamp": "2025-11-01T12:30:00.000Z"
  }
}
```

---

### 1.3 `EXPORT_SUCCESS`

ワークフローエクスポートの成功を通知します。

**Type**: `EXPORT_SUCCESS`

**Payload**:
```typescript
interface ExportSuccessPayload {
  exportedFiles: string[]; // エクスポートされたファイルパスのリスト
  timestamp: string;       // ISO 8601
}
```

**Example**:
```json
{
  "type": "EXPORT_SUCCESS",
  "payload": {
    "exportedFiles": [
      "/workspace/.claude/agents/data-analysis.md",
      "/workspace/.claude/agents/report-generation.md",
      "/workspace/.claude/commands/sample-workflow.md"
    ],
    "timestamp": "2025-11-01T12:35:00.000Z"
  }
}
```

---

### 1.4 `ERROR`

エラー発生を通知します。

**Type**: `ERROR`

**Payload**:
```typescript
interface ErrorPayload {
  code: string;      // エラーコード
  message: string;   // ユーザー向けエラーメッセージ
  details?: unknown; // 詳細情報（オプション）
}
```

**Example**:
```json
{
  "type": "ERROR",
  "payload": {
    "code": "SAVE_FAILED",
    "message": "ワークフローの保存に失敗しました。ファイルシステムへの書き込み権限を確認してください。",
    "details": {
      "errno": -13,
      "syscall": "open",
      "path": "/workspace/.vscode/workflows/sample-workflow.json"
    }
  }
}
```

**Error Codes**:
- `SAVE_FAILED`: ワークフロー保存失敗
- `LOAD_FAILED`: ワークフロー読み込み失敗
- `EXPORT_FAILED`: エクスポート失敗
- `VALIDATION_ERROR`: バリデーションエラー
- `FILE_EXISTS`: ファイル既存エラー（上書き確認必要）
- `PARSE_ERROR`: JSON/YAMLパースエラー

---

## 2. Webview → Extension Messages

Webview から Extension Host へ送信されるメッセージです。

### 2.1 `SAVE_WORKFLOW`

ワークフロー定義を保存するようリクエストします。

**Type**: `SAVE_WORKFLOW`

**Payload**:
```typescript
interface SaveWorkflowPayload {
  workflow: Workflow;
}
```

**Example**:
```json
{
  "type": "SAVE_WORKFLOW",
  "requestId": "req-001",
  "payload": {
    "workflow": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "name": "sample-workflow",
      "description": "サンプルワークフロー",
      "version": "1.0.0",
      "nodes": [...],
      "connections": [...]
    }
  }
}
```

**Extension Response**: `SAVE_SUCCESS` or `ERROR`

---

### 2.2 `EXPORT_WORKFLOW`

ワークフローを `.claude` 形式にエクスポートするようリクエストします。

**Type**: `EXPORT_WORKFLOW`

**Payload**:
```typescript
interface ExportWorkflowPayload {
  workflow: Workflow;
  overwriteExisting?: boolean; // 既存ファイルを上書きするか（デフォルト: false）
}
```

**Example**:
```json
{
  "type": "EXPORT_WORKFLOW",
  "requestId": "req-002",
  "payload": {
    "workflow": {...},
    "overwriteExisting": false
  }
}
```

**Extension Response**: `EXPORT_SUCCESS` or `ERROR` (code: `FILE_EXISTS`) or `ERROR` (other)

---

### 2.3 `CONFIRM_OVERWRITE`

ファイル上書き確認ダイアログの結果を通知します。

**Type**: `CONFIRM_OVERWRITE`

**Payload**:
```typescript
interface ConfirmOverwritePayload {
  confirmed: boolean;  // true: 上書き許可, false: キャンセル
  filePath: string;    // 対象ファイルパス
}
```

**Example**:
```json
{
  "type": "CONFIRM_OVERWRITE",
  "requestId": "req-002-confirm",
  "payload": {
    "confirmed": true,
    "filePath": "/workspace/.claude/agents/data-analysis.md"
  }
}
```

**Extension Response**: エクスポート処理を継続または中止

---

### 2.4 `LOAD_WORKFLOW_LIST`

利用可能なワークフローリストをリクエストします。

**Type**: `LOAD_WORKFLOW_LIST`

**Payload**: なし

**Example**:
```json
{
  "type": "LOAD_WORKFLOW_LIST",
  "requestId": "req-003"
}
```

**Extension Response**:
```json
{
  "type": "WORKFLOW_LIST_LOADED",
  "requestId": "req-003",
  "payload": {
    "workflows": [
      {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "sample-workflow",
        "description": "サンプルワークフロー",
        "updatedAt": "2025-11-01T12:00:00.000Z"
      }
    ]
  }
}
```

---

### 2.5 `STATE_UPDATE`

Webview の状態変更を Extension に通知します（永続化用）。

**Type**: `STATE_UPDATE`

**Payload**:
```typescript
interface StateUpdatePayload {
  nodes: WorkflowNode[];
  edges: Connection[];
  selectedNodeId?: string | null;
}
```

**Example**:
```json
{
  "type": "STATE_UPDATE",
  "payload": {
    "nodes": [...],
    "edges": [...],
    "selectedNodeId": "node-1"
  }
}
```

**Extension Response**: なし（一方向通知）

---

## 3. Request-Response Pattern

リクエスト-レスポンス型の通信には `requestId` を使用します。

### Flow:

```
Webview                     Extension
  │                              │
  ├─── SAVE_WORKFLOW ────────────>
  │    { requestId: "req-001" }  │
  │                              │
  <──── SAVE_SUCCESS ────────────┤
       { requestId: "req-001" }  │
```

### Implementation Example (Webview):

```typescript
// Webview側
const vscode = acquireVsCodeApi();

function saveWorkflow(workflow: Workflow): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}`;

    // レスポンスハンドラを登録
    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SAVE_SUCCESS') {
          resolve();
        } else if (message.type === 'ERROR') {
          reject(new Error(message.payload.message));
        }
      }
    };

    window.addEventListener('message', handler);

    // リクエスト送信
    vscode.postMessage({
      type: 'SAVE_WORKFLOW',
      requestId,
      payload: { workflow }
    });
  });
}
```

---

## 4. Error Handling

### 4.1 Validation Errors

バリデーションエラーは `ERROR` メッセージで通知され、`code: "VALIDATION_ERROR"` を含みます。

**Example**:
```json
{
  "type": "ERROR",
  "requestId": "req-001",
  "payload": {
    "code": "VALIDATION_ERROR",
    "message": "ワークフロー名が無効です。英数字とハイフン、アンダースコアのみ使用できます。",
    "details": {
      "field": "name",
      "value": "サンプル@ワークフロー",
      "rule": "alphanumeric-hyphen-underscore"
    }
  }
}
```

---

### 4.2 File System Errors

ファイルシステムエラーは `ERROR` メッセージで通知され、システムエラー情報を含みます。

**Example**:
```json
{
  "type": "ERROR",
  "requestId": "req-002",
  "payload": {
    "code": "SAVE_FAILED",
    "message": "ファイルの書き込みに失敗しました。",
    "details": {
      "errno": -13,
      "syscall": "open",
      "path": "/workspace/.vscode/workflows/sample-workflow.json"
    }
  }
}
```

---

### 4.3 File Exists (Overwrite Confirmation)

既存ファイルが存在する場合、`FILE_EXISTS` エラーで通知されます。

**Flow**:
```
Webview                     Extension
  │                              │
  ├─── EXPORT_WORKFLOW ──────────>
  │                              │
  <──── ERROR ───────────────────┤
       { code: "FILE_EXISTS" }   │
  │                              │
  ├─── [User confirms]           │
  │                              │
  ├─── CONFIRM_OVERWRITE ────────>
  │    { confirmed: true }       │
  │                              │
  <──── EXPORT_SUCCESS ──────────┤
```

---

## 5. TypeScript Type Definitions

以下は、Extension と Webview の両側で共有する型定義です（`/src/shared/types/` に配置）。

```typescript
// shared/types/messages.ts

// Base message
export interface Message<T = unknown> {
  type: string;
  payload?: T;
  requestId?: string;
}

// Extension → Webview
export type ExtensionMessage =
  | Message<LoadWorkflowPayload, 'LOAD_WORKFLOW'>
  | Message<SaveSuccessPayload, 'SAVE_SUCCESS'>
  | Message<ExportSuccessPayload, 'EXPORT_SUCCESS'>
  | Message<ErrorPayload, 'ERROR'>
  | Message<WorkflowListPayload, 'WORKFLOW_LIST_LOADED'>;

// Webview → Extension
export type WebviewMessage =
  | Message<SaveWorkflowPayload, 'SAVE_WORKFLOW'>
  | Message<ExportWorkflowPayload, 'EXPORT_WORKFLOW'>
  | Message<ConfirmOverwritePayload, 'CONFIRM_OVERWRITE'>
  | Message<void, 'LOAD_WORKFLOW_LIST'>
  | Message<StateUpdatePayload, 'STATE_UPDATE'>;

// Payloads
export interface LoadWorkflowPayload {
  workflow: Workflow;
}

export interface SaveSuccessPayload {
  filePath: string;
  timestamp: string;
}

export interface ExportSuccessPayload {
  exportedFiles: string[];
  timestamp: string;
}

export interface ErrorPayload {
  code: string;
  message: string;
  details?: unknown;
}

export interface SaveWorkflowPayload {
  workflow: Workflow;
}

export interface ExportWorkflowPayload {
  workflow: Workflow;
  overwriteExisting?: boolean;
}

export interface ConfirmOverwritePayload {
  confirmed: boolean;
  filePath: string;
}

export interface WorkflowListPayload {
  workflows: Array<{
    id: string;
    name: string;
    description?: string;
    updatedAt: string;
  }>;
}

export interface StateUpdatePayload {
  nodes: WorkflowNode[];
  edges: Connection[];
  selectedNodeId?: string | null;
}
```

---

## 6. Contract Testing

以下のテストケースで契約の準拠を検証します:

### 6.1 Extension → Webview

- [x] `LOAD_WORKFLOW` メッセージの受信と Workflow オブジェクトのパース
- [x] `SAVE_SUCCESS` メッセージの受信とUI更新
- [x] `EXPORT_SUCCESS` メッセージの受信とUI更新
- [x] `ERROR` メッセージの受信とエラー表示

### 6.2 Webview → Extension

- [x] `SAVE_WORKFLOW` メッセージの送信と `SAVE_SUCCESS` レスポンスの受信
- [x] `EXPORT_WORKFLOW` メッセージの送信と `EXPORT_SUCCESS` レスポンスの受信
- [x] `EXPORT_WORKFLOW` → `FILE_EXISTS` → `CONFIRM_OVERWRITE` フローの実行
- [x] `LOAD_WORKFLOW_LIST` メッセージの送信と `WORKFLOW_LIST_LOADED` レスポンスの受信

### 6.3 Error Scenarios

- [x] 不正な JSON 形式のメッセージ受信時のエラーハンドリング
- [x] 未知のメッセージタイプ受信時の無視
- [x] タイムアウト（レスポンスが一定時間返らない場合）のハンドリング

---

## 7. References

- VSCode Webview API: https://code.visualstudio.com/api/extension-guides/webview
- Data Model: `/specs/001-cc-wf-studio/data-model.md`
- Implementation Plan: `/specs/001-cc-wf-studio/plan.md`
