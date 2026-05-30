# Extension Host API Contracts

**Feature**: 001-slack-workflow-sharing
**Date**: 2025-11-22

## 概要

このドキュメントは、VS Code Extension HostとWebview UI間のメッセージパッシングAPIを定義します。

---

## 1. Webview → Extension Host (Commands)

### 1.1 SLACK_CONNECT

Slackワークスペースへの接続を開始します（OAuth認証フロー）。

**Message Type**: `SLACK_CONNECT`

**Payload**:
```typescript
interface SlackConnectCommand {
  type: 'SLACK_CONNECT';
  payload: Record<string, never>; // 空オブジェクト
}
```

**Example**:
```typescript
vscode.postMessage({
  type: 'SLACK_CONNECT',
  payload: {}
});
```

**Extension Host Response**:
- Success: `SLACK_CONNECT_SUCCESS`
- Failure: `SLACK_CONNECT_FAILED`

---

### 1.2 SLACK_DISCONNECT

Slackワークスペースとの接続を切断します（トークン削除）。

**Message Type**: `SLACK_DISCONNECT`

**Payload**:
```typescript
interface SlackDisconnectCommand {
  type: 'SLACK_DISCONNECT';
  payload: Record<string, never>;
}
```

**Example**:
```typescript
vscode.postMessage({
  type: 'SLACK_DISCONNECT',
  payload: {}
});
```

**Extension Host Response**:
- Success: `SLACK_DISCONNECT_SUCCESS`
- Failure: `SLACK_DISCONNECT_FAILED`

---

### 1.3 GET_SLACK_CHANNELS

Slackチャンネル一覧を取得します。

**Message Type**: `GET_SLACK_CHANNELS`

**Payload**:
```typescript
interface GetSlackChannelsCommand {
  type: 'GET_SLACK_CHANNELS';
  payload: {
    includePrivate?: boolean; // プライベートチャンネルを含めるか (default: true)
    onlyMember?: boolean;     // メンバーとして参加しているチャンネルのみ (default: true)
  };
}
```

**Example**:
```typescript
vscode.postMessage({
  type: 'GET_SLACK_CHANNELS',
  payload: {
    includePrivate: true,
    onlyMember: true
  }
});
```

**Extension Host Response**:
- Success: `GET_SLACK_CHANNELS_SUCCESS`
- Failure: `GET_SLACK_CHANNELS_FAILED`

---

### 1.4 SHARE_WORKFLOW_TO_SLACK

ワークフローをSlackチャンネルに共有します。

**Message Type**: `SHARE_WORKFLOW_TO_SLACK`

**Payload**:
```typescript
interface ShareWorkflowToSlackCommand {
  type: 'SHARE_WORKFLOW_TO_SLACK';
  payload: {
    workflowId: string;           // 共有するワークフローのID
    workflowName: string;         // ワークフロー名
    channelId: string;            // 共有先チャンネルID
    description?: string;         // ワークフローの説明 (optional)
    overrideSensitiveWarning?: boolean; // 機密情報警告を無視 (default: false)
  };
}
```

**Example**:
```typescript
vscode.postMessage({
  type: 'SHARE_WORKFLOW_TO_SLACK',
  payload: {
    workflowId: 'uuid-1234-5678',
    workflowName: 'My Data Processing Workflow',
    channelId: 'C01234ABCD',
    description: 'Workflow for daily data processing tasks',
    overrideSensitiveWarning: false
  }
});
```

**Extension Host Response**:
- Success: `SHARE_WORKFLOW_SUCCESS`
- Warning (sensitive data detected): `SENSITIVE_DATA_WARNING`
- Failure: `SHARE_WORKFLOW_FAILED`

---

### 1.5 IMPORT_WORKFLOW_FROM_SLACK

SlackからワークフローをインポートするFします。

**Message Type**: `IMPORT_WORKFLOW_FROM_SLACK`

**Payload**:
```typescript
interface ImportWorkflowFromSlackCommand {
  type: 'IMPORT_WORKFLOW_FROM_SLACK';
  payload: {
    workflowId: string;      // インポートするワークフローのID
    fileId: string;          // Slack File ID
    messageTs: string;       // Slackメッセージのタイムスタンプ
    channelId: string;       // チャンネルID
    overwriteExisting?: boolean; // 既存ファイルを上書き (default: false)
  };
}
```

**Example**:
```typescript
vscode.postMessage({
  type: 'IMPORT_WORKFLOW_FROM_SLACK',
  payload: {
    workflowId: 'uuid-1234-5678',
    fileId: 'F01234ABCD',
    messageTs: '1234567890.123456',
    channelId: 'C01234ABCD',
    overwriteExisting: false
  }
});
```

