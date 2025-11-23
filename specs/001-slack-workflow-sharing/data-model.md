# データモデル: Slack統合型ワークフロー共有

**Feature**: 001-slack-workflow-sharing
**Date**: 2025-11-22
**Status**: Complete

## 概要

このドキュメントは、Slack統合機能で使用されるデータモデルを定義します。主に以下のエンティティを含みます:

1. **SlackWorkspaceConnection** - Slackワークスペース接続情報
2. **SharedWorkflowMetadata** - 共有ワークフローのメタデータ
3. **SensitiveDataFinding** - 機密情報検出結果
4. **SlackChannel** - Slackチャンネル情報
5. **WorkflowImportRequest** - ワークフローインポートリクエスト

---

## 1. SlackWorkspaceConnection

Slackワークスペースとの接続情報を管理するエンティティ。

### フィールド

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|-----|------|------|------|
| `workspaceId` | `string` | ✓ | Slack WorkspaceのID | Slack APIから取得、例: `T01234ABCD` |
| `workspaceName` | `string` | ✓ | ワークスペース名 | 表示用、例: `My Team Workspace` |
| `teamId` | `string` | ✓ | Slack Team ID | Slack APIから取得 |
| `accessToken` | `string` | ✓ | OAuth Access Token | VSCode Secret Storageに暗号化保存 |
| `tokenScope` | `string[]` | ✓ | トークンのスコープ | 例: `['chat:write', 'files:write', 'channels:read']` |
| `userId` | `string` | ✓ | 認証したユーザーのSlack User ID | 例: `U01234EFGH` |
| `authorizedAt` | `Date` | ✓ | 認証日時 | ISO 8601形式 |
| `lastValidatedAt` | `Date` | - | 最終検証日時 | トークン有効性チェック時に更新 |

### バリデーションルール

- `accessToken`:
  - パターン: `xoxb-` または `xoxp-` で始まる
  - 長さ: 最低40文字
  - 保存: VSCode Secret Storageのみ (平文保存禁止)
- `tokenScope`:
  - 必須スコープ: `channels:read`, `chat:write`, `files:write`, `groups:read`
  - 不足スコープがある場合はエラー
- `workspaceId`, `teamId`, `userId`:
  - Slack ID形式: 大文字英字1文字 + 8-11桁の英数字

### TypeScript型定義

```typescript
export interface SlackWorkspaceConnection {
  workspaceId: string;
  workspaceName: string;
  teamId: string;
  accessToken: string; // Secret Storage経由でのみアクセス
  tokenScope: string[];
  userId: string;
  authorizedAt: Date;
  lastValidatedAt?: Date;
}
```

### 状態遷移

```
[未接続] → OAuth認証 → [接続済み]
[接続済み] → トークン失効検出 → [未接続]
[接続済み] → ユーザーによる切断 → [未接続]
```

---

## 2. SharedWorkflowMetadata

Slackに共有されたワークフローのメタデータ。

### フィールド

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|-----|------|------|------|
| `id` | `string` | ✓ | ワークフローの一意ID | UUID v4形式 |
| `name` | `string` | ✓ | ワークフロー名 | 1-100文字 |
| `description` | `string` | - | ワークフローの説明 | 最大500文字 |
| `version` | `string` | ✓ | ワークフローバージョン | Semantic Versioning形式 |
| `authorName` | `string` | ✓ | 共有者の名前 | VS Code設定から取得 |
| `authorEmail` | `string` | - | 共有者のメールアドレス | オプション |
| `sharedAt` | `Date` | ✓ | 共有日時 | ISO 8601形式 |
| `channelId` | `string` | ✓ | 共有先チャンネルID | 例: `C01234ABCD` |
| `channelName` | `string` | ✓ | 共有先チャンネル名 | 表示用 |
| `messageTs` | `string` | ✓ | Slackメッセージのタイムスタンプ | Slack API形式: `1234567890.123456` |
| `fileId` | `string` | ✓ | Slackに添付されたファイルID | 例: `F01234ABCD` |
| `fileUrl` | `string` | ✓ | ファイルのダウンロードURL | Slack private URL |
| `nodeCount` | `number` | ✓ | ノード数 | >= 0 |
| `tags` | `string[]` | - | タグ（検索用） | 最大10個、各タグ最大30文字 |
| `hasSensitiveData` | `boolean` | ✓ | 機密情報検出フラグ | `true` = 検出された |
| `sensitiveDataOverride` | `boolean` | - | 機密情報警告を無視して共有 | デフォルト: `false` |

