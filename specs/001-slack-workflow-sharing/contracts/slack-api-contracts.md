# Slack API Contracts

**Feature**: 001-slack-workflow-sharing
**Date**: 2025-11-22
**API Version**: Slack Web API v2

## 概要

このドキュメントは、Slack統合機能で使用するSlack Web APIのコントラクト仕様を定義します。

---

## 1. Bot User Token要件

本機能では、SlackワークスペースにインストールされたSlack Appから取得した**Bot User Token**を使用します。

**必要なBot Token Scopes**:
- `chat:write` - メッセージ投稿
- `files:write` - ファイルアップロード
- `channels:read` - チャンネル一覧取得
- `groups:read` - メッセージ検索

**トークン形式**:
- Bot User Tokenは `xoxb-` で始まる文字列
- 例: `xoxb-YOUR-WORKSPACE-ID-YOUR-APP-ID-YOUR-TOKEN-STRING`

**トークン取得方法**:
1. Slack APIでAppを作成
2. 上記のBot Token Scopesを追加
3. AppをワークスペースにInstall
4. OAuth & PermissionsページでBot User OAuth Tokenを取得

---

## 2. Workspace情報の取得

### 2.1 Token検証

**Method**: POST
**Endpoint**: `https://slack.com/api/auth.test`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Example Request**:
```http
POST https://slack.com/api/auth.test
Authorization: Bearer xoxb-YOUR-TOKEN-HERE
```

**Success Response** (200 OK):
```json
{
  "ok": true,
  "url": "https://myteam.slack.com/",
  "team": "My Team Workspace",
  "user": "bot_user",
  "team_id": "T01234IJKL",
  "user_id": "U01234ABCD",
  "bot_id": "B01234EFGH"
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "invalid_auth"
}
```

**エラーコード**:
- `invalid_auth`: トークンが無効または失効
- `account_inactive`: アカウントが無効化されている

---

## 3. チャンネル管理

### 3.1 チャンネル一覧取得

**Method**: POST
**Endpoint**: `https://slack.com/api/conversations.list`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `types` | `string` | - | チャンネルタイプ (カンマ区切り) | `public_channel` |
| `limit` | `number` | - | 取得件数 | `100` |
| `cursor` | `string` | - | ページネーション用カーソル | - |
| `exclude_archived` | `boolean` | - | アーカイブ済みチャンネルを除外 | `false` |

**Example Request**:
```http
POST https://slack.com/api/conversations.list
Authorization: Bearer xoxb-YOUR-TOKEN-HERE
Content-Type: application/json

{
  "types": "public_channel,private_channel",
  "limit": 100,
  "exclude_archived": true
}
```

**Success Response** (200 OK):
```json
{
  "ok": true,
  "channels": [
    {
      "id": "C01234ABCD",
      "name": "general",
      "is_channel": true,
      "is_group": false,
      "is_im": false,
      "is_mpim": false,
      "is_private": false,
      "is_archived": false,
      "is_member": true,
      "num_members": 25,
      "purpose": {
        "value": "This is the general channel",
        "creator": "U01234EFGH",
        "last_set": 1234567890
      },
      "topic": {
        "value": "General discussions",
        "creator": "U01234EFGH",
        "last_set": 1234567890
      }
    }
  ],
  "response_metadata": {
    "next_cursor": "dGVhbTpDMDYxRkE1UEI="
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "invalid_auth"
}
```

**エラーコード**:
- `invalid_auth`: トークンが無効
- `missing_scope`: 必要なスコープ (`channels:read`) がない

---

## 4. メッセージ投稿

### 4.1 リッチメッセージカードの投稿

**Method**: POST
**Endpoint**: `https://slack.com/api/chat.postMessage`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel` | `string` | ✓ | チャンネルID (例: `C01234ABCD`) |
| `text` | `string` | - | フォールバックテキスト |
| `blocks` | `array` | - | Block Kit形式のメッセージブロック |
| `attachments` | `array` | - | 添付ファイル情報 |
| `thread_ts` | `string` | - | スレッドのタイムスタンプ (スレッド返信時) |

**Example Request**:
```http
POST https://slack.com/api/chat.postMessage
Authorization: Bearer xoxb-YOUR-TOKEN-HERE
Content-Type: application/json