**Extension Host Response**:
- Success: `IMPORT_WORKFLOW_SUCCESS`
- Confirmation required: `IMPORT_WORKFLOW_CONFIRM_OVERWRITE`
- Failure: `IMPORT_WORKFLOW_FAILED`

---

### 1.6 SEARCH_SLACK_WORKFLOWS

Slackで過去に共有されたワークフローを検索します。

**Message Type**: `SEARCH_SLACK_WORKFLOWS`

**Payload**:
```typescript
interface SearchSlackWorkflowsCommand {
  type: 'SEARCH_SLACK_WORKFLOWS';
  payload: {
    query?: string;          // 検索キーワード (optional)
    channelId?: string;      // 特定チャンネル内を検索 (optional)
    authorName?: string;     // 作成者名で絞り込み (optional)
    fromDate?: string;       // 開始日 (ISO 8601) (optional)
    toDate?: string;         // 終了日 (ISO 8601) (optional)
    limit?: number;          // 取得件数 (default: 20, max: 100)
  };
}
```

**Example**:
```typescript
vscode.postMessage({
  type: 'SEARCH_SLACK_WORKFLOWS',
  payload: {
    query: 'data processing',
    channelId: 'C01234ABCD',
    fromDate: '2025-11-01T00:00:00Z',
    limit: 20
  }
});
```

**Extension Host Response**:
- Success: `SEARCH_SLACK_WORKFLOWS_SUCCESS`
- Failure: `SEARCH_SLACK_WORKFLOWS_FAILED`

---

## 2. Extension Host → Webview (Events)

### 2.1 SLACK_CONNECT_SUCCESS

Slack接続成功時に送信されます。

**Message Type**: `SLACK_CONNECT_SUCCESS`

**Payload**:
```typescript
interface SlackConnectSuccessEvent {
  type: 'SLACK_CONNECT_SUCCESS';
  payload: {
    workspaceId: string;
    workspaceName: string;
    userId: string;
    authorizedAt: string; // ISO 8601
  };
}
```

**Example**:
```json
{
  "type": "SLACK_CONNECT_SUCCESS",
  "payload": {
    "workspaceId": "T01234IJKL",
    "workspaceName": "My Team Workspace",
    "userId": "U01234ABCD",
    "authorizedAt": "2025-11-22T10:00:00Z"
  }
}
```

---

### 2.2 SLACK_CONNECT_FAILED

Slack接続失敗時に送信されます。

**Message Type**: `SLACK_CONNECT_FAILED`

**Payload**:
```typescript
interface SlackConnectFailedEvent {
  type: 'SLACK_CONNECT_FAILED';
  payload: {
    errorCode: string;
    errorMessage: string;
  };
}
```

**Error Codes**:
- `USER_CANCELLED`: ユーザーが認証をキャンセル
- `OAUTH_FAILED`: OAuth認証失敗
- `NETWORK_ERROR`: ネットワークエラー
- `UNKNOWN_ERROR`: その他のエラー

**Example**:
```json
{
  "type": "SLACK_CONNECT_FAILED",
  "payload": {
    "errorCode": "USER_CANCELLED",
    "errorMessage": "ユーザーが認証をキャンセルしました。"
  }
}
```

---

### 2.3 GET_SLACK_CHANNELS_SUCCESS

チャンネル一覧取得成功時に送信されます。

**Message Type**: `GET_SLACK_CHANNELS_SUCCESS`

**Payload**:
```typescript
interface GetSlackChannelsSuccessEvent {
  type: 'GET_SLACK_CHANNELS_SUCCESS';
  payload: {
    channels: SlackChannel[];
  };
}

interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount?: number;
  purpose?: string;
  topic?: string;
}
```

**Example**:
```json
{
  "type": "GET_SLACK_CHANNELS_SUCCESS",
  "payload": {
    "channels": [
      {
        "id": "C01234ABCD",
        "name": "general",
        "isPrivate": false,
        "isMember": true,
        "memberCount": 25,
        "purpose": "General discussions",
        "topic": "Team announcements"
      },
      {
        "id": "C56789EFGH",
        "name": "project-alpha",
        "isPrivate": true,
        "isMember": true,
        "memberCount": 5
      }
    ]
  }
}
```

---

### 2.4 SENSITIVE_DATA_WARNING

機密情報が検出された場合に送信されます（ユーザーに確認を求める）。

**Message Type**: `SENSITIVE_DATA_WARNING`