### バリデーションルール

- `name`:
  - 空文字禁止
  - 1-100文字
  - 特殊文字制限: `<>:"/\|?*` 使用不可
- `version`:
  - Semantic Versioning形式: `MAJOR.MINOR.PATCH`
  - 例: `1.0.0`, `2.3.1-beta`
- `messageTs`:
  - Slack固有形式: `{unix_timestamp}.{microseconds}`
  - 例: `1234567890.123456`
- `nodeCount`:
  - 最小値: 0
  - 最大値: 1000 (仕様上の上限)

### TypeScript型定義

```typescript
export interface SharedWorkflowMetadata {
  id: string;
  name: string;
  description?: string;
  version: string;
  authorName: string;
  authorEmail?: string;
  sharedAt: Date;
  channelId: string;
  channelName: string;
  messageTs: string;
  fileId: string;
  fileUrl: string;
  nodeCount: number;
  tags?: string[];
  hasSensitiveData: boolean;
  sensitiveDataOverride?: boolean;
}
```

### リレーション

- `channelId` → `SlackChannel.id`
- `fileId` → Slack Files API

---

## 3. SensitiveDataFinding

機密情報検出結果を表すエンティティ。

### フィールド

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|-----|------|------|------|
| `type` | `SensitiveDataType` | ✓ | 検出された機密情報の種類 | 列挙型 (下記参照) |
| `maskedValue` | `string` | ✓ | マスク済みの値 | 最初と最後の4文字のみ表示 |
| `position` | `number` | ✓ | ファイル内の位置 (文字オフセット) | >= 0 |
| `context` | `string` | - | 検出箇所の前後のコンテキスト | 最大100文字 |
| `severity` | `'low' \| 'medium' \| 'high'` | ✓ | 重要度 | デフォルト: `'high'` |

### SensitiveDataType 列挙型

```typescript
export enum SensitiveDataType {
  AWS_ACCESS_KEY = 'AWS_ACCESS_KEY',
  AWS_SECRET_KEY = 'AWS_SECRET_KEY',
  API_KEY = 'API_KEY',
  TOKEN = 'TOKEN',
  SLACK_TOKEN = 'SLACK_TOKEN',
  GITHUB_TOKEN = 'GITHUB_TOKEN',
  PRIVATE_KEY = 'PRIVATE_KEY',
  PASSWORD = 'PASSWORD',
  CUSTOM = 'CUSTOM' // ユーザー定義パターン
}
```

### バリデーションルール

- `maskedValue`:
  - 元の値を完全に復元不可能であること
  - 形式: `{first4chars}...{last4chars}`
  - 例: `AKIA...X7Z9`
- `severity`:
  - `'high'`: 即座に共有を停止すべき (AWS keys, private keys)
  - `'medium'`: 警告を表示 (API keys, tokens)
  - `'low'`: 情報提供のみ (パスワードなど)

### TypeScript型定義

```typescript
export interface SensitiveDataFinding {
  type: SensitiveDataType;
  maskedValue: string;
  position: number;
  context?: string;
  severity: 'low' | 'medium' | 'high';
}

export enum SensitiveDataType {
  AWS_ACCESS_KEY = 'AWS_ACCESS_KEY',
  AWS_SECRET_KEY = 'AWS_SECRET_KEY',
  API_KEY = 'API_KEY',
  TOKEN = 'TOKEN',
  SLACK_TOKEN = 'SLACK_TOKEN',
  GITHUB_TOKEN = 'GITHUB_TOKEN',
  PRIVATE_KEY = 'PRIVATE_KEY',
  PASSWORD = 'PASSWORD',
  CUSTOM = 'CUSTOM'
}
```

---

## 4. SlackChannel

Slackチャンネル情報を表すエンティティ。

