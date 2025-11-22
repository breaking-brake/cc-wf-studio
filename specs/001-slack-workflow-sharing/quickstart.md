# Quickstart Guide: Slack統合型ワークフロー共有

**Feature**: 001-slack-workflow-sharing
**Audience**: 開発者 (実装担当者)
**Date**: 2025-11-22

## 目次

1. [開発環境セットアップ](#1-開発環境セットアップ)
2. [Slack App設定](#2-slack-app設定)
3. [ローカル開発](#3-ローカル開発)
4. [実装ガイド](#4-実装ガイド)
5. [テスト](#5-テスト)
6. [トラブルシューティング](#6-トラブルシューティング)

---

## 1. 開発環境セットアップ

### 前提条件

- Node.js 18.x 以上
- VS Code 1.80.0 以上
- npm または yarn

### 依存関係のインストール

```bash
# プロジェクトルートで実行
npm install

# 新規依存関係の追加 (Slack SDK)
npm install @slack/web-api

# TypeScript型定義
npm install --save-dev @types/node
```

### 環境変数の設定

`.env` ファイルをプロジェクトルートに作成:

```bash
# Slack App Credentials (Slack App設定から取得)
SLACK_CLIENT_ID=123456789.987654321
SLACK_CLIENT_SECRET=your_slack_client_secret_here

# OAuth Redirect URI (ローカル開発時)
SLACK_OAUTH_REDIRECT_URI=http://localhost:12345/oauth/callback
```

**重要**: `.env` ファイルは `.gitignore` に追加してコミットしないこと

---

## 2. Slack App設定

### 2.1 Slack Appの作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」→ 「From scratch」を選択
3. App Name: `Claude Code Workflow Studio` (例)
4. Workspace: 開発用ワークスペースを選択

### 2.2 OAuth & Permissions設定

**Bot Token Scopes**:
- `chat:write` - メッセージ投稿
- `files:write` - ファイルアップロード
- `channels:read` - チャンネル一覧取得
- `search:read` - メッセージ検索

**Redirect URLs**:
- 開発環境: `http://localhost:12345/oauth/callback`
- 本番環境: `https://your-domain.com/oauth/callback` (将来対応)

### 2.3 App Manifest (オプション)

Slack App Directoryへの公開時に使用するマニフェスト:

```yaml
display_information:
  name: Claude Code Workflow Studio
  description: Share and import Claude Code workflows via Slack
  background_color: "#2c2d30"
  long_description: |
    Claude Code Workflow Studio enables developers to share workflow definition files
    directly from VS Code to Slack channels, and import workflows from Slack with one click.

features:
  bot_user:
    display_name: Claude Code Workflows
    always_online: true

oauth_config:
  scopes:
    bot:
      - chat:write
      - files:write
      - channels:read
      - search:read
  redirect_urls:
    - http://localhost:12345/oauth/callback

settings:
  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: true
```

### 2.4 Credentials取得

1. 「Basic Information」→ 「App Credentials」
2. `Client ID` と `Client Secret` を `.env` にコピー

---

## 3. ローカル開発

### 3.1 拡張機能のビルド

```bash
# TypeScriptコンパイル
npm run build

# またはwatchモードで開発
npm run watch
```

### 3.2 拡張機能のデバッグ

1. VS Codeで `F5` を押す
2. Extension Development Hostウィンドウが開く
3. コマンドパレット (`Ctrl/Cmd+Shift+P`) で `Slack: Connect Workspace` を実行
4. ブラウザでOAuth認証を完了

### 3.3 ホットリロード

TypeScriptファイルを編集後:
1. `npm run build` (または watch mode)
2. Extension Development Hostで `Ctrl/Cmd+R` (Reload Window)

---

## 4. 実装ガイド

### 4.1 プロジェクト構造

```
src/extension/
├── services/
│   ├── slack-api-service.ts          # 実装する
│   ├── slack-oauth-service.ts        # 実装する
│   └── sensitive-data-detector.ts    # 実装する
├── commands/
│   ├── slack-share-workflow.ts       # 実装する
│   └── slack-import-workflow.ts      # 実装する
└── utils/
    └── oauth-callback-server.ts      # 実装する

src/webview/src/
├── components/
│   ├── dialogs/
│   │   └── SlackShareDialog.tsx      # 実装する
│   └── buttons/
│       └── SlackImportButton.tsx     # 実装する
└── services/
    └── slack-integration-service.ts  # 実装する
```

### 4.2 実装の優先順位

**Phase 1** (基本機能):
1. `slack-oauth-service.ts` - OAuth認証フロー
2. `oauth-callback-server.ts` - ローカルHTTPサーバー
3. `slack-api-service.ts` - Slack API連携 (基本)

**Phase 2** (共有機能):
4. `sensitive-data-detector.ts` - 機密情報検出
5. `slack-share-workflow.ts` - ワークフロー共有コマンド
6. `SlackShareDialog.tsx` - 共有ダイアログUI

**Phase 3** (インポート機能):
7. `slack-import-workflow.ts` - ワークフローインポートコマンド
8. `SlackImportButton.tsx` - インポートボタンUI

**Phase 4** (検索機能):
9. `slack-api-service.ts` - 検索API実装
10. Webview UI - 検索UI追加

### 4.3 コード例

#### slack-oauth-service.ts (骨格)

```typescript
import * as vscode from 'vscode';
import { WebClient } from '@slack/web-api';

export class SlackOAuthService {
  private static readonly CLIENT_ID = process.env.SLACK_CLIENT_ID!;
  private static readonly CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET!;
  private static readonly SCOPES = [
    'chat:write',
    'files:write',
    'channels:read',
    'search:read'
  ].join(',');

  constructor(private context: vscode.ExtensionContext) {}

  async startOAuthFlow(): Promise<string> {
    // 1. ローカルHTTPサーバー起動
    const server = new OAuthCallbackServer();
    const port = await server.start();

    // 2. Authorization URL生成
    const state = this.generateState();
    const authUrl = `https://slack.com/oauth/v2/authorize?` +
      `client_id=${SlackOAuthService.CLIENT_ID}&` +
      `scope=${SlackOAuthService.SCOPES}&` +
      `redirect_uri=http://localhost:${port}/oauth/callback&` +
      `state=${state}`;

    // 3. ブラウザで開く
    await vscode.env.openExternal(vscode.Uri.parse(authUrl));

    // 4. コールバック待機
    const code = await server.waitForCallback();

    // 5. Access Token取得
    const accessToken = await this.exchangeCodeForToken(code, port);

    // 6. Token保存
    await this.saveToken(accessToken);

    server.close();
    return accessToken;
  }

  private async exchangeCodeForToken(code: string, port: number): Promise<string> {
    const response = await fetch('https://slack.com/api/oauth.v2.access', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: SlackOAuthService.CLIENT_ID,
        client_secret: SlackOAuthService.CLIENT_SECRET,
        code: code,
        redirect_uri: `http://localhost:${port}/oauth/callback`
      })
    });

    const data = await response.json();
    if (!data.ok) {
      throw new Error(`OAuth failed: ${data.error}`);
    }

    return data.access_token;
  }

  private async saveToken(accessToken: string): Promise<void> {
    await this.context.secrets.store('slack-access-token', accessToken);
  }

  private generateState(): string {
    return Math.random().toString(36).substring(7);
  }
}
```

#### sensitive-data-detector.ts (骨格)

```typescript
export const SENSITIVE_PATTERNS = {
  AWS_ACCESS_KEY: /AKIA[0-9A-Z]{16}/g,
  SLACK_TOKEN: /xox[baprs]-[0-9a-zA-Z-]{10,}/g,
  API_KEY: /api[_-]?key["\s:=]+["']?([0-9a-zA-Z-_]{20,})/gi,
  // ... 他のパターン
};

export class SensitiveDataDetector {
  detect(content: string): SensitiveDataFinding[] {
    const findings: SensitiveDataFinding[] = [];

    for (const [type, pattern] of Object.entries(SENSITIVE_PATTERNS)) {
      const matches = content.matchAll(pattern);
      for (const match of matches) {
        findings.push({
          type,
          maskedValue: this.maskValue(match[0]),
          position: match.index!,
          severity: this.getSeverity(type)
        });
      }
    }

    return findings;
  }

  private maskValue(value: string): string {
    if (value.length <= 8) return '***';
    return `${value.substring(0, 4)}...${value.substring(value.length - 4)}`;
  }

  private getSeverity(type: string): 'low' | 'medium' | 'high' {
    const highSeverity = ['AWS_ACCESS_KEY', 'PRIVATE_KEY'];
    const mediumSeverity = ['API_KEY', 'TOKEN', 'SLACK_TOKEN'];

    if (highSeverity.includes(type)) return 'high';
    if (mediumSeverity.includes(type)) return 'medium';
    return 'low';
  }
}
```

---

## 5. テスト

### 5.1 Manual E2E Testing

**T001: Slack接続テスト**
1. コマンドパレットで `Slack: Connect Workspace` を実行
2. ブラウザでOAuth認証を完了
3. VS Codeに戻り、接続成功通知を確認

**T002: ワークフロー共有テスト**
1. ワークフローファイルを開く
2. コマンドパレットで `Slack: Share Workflow` を実行
3. チャンネル選択ダイアログで共有先を選択
4. 機密情報警告が表示されないことを確認 (機密情報がない場合)
5. Slackチャンネルでリッチメッセージカードを確認

**T003: 機密情報検出テスト**
1. ワークフローファイルにAWSキー (`AKIA1234567890ABCDEF`) を含める
2. `Slack: Share Workflow` を実行
3. 機密情報警告ダイアログが表示されることを確認
4. マスク済みの値 (`AKIA...CDEF`) が表示されることを確認
5. 「続行」を選択して共有完了

**T004: ワークフローインポートテスト**
1. Slackメッセージの「Import to VS Code」ボタンをクリック
2. VS Codeに戻り、インポート成功通知を確認
3. `.vscode/workflows/` にファイルが保存されていることを確認

**T005: 上書き確認テスト**
1. 既存ワークフローと同名のファイルをインポート
2. 上書き確認ダイアログが表示されることを確認
3. 「上書き」を選択してインポート完了

**T006: 検索テスト**
1. コマンドパレットで `Slack: Search Workflows` を実行
2. 検索クエリを入力 (例: `data processing`)
3. 過去に共有されたワークフローがリスト表示されることを確認
4. ワークフローを選択してインポート

### 5.2 エラーケースのテスト

**E001: 未認証エラー**
1. Slack未接続の状態で `Share Workflow` を実行
2. 「Slackに接続してください」エラーが表示されることを確認

**E002: チャンネルアクセスエラー**
1. Botが参加していないチャンネルに共有を試行
2. 「チャンネルに招待してください」エラーが表示されることを確認

**E003: ネットワークエラー**
1. ネットワークを切断
2. ワークフロー共有を試行
3. 「ネットワークエラー」が表示されることを確認

### 5.3 パフォーマンステスト

**P001: 共有処理時間**
- 目標: < 3秒 (Slack API呼び出し含む)
- 測定方法: `console.time()` / `console.timeEnd()` でログ出力

**P002: インポート処理時間**
- 目標: < 2秒
- 測定方法: 同上

**P003: 機密情報検出時間**
- 目標: < 500ms (100KB未満のファイル)
- 測定方法: 同上

---

## 6. トラブルシューティング

### 問題: OAuth認証が失敗する

**原因**:
- `redirect_uri` が一致しない
- Client SecretまたはClient IDが無効

**解決方法**:
1. `.env` ファイルのCredentialsを確認
2. Slack App設定の「OAuth & Permissions」→「Redirect URLs」を確認
3. ローカルサーバーのポート番号が一致しているか確認

---

### 問題: 「missing_scope」エラーが発生する

**原因**:
- 必要なスコープが不足している

**解決方法**:
1. Slack App設定の「OAuth & Permissions」→「Bot Token Scopes」を確認
2. 以下のスコープが追加されているか確認:
   - `chat:write`
   - `files:write`
   - `channels:read`
   - `search:read`
3. スコープ追加後、再認証が必要

---

### 問題: トークンが保存されない

**原因**:
- VSCode Secret Storageへのアクセス権限がない

**解決方法**:
1. macOS: Keychainアクセス許可を確認
2. Windows: Credential Managerへのアクセスを確認
3. Linux: libsecretがインストールされているか確認

---

### 問題: ワークフローがSlackに表示されない

**原因**:
- チャンネルにBotが参加していない
- メッセージ投稿権限がない

**解決方法**:
1. Slackチャンネルで `/invite @Claude Code Workflows` を実行
2. Botをチャンネルメンバーに追加

---

### 問題: Rate Limit超過エラー

**原因**:
- Slack API Rate Limitに達した

**解決方法**:
1. エラーメッセージの `Retry-After` 時間を待つ
2. `@slack/web-api` の自動リトライ機能が動作しているか確認
3. 連続リクエストを避ける（バッチ処理の検討）

---

## 次のステップ

1. `tasks.md` を生成して実装タスクを詳細化 (`/speckit.tasks`)
2. 優先度P1のユーザーストーリーから実装開始
3. Manual E2Eテストを実施しながら段階的に機能追加
4. Slack App Directoryへの公開準備（本番環境設定）

---

## 参考リンク

- [Slack API Documentation](https://api.slack.com/docs)
- [@slack/web-api SDK](https://slack.dev/node-slack-sdk/web-api)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Feature Specification](./spec.md)
- [API Contracts](./contracts/)
- [Data Model](./data-model.md)