**Payload**:
```typescript
interface SensitiveDataWarningEvent {
  type: 'SENSITIVE_DATA_WARNING';
  payload: {
    workflowId: string;
    findings: SensitiveDataFinding[];
  };
}

interface SensitiveDataFinding {
  type: string;           // 例: 'AWS_ACCESS_KEY', 'API_KEY'
  maskedValue: string;    // 例: 'AKIA...X7Z9'
  position: number;
  context?: string;
  severity: 'low' | 'medium' | 'high';
}
```

**Example**:
```json
{
  "type": "SENSITIVE_DATA_WARNING",
  "payload": {
    "workflowId": "uuid-1234-5678",
    "findings": [
      {
        "type": "AWS_ACCESS_KEY",
        "maskedValue": "AKIA...X7Z9",
        "position": 1234,
        "context": "...\"aws_access_key\": \"AKIA1234...\"...",
        "severity": "high"
      },
      {
        "type": "API_KEY",
        "maskedValue": "sk-p...def9",
        "position": 5678,
        "severity": "medium"
      }
    ]
  }
}
```

**User Action Required**: ユーザーは「続行」または「キャンセル」を選択

---

### 2.5 SHARE_WORKFLOW_SUCCESS

ワークフロー共有成功時に送信されます。

**Message Type**: `SHARE_WORKFLOW_SUCCESS`

**Payload**:
```typescript
interface ShareWorkflowSuccessEvent {
  type: 'SHARE_WORKFLOW_SUCCESS';
  payload: {
    workflowId: string;
    channelId: string;
    channelName: string;
    messageTs: string;
    fileId: string;
    permalink: string; // Slackメッセージへの直リンク
  };
}
```

**Example**:
```json
{
  "type": "SHARE_WORKFLOW_SUCCESS",
  "payload": {
    "workflowId": "uuid-1234-5678",
    "channelId": "C01234ABCD",
    "channelName": "general",
    "messageTs": "1234567890.123456",
    "fileId": "F01234ABCD",
    "permalink": "https://myteam.slack.com/archives/C01234ABCD/p1234567890123456"
  }
}
```

---

### 2.6 SHARE_WORKFLOW_FAILED

ワークフロー共有失敗時に送信されます。

**Message Type**: `SHARE_WORKFLOW_FAILED`

**Payload**:
```typescript
interface ShareWorkflowFailedEvent {
  type: 'SHARE_WORKFLOW_FAILED';
  payload: {
    workflowId: string;
    errorCode: string;
    errorMessage: string;
  };
}
```

**Error Codes**:
- `NOT_AUTHENTICATED`: Slack未接続
- `CHANNEL_NOT_FOUND`: チャンネルが存在しない
- `NOT_IN_CHANNEL`: Botがチャンネルメンバーではない
- `FILE_TOO_LARGE`: ファイルサイズ超過 (1MB)
- `RATE_LIMITED`: Slack API Rate Limit超過
- `NETWORK_ERROR`: ネットワークエラー
- `UNKNOWN_ERROR`: その他のエラー

**Example**:
```json
{
  "type": "SHARE_WORKFLOW_FAILED",
  "payload": {
    "workflowId": "uuid-1234-5678",
    "errorCode": "NOT_IN_CHANNEL",
    "errorMessage": "Botがチャンネルに参加していません。チャンネルに招待してください。"
  }
}
```

---

### 2.7 IMPORT_WORKFLOW_CONFIRM_OVERWRITE

既存ファイルが存在する場合に確認を求めます。

**Message Type**: `IMPORT_WORKFLOW_CONFIRM_OVERWRITE`

**Payload**:
```typescript
interface ImportWorkflowConfirmOverwriteEvent {
  type: 'IMPORT_WORKFLOW_CONFIRM_OVERWRITE';
  payload: {
    workflowId: string;
    existingFilePath: string;
  };
}
```

**Example**:
```json
{
  "type": "IMPORT_WORKFLOW_CONFIRM_OVERWRITE",
  "payload": {
    "workflowId": "uuid-1234-5678",
    "existingFilePath": "/Users/.../workflows/my-workflow.json"
  }
}
```

**User Action Required**: ユーザーは「上書き」または「キャンセル」を選択

---

### 2.8 IMPORT_WORKFLOW_SUCCESS

ワークフローインポート成功時に送信されます。

**Message Type**: `IMPORT_WORKFLOW_SUCCESS`

**Payload**:
```typescript
interface ImportWorkflowSuccessEvent {
  type: 'IMPORT_WORKFLOW_SUCCESS';
  payload: {
    workflowId: string;
    filePath: string;
    workflowName: string;
  };
}
```