### フィールド

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|-----|------|------|------|
| `id` | `string` | ✓ | チャンネルID | 例: `C01234ABCD` |
| `name` | `string` | ✓ | チャンネル名 | 例: `general`, `random` |
| `isPrivate` | `boolean` | ✓ | プライベートチャンネルか | `true` = private, `false` = public |
| `isMember` | `boolean` | ✓ | ユーザーがメンバーか | `true` = joined |
| `memberCount` | `number` | - | メンバー数 | >= 0 |
| `purpose` | `string` | - | チャンネルの目的 | 最大250文字 |
| `topic` | `string` | - | チャンネルのトピック | 最大250文字 |

### バリデーションルール

- `id`:
  - Slack Channel ID形式: `C` で始まる大文字英数字8-11桁
  - 例: `C01234ABCD`, `C9876ZYXW`
- `name`:
  - 小文字英数字とハイフン・アンダースコアのみ
  - 1-80文字
  - 例: `general`, `team-announcements`, `project_alpha`
- `isMember`:
  - ワークフロー共有先として選択可能なのは `isMember === true` のチャンネルのみ

### TypeScript型定義

```typescript
export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount?: number;
  purpose?: string;
  topic?: string;
}
```

---

## 5. WorkflowImportRequest

Slackからワークフローをインポートするリクエスト情報。

### フィールド

| フィールド名 | 型 | 必須 | 説明 | 制約 |
|------------|-----|------|------|------|
| `workflowId` | `string` | ✓ | インポートするワークフローのID | UUID v4形式 |
| `sourceMessageTs` | `string` | ✓ | インポート元メッセージのタイムスタンプ | Slack API形式 |
| `sourceChannelId` | `string` | ✓ | インポート元チャンネルID | 例: `C01234ABCD` |
| `fileId` | `string` | ✓ | ダウンロードするファイルID | 例: `F01234ABCD` |
| `targetDirectory` | `string` | ✓ | インポート先ディレクトリ | 絶対パス、例: `/Users/.../workflows/` |
| `overwriteExisting` | `boolean` | ✓ | 既存ファイルを上書きするか | デフォルト: `false` |
| `requestedAt` | `Date` | ✓ | リクエスト日時 | ISO 8601形式 |
| `status` | `ImportStatus` | ✓ | インポート状態 | 列挙型 (下記参照) |
| `errorMessage` | `string` | - | エラーメッセージ | `status === 'failed'` の場合に設定 |

### ImportStatus 列挙型

```typescript
export enum ImportStatus {
  PENDING = 'pending',       // インポート待機中
  DOWNLOADING = 'downloading', // ファイルダウンロード中
  VALIDATING = 'validating',  // ファイル検証中
  WRITING = 'writing',        // ファイル書き込み中
  COMPLETED = 'completed',    // インポート完了
  FAILED = 'failed'           // インポート失敗
}
```

### バリデーションルール

- `targetDirectory`:
  - 絶対パスであること
  - `.vscode/workflows/` ディレクトリ内であること
  - 存在しない場合は自動作成
- `fileId`:
  - Slack File ID形式: `F` で始まる大文字英数字8-11桁
  - 例: `F01234ABCD`
- `overwriteExisting`:
  - `false`: 同名ファイルが存在する場合は確認ダイアログを表示
  - `true`: 確認なしで上書き

### TypeScript型定義

```typescript
export interface WorkflowImportRequest {
  workflowId: string;
  sourceMessageTs: string;
  sourceChannelId: string;
  fileId: string;
  targetDirectory: string;
  overwriteExisting: boolean;
  requestedAt: Date;
  status: ImportStatus;
  errorMessage?: string;
}

export enum ImportStatus {
  PENDING = 'pending',
  DOWNLOADING = 'downloading',
  VALIDATING = 'validating',
  WRITING = 'writing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
```

### 状態遷移

```
[PENDING] → ダウンロード開始 → [DOWNLOADING]
[DOWNLOADING] → ダウンロード完了 → [VALIDATING]
[VALIDATING] → 検証成功 → [WRITING]
[WRITING] → 書き込み完了 → [COMPLETED]

[DOWNLOADING/VALIDATING/WRITING] → エラー発生 → [FAILED]
```

