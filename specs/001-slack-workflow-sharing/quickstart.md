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

---

## 2. Slack App設定

### 2.1 Slack Appの作成

1. [Slack API](https://api.slack.com/apps) にアクセス
2. 「Create New App」→ 「From scratch」を選択
3. App Name: `Claude Code Workflow Studio` (例)
4. Workspace: 開発用ワークスペースを選択

### 2.2 Bot Token Scopesの設定

1. 「OAuth & Permissions」を開く
2. 「Scopes」→ 「Bot Token Scopes」に以下を追加:
   - `chat:write` - メッセージ投稿
   - `files:write` - ファイルアップロード
   - `channels:read` - チャンネル一覧取得
   - `groups:read` - メッセージ検索

### 2.3 Appのワークスペースへのインストール

1. 「OAuth & Permissions」ページの上部にある「Install to Workspace」ボタンをクリック
2. アクセス許可を確認して「Allow」をクリック
3. インストール完了後、「Bot User OAuth Token」が表示される

### 2.4 Bot User Tokenの取得

1. 「OAuth & Permissions」ページで「Bot User OAuth Token」を確認
2. トークンは `xoxb-` で始まる文字列 (例: `xoxb-YOUR-TOKEN-HERE`)
3. このトークンをVS Code拡張機能で使用する (初回共有時に入力を求められる)

**重要**: Bot User Tokenは秘密情報です。コードにハードコードしたり、公開リポジトリにコミットしないでください。

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
3. Workflow Studioを開き、ツールバーの「Share to Slack」ボタンをクリック
4. Bot User Tokenが未設定の場合、トークン入力ダイアログが表示される
5. Slack App設定で取得したBot User Token (xoxb-で始まる文字列) を入力

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
│   └── sensitive-data-detector.ts    # 実装する
├── commands/
│   ├── slack-share-workflow.ts       # 実装する
│   └── slack-import-workflow.ts      # 実装する

src/webview/src/
├── components/
│   ├── dialogs/
│   │   ├── SlackShareDialog.tsx      # 実装済み
│   │   └── SlackManualTokenDialog.tsx # 実装済み
│   └── buttons/
│       └── SlackImportButton.tsx     # 実装する
└── services/
    └── slack-integration-service.ts  # 実装する
```

### 4.2 実装の優先順位

**Phase 1** (トークン管理・基本機能):
1. `SlackManualTokenDialog.tsx` - トークン入力ダイアログUI ✓ (実装済み)
2. `slack-api-service.ts` - Slack API連携とトークン検証

**Phase 2** (共有機能):
3. `sensitive-data-detector.ts` - 機密情報検出
4. `slack-share-workflow.ts` - ワークフロー共有コマンド
5. `SlackShareDialog.tsx` - 共有ダイアログUI ✓ (実装済み)

**Phase 3** (インポート機能):
6. `slack-import-workflow.ts` - ワークフローインポートコマンド
7. `SlackImportButton.tsx` - インポートボタンUI

**Phase 4** (検索機能):
8. `slack-api-service.ts` - 検索API実装 (拡張)
9. Webview UI - 検索UI追加

### 4.3 コード例

#### slack-api-service.ts (骨格) - トークン検証

```typescript
import * as vscode from 'vscode';
import { WebClient } from '@slack/web-api';

export class SlackApiService {
  private client: WebClient | null = null;

  constructor(private context: vscode.ExtensionContext) {}

  /**
   * Bot User Tokenを検証し、有効な場合はクライアントを初期化
   */
  async validateAndStoreToken(token: string): Promise<{ valid: boolean; workspaceName?: string; error?: string }> {
    try {
      const client = new WebClient(token);
      const authTest = await client.auth.test();

      if (!authTest.ok) {
        return { valid: false, error: 'Token validation failed' };
      }

      // トークンを安全に保存
      await this.context.secrets.store('slack-bot-token', token);
      this.client = client;

      return {
        valid: true,
        workspaceName: authTest.team as string
      };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * 保存されたトークンを取得
   */
  async getStoredToken(): Promise<string | undefined> {
    return await this.context.secrets.get('slack-bot-token');
  }

  /**
   * Slack APIクライアントを取得 (トークンが保存されている場合)
   */
  async getClient(): Promise<WebClient | null> {
    if (this.client) {
      return this.client;
    }

    const token = await this.getStoredToken();
    if (!token) {
      return null;
    }

    this.client = new WebClient(token);
    return this.client;
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

**T001: Bot User Token設定テスト**
1. Workflow Studioを開く
2. ツールバーの「Share to Slack」ボタンをクリック
3. Bot User Tokenが未設定の場合、トークン入力ダイアログが表示される
4. Slack App設定で取得したBot User Token (xoxb-で始まる文字列) を入力
5. トークン検証が成功し、ワークスペース名が表示される
6. 保存後、チャンネル選択ダイアログが表示される

**T002: ワークフロー共有テスト**
1. Workflow Studioを開く
2. ツールバー（上部）の「Share to Slack」ボタンをクリック
3. チャンネル選択ダイアログで共有先を選択
4. 機密情報警告が表示されないことを確認 (機密情報がない場合)
5. Slackチャンネルでリッチメッセージカードを確認

**T003: 機密情報検出テスト**
1. ワークフローファイルにAWSキー (`AKIA1234567890ABCDEF`) を含める
2. ツールバー（上部）の「Share to Slack」ボタンをクリック
3. 機密情報警告ダイアログが表示されることを確認
4. マスク済みの値 (`AKIA...CDEF`) が表示されることを確認
5. 「続行」を選択して共有完了

**T004: ワークフローインポートテスト**
⚠️ **注意**: ワークフローインポート機能はUser Story 2の機能です。User Story 1のみ実装している状態では、この機能は未実装です。
1. Slackメッセージの「Import to VS Code」ボタンをクリック
2. VS Codeに戻り、インポート成功通知を確認
3. `.vscode/workflows/` にファイルが保存されていることを確認

**T005: 上書き確認テスト**
⚠️ **注意**: ワークフローインポート機能はUser Story 2の機能です。User Story 1のみ実装している状態では、この機能は未実装です。
1. 既存ワークフローと同名のファイルをインポート
2. 上書き確認ダイアログが表示されることを確認
3. 「上書き」を選択してインポート完了

**T006: 検索テスト**
⚠️ **注意**: `Slack: Search Workflows`コマンドはUser Story 3の機能です。User Story 1のみ実装している状態では、この機能は未実装です。
1. コマンドパレットで `Slack: Search Workflows` を実行
2. 検索クエリを入力 (例: `data processing`)
3. 過去に共有されたワークフローがリスト表示されることを確認
4. ワークフローを選択してインポート

### 5.2 エラーケースのテスト

**E001: トークン未設定エラー**
1. Bot User Token未設定の状態でツールバーの「Share to Slack」ボタンをクリック
2. トークン入力ダイアログが表示されることを確認

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

### 問題: Bot User Tokenの検証が失敗する

**原因**:
- トークンが無効または期限切れ
- トークンの形式が正しくない (xoxb-で始まっていない)
- 必要なスコープが不足している

**解決方法**:
1. Slack App設定の「OAuth & Permissions」ページで新しいトークンを取得
2. トークンが `xoxb-` で始まることを確認
3. 以下のBot Token Scopesが追加されているか確認:
   - `chat:write`
   - `files:write`
   - `channels:read`
   - `groups:read`
4. スコープ追加後、AppをワークスペースにReinstallして新しいトークンを取得

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
4. Bot User Token管理機能の拡張 (トークン再設定、ワークスペース情報表示など)

---

## 参考リンク

- [Slack API Documentation](https://api.slack.com/docs)
- [@slack/web-api SDK](https://slack.dev/node-slack-sdk/web-api)
- [Slack Block Kit Builder](https://app.slack.com/block-kit-builder)
- [VS Code Extension API](https://code.visualstudio.com/api)
- [Feature Specification](./spec.md)
- [API Contracts](./contracts/)
- [Data Model](./data-model.md)