{
  "channel": "C01234ABCD",
  "text": "New workflow shared: My Workflow",
  "blocks": [
    {
      "type": "header",
      "text": {
        "type": "plain_text",
        "text": "🔧 Workflow: My Workflow"
      }
    },
    {
      "type": "section",
      "fields": [
        {
          "type": "mrkdwn",
          "text": "*Author:*\nJohn Doe"
        },
        {
          "type": "mrkdwn",
          "text": "*Version:*\n1.0.0"
        },
        {
          "type": "mrkdwn",
          "text": "*Nodes:*\n5"
        },
        {
          "type": "mrkdwn",
          "text": "*Created:*\n2025-11-22T10:00:00Z"
        }
      ]
    },
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "This is a sample workflow for data processing."
      }
    },
    {
      "type": "actions",
      "elements": [
        {
          "type": "button",
          "text": {
            "type": "plain_text",
            "text": "📥 Import to VS Code"
          },
          "style": "primary",
          "value": "workflow-uuid-1234",
          "action_id": "import_workflow"
        }
      ]
    }
  ]
}
```

**Success Response** (200 OK):
```json
{
  "ok": true,
  "channel": "C01234ABCD",
  "ts": "1234567890.123456",
  "message": {
    "type": "message",
    "subtype": null,
    "text": "New workflow shared: My Workflow",
    "ts": "1234567890.123456",
    "username": "Claude Code Workflow Studio",
    "bot_id": "B01234EFGH",
    "blocks": [...]
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "channel_not_found"
}
```

**エラーコード**:
- `channel_not_found`: チャンネルが存在しない
- `not_in_channel`: Botがチャンネルメンバーではない
- `missing_scope`: 必要なスコープ (`chat:write`) がない
- `msg_too_long`: メッセージが長すぎる (40,000文字制限)

---

## 5. ファイルアップロード

### 5.1 ワークフローJSONのアップロード

**Method**: POST
**Endpoint**: `https://slack.com/api/files.uploadV2`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: multipart/form-data
```

**Body Parameters**:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `channel_id` | `string` | ✓ | チャンネルID |
| `file` | `file` | ✓ | アップロードするファイル |
| `filename` | `string` | ✓ | ファイル名 |
| `title` | `string` | - | ファイルのタイトル |
| `initial_comment` | `string` | - | ファイルアップロード時のコメント |
| `thread_ts` | `string` | - | スレッドのタイムスタンプ |

**Example Request**:
```http
POST https://slack.com/api/files.uploadV2
Authorization: Bearer xoxb-YOUR-TOKEN-HERE
Content-Type: multipart/form-data; boundary=----WebKitFormBoundary

------WebKitFormBoundary
Content-Disposition: form-data; name="channel_id"

C01234ABCD
------WebKitFormBoundary
Content-Disposition: form-data; name="filename"

my-workflow.json
------WebKitFormBoundary
Content-Disposition: form-data; name="title"

My Workflow Definition
------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="my-workflow.json"
Content-Type: application/json

{
  "id": "workflow-uuid-1234",
  "name": "My Workflow",
  "version": "1.0.0",
  "nodes": [...]
}
------WebKitFormBoundary--
```

**Success Response** (200 OK):
```json
{
  "ok": true,
  "file": {
    "id": "F01234ABCD",
    "created": 1234567890,
    "timestamp": 1234567890,
    "name": "my-workflow.json",
    "title": "My Workflow Definition",
    "mimetype": "application/json",
    "filetype": "json",
    "size": 1234,
    "url_private": "https://files.slack.com/files-pri/T01234IJKL-F01234ABCD/my-workflow.json",
    "url_private_download": "https://files.slack.com/files-pri/T01234IJKL-F01234ABCD/download/my-workflow.json",
    "permalink": "https://myteam.slack.com/files/U01234EFGH/F01234ABCD/my-workflow.json",
    "permalink_public": "https://slack-files.com/T01234IJKL-F01234ABCD-abc123def456"
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "file_too_large"
}
```

**エラーコード**:
- `file_too_large`: ファイルサイズが1GBを超過
- `invalid_file_type`: サポートされていないファイルタイプ
- `missing_scope`: 必要なスコープ (`files:write`) がない

---

## 6. メッセージ検索

### 6.1 ワークフロー検索

**Method**: POST
**Endpoint**: `https://slack.com/api/search.messages`

**Headers**:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

**Body Parameters**:

| Parameter | Type | Required | Description | Default |
|-----------|------|----------|-------------|---------|
| `query` | `string` | ✓ | 検索クエリ | - |
| `count` | `number` | - | 取得件数 | `20` |
| `page` | `number` | - | ページ番号 | `1` |
| `sort` | `string` | - | ソート順 (`score`, `timestamp`) | `score` |

**Example Request**:
```http
POST https://slack.com/api/search.messages
Authorization: Bearer xoxb-YOUR-TOKEN-HERE
Content-Type: application/json

{
  "query": "workflow filename:*.json in:#general",
  "count": 20,
  "sort": "timestamp"
}
```

**Success Response** (200 OK):
```json
{
  "ok": true,
  "query": "workflow filename:*.json in:#general",
  "messages": {
    "total": 5,
    "matches": [
      {
        "type": "message",
        "ts": "1234567890.123456",
        "channel": {
          "id": "C01234ABCD",
          "name": "general"
        },
        "user": "U01234EFGH",
        "username": "Claude Code Workflow Studio",
        "text": "New workflow shared: My Workflow",
        "permalink": "https://myteam.slack.com/archives/C01234ABCD/p1234567890123456",
        "files": [
          {
            "id": "F01234ABCD",
            "name": "my-workflow.json",
            "title": "My Workflow Definition",
            "url_private": "https://files.slack.com/files-pri/T01234IJKL-F01234ABCD/my-workflow.json"
          }
        ]
      }
    ]
  }
}
```

**Error Response**:
```json
{
  "ok": false,
  "error": "missing_scope"
}
```

**エラーコード**:
- `missing_scope`: 必要なスコープ (`groups:read`) がない
- `invalid_query`: クエリが無効

---

## Rate Limits

Slack Web APIには以下のRate Limitsが適用されます:

| Tier | Requests per minute | Methods |
|------|---------------------|---------|
| Tier 1 | 1+ | `chat.postMessage`, `files.upload` |
| Tier 2 | 20+ | `conversations.list`, `search.messages` |
| Tier 3 | 50+ | `auth.test` |
| Tier 4 | 100+ | その他のメソッド |

**Rate Limit対策**:
- `@slack/web-api` は自動リトライ機能を提供
- `Retry-After` ヘッダーを尊重
- Rate Limit超過時は指数バックオフでリトライ

**Rate Limit Response**:
```json
{
  "ok": false,
  "error": "rate_limited"
}
```

**Headers**:
```
X-Rate-Limit-Limit: 20
X-Rate-Limit-Remaining: 0
X-Rate-Limit-Reset: 1234567890
Retry-After: 60
```

---

## エラーハンドリング

### 共通エラーコード

| Error Code | Description | 対処方法 |
|------------|-------------|---------|
| `invalid_auth` | トークンが無効または失効 | 再認証を促す |
| `missing_scope` | 必要なスコープがない | スコープを追加して再認証 |
| `rate_limited` | Rate Limit超過 | `Retry-After` 後にリトライ |
| `internal_error` | Slack内部エラー | 指数バックオフでリトライ |
| `not_authed` | トークンが提供されていない | トークンを確認 |

### エラーハンドリング実装例

```typescript
import { WebClient, WebAPICallError } from '@slack/web-api';

async function handleSlackApiCall<T>(
  apiCall: () => Promise<T>
): Promise<T> {
  try {
    return await apiCall();
  } catch (error) {
    if (error instanceof WebAPICallError) {
      switch (error.data.error) {
        case 'invalid_auth':
          vscode.window.showErrorMessage(
            'Slackトークンが無効です。再認証してください。'
          );
          // 再認証フロー開始
          break;

        case 'missing_scope':
          vscode.window.showErrorMessage(
            '必要な権限がありません。アプリを再インストールしてください。'
          );
          break;

        case 'rate_limited':
          const retryAfter = error.data.retryAfter ?? 60;
          vscode.window.showWarningMessage(
            `Slack API Rate Limitに達しました。${retryAfter}秒後に再試行してください。`
          );
          break;

        default:
          vscode.window.showErrorMessage(
            `Slack APIエラー: ${error.data.error}`
          );
      }
    }
    throw error;
  }
}
```

---

## セキュリティ要件

### Token Management

1. **暗号化保存**: Bot User TokenはVSCode Secret Storageに安全に保存
2. **平文保存禁止**: トークンをコードにハードコードしたり、設定ファイルに平文で保存しない
3. **スコープ最小化**: 必要最小限のBot Token Scopesのみ要求
4. **トークン検証**: トークン保存前に `auth.test` APIでトークンの有効性を確認
5. **トークン再検証**: アプリ起動時およびAPI呼び出しエラー時にトークンの有効性を再確認

### Data Privacy

1. **機密情報検出**: ワークフローJSONをアップロード前にスキャン
2. **ログ出力禁止**: Bot User Tokenやワークフロー内容をログに出力しない
3. **トークンマスキング**: UI表示時はトークンの一部のみ表示 (例: xoxb-****...****1234)
4. **ユーザー同意**: 共有前に確認ダイアログを表示