---

## エンティティ関係図 (ER図)

```
┌────────────────────────────┐
│ SlackWorkspaceConnection   │
├────────────────────────────┤
│ workspaceId (PK)           │
│ workspaceName              │
│ teamId                     │
│ accessToken (Secret)       │
│ tokenScope[]               │
│ userId                     │
│ authorizedAt               │
│ lastValidatedAt            │
└────────────────────────────┘
         │
         │ 1:N
         ▼
┌────────────────────────────┐       ┌──────────────────────┐
│ SharedWorkflowMetadata     │ N:1   │ SlackChannel         │
├────────────────────────────┤◄──────┤──────────────────────┤
│ id (PK)                    │       │ id (PK)              │
│ name                       │       │ name                 │
│ description                │       │ isPrivate            │
│ version                    │       │ isMember             │
│ authorName                 │       │ memberCount          │
│ authorEmail                │       │ purpose              │
│ sharedAt                   │       │ topic                │
│ channelId (FK)             │       └──────────────────────┘
│ channelName                │
│ messageTs                  │
│ fileId                     │
│ fileUrl                    │
│ nodeCount                  │
│ tags[]                     │
│ hasSensitiveData           │
│ sensitiveDataOverride      │
└────────────────────────────┘
         │
         │ 1:N
         ▼
┌────────────────────────────┐
│ SensitiveDataFinding       │
├────────────────────────────┤
│ type                       │
│ maskedValue                │
│ position                   │
│ context                    │
│ severity                   │
└────────────────────────────┘


┌────────────────────────────┐
│ WorkflowImportRequest      │
├────────────────────────────┤
│ workflowId (FK)            │──────┐
│ sourceMessageTs            │      │
│ sourceChannelId (FK)       │      │ References
│ fileId                     │      ▼
│ targetDirectory            │   SharedWorkflowMetadata.id
│ overwriteExisting          │   SlackChannel.id
│ requestedAt                │
│ status                     │
│ errorMessage               │
└────────────────────────────┘
```

---

## ストレージ設計

### VSCode Secret Storage

**保存データ**:
- Slack OAuth Access Token
- Slack Workspace ID

**キー形式**:
```typescript
const SECRET_KEYS = {
  ACCESS_TOKEN: 'slack-oauth-access-token',
  WORKSPACE_ID: 'slack-workspace-id'
} as const;
```

**セキュリティ要件**:
- 平文保存禁止
- OS標準のKeychain/Credential Managerに保存
- 拡張機能アンインストール時に自動削除

### ローカルファイルシステム

**保存データ**:
- ワークフロー定義ファイル (`.vscode/workflows/*.json`)
- 共有履歴キャッシュ (`.vscode/workflow-sharing-history.json` - オプション)

**ファイル形式**:
```json
// .vscode/workflow-sharing-history.json (例)
{
  "version": "1.0.0",
  "lastSyncedAt": "2025-11-22T10:00:00Z",
  "sharedWorkflows": [
    {
      "id": "uuid-1234",
      "name": "My Workflow",
      "sharedAt": "2025-11-22T09:00:00Z",
      "channelName": "general",
      "messageTs": "1234567890.123456"
    }
  ]
}
```

---

## まとめ

### 定義されたエンティティ

1. **SlackWorkspaceConnection** - Slack接続管理
2. **SharedWorkflowMetadata** - 共有ワークフローのメタデータ
3. **SensitiveDataFinding** - 機密情報検出結果
4. **SlackChannel** - Slackチャンネル情報
5. **WorkflowImportRequest** - インポートリクエスト

### データフロー

```
[ワークフロー作成] → [機密情報検出] → [Slack共有] → [メタデータ保存]
                                            ↓
[Slackメッセージ] → [インポートリクエスト] → [ファイルダウンロード] → [ローカル保存]
```

### セキュリティ考慮事項

- OAuth Token: VSCode Secret Storageで暗号化保存
- 機密情報: 検出後にマスク表示、元の値は保存しない
- ファイルアクセス: `.vscode/workflows/` ディレクトリ内のみに制限