**Example**:
```json
{
  "type": "IMPORT_WORKFLOW_SUCCESS",
  "payload": {
    "workflowId": "uuid-1234-5678",
    "filePath": "/Users/.../workflows/my-workflow.json",
    "workflowName": "My Data Processing Workflow"
  }
}
```

---

### 2.9 SEARCH_SLACK_WORKFLOWS_SUCCESS

ワークフロー検索成功時に送信されます。

**Message Type**: `SEARCH_SLACK_WORKFLOWS_SUCCESS`

**Payload**:
```typescript
interface SearchSlackWorkflowsSuccessEvent {
  type: 'SEARCH_SLACK_WORKFLOWS_SUCCESS';
  payload: {
    workflows: SharedWorkflowMetadata[];
    total: number;
  };
}

interface SharedWorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  authorName: string;
  sharedAt: string; // ISO 8601
  channelId: string;
  channelName: string;
  messageTs: string;
  fileId: string;
  fileUrl: string;
  nodeCount: number;
  tags?: string[];
  permalink: string;
}
```

**Example**:
```json
{
  "type": "SEARCH_SLACK_WORKFLOWS_SUCCESS",
  "payload": {
    "total": 5,
    "workflows": [
      {
        "id": "uuid-1234-5678",
        "name": "Data Processing Workflow",
        "description": "Daily data processing tasks",
        "version": "1.0.0",
        "authorName": "John Doe",
        "sharedAt": "2025-11-22T10:00:00Z",
        "channelId": "C01234ABCD",
        "channelName": "general",
        "messageTs": "1234567890.123456",
        "fileId": "F01234ABCD",
        "fileUrl": "https://files.slack.com/files-pri/...",
        "nodeCount": 5,
        "tags": ["data", "processing"],
        "permalink": "https://myteam.slack.com/archives/C01234ABCD/p1234567890123456"
      }
    ]
  }
}
```

---

## 3. Message Flow Examples

### 3.1 Slack接続フロー

```
[Webview] SLACK_CONNECT
          ↓
[Extension Host] OAuth認証開始
          ↓
[Browser] ユーザー認証
          ↓
[Extension Host] トークン取得・保存
          ↓
[Webview] SLACK_CONNECT_SUCCESS
```

### 3.2 ワークフロー共有フロー (機密情報あり)

```
[Webview] SHARE_WORKFLOW_TO_SLACK
          ↓
[Extension Host] 機密情報検出
          ↓
[Webview] SENSITIVE_DATA_WARNING
          ↓
[User] 「続行」選択
          ↓
[Webview] SHARE_WORKFLOW_TO_SLACK (overrideSensitiveWarning: true)
          ↓
[Extension Host] Slack API呼び出し
          ↓
[Webview] SHARE_WORKFLOW_SUCCESS
```

### 3.3 ワークフローインポートフロー (上書き確認)

```
[Webview] IMPORT_WORKFLOW_FROM_SLACK
          ↓
[Extension Host] ファイル存在チェック
          ↓
[Webview] IMPORT_WORKFLOW_CONFIRM_OVERWRITE
          ↓
[User] 「上書き」選択
          ↓
[Webview] IMPORT_WORKFLOW_FROM_SLACK (overwriteExisting: true)
          ↓
[Extension Host] ファイルダウンロード・保存
          ↓
[Webview] IMPORT_WORKFLOW_SUCCESS
```

---

## 4. TypeScript型定義

```typescript
// Commands (Webview → Extension Host)
export type WebviewToExtensionCommand =
  | SlackConnectCommand
  | SlackDisconnectCommand
  | GetSlackChannelsCommand
  | ShareWorkflowToSlackCommand
  | ImportWorkflowFromSlackCommand
  | SearchSlackWorkflowsCommand;

// Events (Extension Host → Webview)
export type ExtensionToWebviewEvent =
  | SlackConnectSuccessEvent
  | SlackConnectFailedEvent
  | GetSlackChannelsSuccessEvent
  | GetSlackChannelsFailedEvent
  | SensitiveDataWarningEvent
  | ShareWorkflowSuccessEvent
  | ShareWorkflowFailedEvent
  | ImportWorkflowConfirmOverwriteEvent
  | ImportWorkflowSuccessEvent
  | ImportWorkflowFailedEvent
  | SearchSlackWorkflowsSuccessEvent
  | SearchSlackWorkflowsFailedEvent;

// Message format
export interface WebviewMessage<T = any> {
  type: string;
  payload: T;
}
```
