# 実装計画: Slack統合型ワークフロー共有

**ブランチ**: `001-slack-workflow-sharing` | **日付**: 2025-11-22 | **仕様**: [spec.md](./spec.md)
**入力**: `/specs/001-slack-workflow-sharing/spec.md` の機能仕様書

**注意**: このテンプレートは `/speckit.plan` コマンドによって記入されます。実行ワークフローについては `.specify/templates/commands/plan.md` を参照してください。

## 概要

Claude Code Workflow StudioにSlack統合機能を追加し、開発者がワークフロー定義ファイル(JSON)をSlackチャンネルに直接共有し、チームメンバーがSlackから1クリックでワークフローをインポートできる機能を提供します。

**主要要件**:
- VS CodeからSlackチャンネルへのワークフロー共有（リッチメッセージカード表示）
- Slackメッセージからワークフローの1クリックインポート
- 機密情報検出・警告機能（APIキー、トークンなど）
- 過去共有ワークフローの検索・フィルタリング機能（名前、作成者、日付、チャンネル）
- Slack App Directory公開による簡易インストール
- OAuth認証（VS Code拡張機能内のローカルHTTPサーバー処理）
- ワークフローファイルはSlackメッセージの添付ファイルとして保存（外部ストレージ不要）

## 技術コンテキスト

<!--
  要対応: このセクションの内容をプロジェクトの技術的詳細に置き換えてください。
  ここに示された構造は、反復プロセスをガイドするための助言として提示されています。
-->

**言語/バージョン**: TypeScript 5.3 (VSCode Extension Host & Webview UI)
**主要な依存関係**:
- VSCode Extension API 1.80.0+ (Extension Host)
- React 18.2 (Webview UI)
- Slack Web API (@slack/web-api) - NEEDS CLARIFICATION: 最新バージョンの選定
- Slack OAuth (@slack/oauth) - NEEDS CLARIFICATION: 認証フロー実装の詳細
- Express.js - NEEDS CLARIFICATION: OAuthコールバック用ローカルHTTPサーバーのバージョン選定
- Zustand (既存の状態管理ライブラリ)
**ストレージ**:
- ローカルファイルシステム (`.vscode/workflows/*.json` - 既存)
- VSCode Secret Storage (Slack OAuth トークン保存用) - NEEDS CLARIFICATION: 実装詳細
- Slackメッセージの添付ファイル (ワークフロー共有データの永続化)
**テスト**: Manual E2E testing (既存方針に従う)
**ターゲットプラットフォーム**: VSCode Extension (Windows, macOS, Linux)
**プロジェクトタイプ**: VSCode Extension (既存プロジェクト拡張)
**パフォーマンス目標**:
- ワークフロー共有処理 < 3秒 (Slack API呼び出し含む)
- ワークフローインポート処理 < 2秒
- 機密情報検出処理 < 500ms (ファイルサイズ100KB未満想定)
**制約**:
- Slack API rate limits (Tier 3: 20+ requests/minute)
- ワークフローファイルサイズ上限: 1MB (Slack添付ファイル制限を考慮)
- OAuth認証用ローカルHTTPサーバーはエフェメラルポート使用（ポート競合回避）
- 外部ストレージサービス (S3等) への依存を最小化
**規模/スコープ**:
- 新規機能追加: Extension Host側 5-8ファイル、Webview UI側 3-5コンポーネント
- 既存コードベースへの影響: 最小限 (新規サービス追加が中心)
- Slack App Directory公開対応: アプリマニフェスト、OAuth設定、配布用ドキュメント

## Constitution Check

*ゲート: Phase 0 調査の前に合格する必要があります。Phase 1 設計後に再確認してください。*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - すべてのSlack API連携サービス、OAuth処理、機密情報検出ロジックは適切にドキュメント化
  - 命名規則: `SlackWorkflowSharingService`, `SensitiveDataDetector`, `OAuthCallbackHandler`
- [x] 命名規則が明確に定義されているか
  - Extension Host: `slack-*-service.ts` (例: `slack-api-service.ts`, `slack-oauth-service.ts`)
  - Webview UI: React コンポーネント `Slack*.tsx` (例: `SlackShareDialog.tsx`, `SlackImportButton.tsx`)
- [x] コードの複雑度が妥当な範囲に収まっているか
  - Slack API呼び出しは専用サービスに分離
  - OAuth フローは段階的に実装（認証 → トークン取得 → トークン保存）
  - 機密情報検出は正規表現ベースの単純なパターンマッチング

### II. テスト駆動開発
- [ ] テストファースト開発プロセスが計画されているか
  - **理由**: 既存プロジェクト方針がManual E2E testingのため、自動化されたTDDプロセスは適用しない
  - Phase 2 (tasks.md) でManual E2Eテストシナリオを詳細に定義
- [ ] 契約テスト・統合テスト・ユニットテストの計画があるか
  - **理由**: 同上。既存プロジェクト方針に従い、Manual E2E testingのみ実施
- [ ] テストカバレッジ目標（80%以上)が設定されているか
  - **理由**: 自動テストを実施しないため、カバレッジ目標は設定しない

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - 既存ダイアログパターンに準拠 (`AiGenerationDialog.tsx` を参考)
  - Slackチャンネル選択: ドロップダウン形式
  - 機密情報警告: 既存のエラーダイアログパターンを再利用
- [x] エラーメッセージの明確性が確保されているか
  - Slack API エラー: 具体的なエラー内容 + ユーザーが取るべきアクション
  - OAuth エラー: 認証失敗理由 + 再試行手順
  - 機密情報検出警告: 検出された情報の種類 + 削除推奨メッセージ
- [x] アクセシビリティが考慮されているか
  - キーボードショートカット: Ctrl/Cmd+Shift+S (Share to Slack)
  - スクリーンリーダー対応: ARIA labels追加
  - 既存i18n対応に統合 (5言語: en, ja, ko, zh-CN, zh-TW)

### IV. パフォーマンス基準
- [x] API応答時間目標（p95 < 200ms）が検討されているか
  - Slack API呼び出しは外部要因のため、この基準からは除外
  - ワークフロー共有処理全体: < 3秒 (Slack API呼び出し含む)
  - ワークフローインポート処理: < 2秒
  - 機密情報検出処理: < 500ms (ファイルサイズ100KB未満想定)
- [x] データベース最適化が計画されているか
  - **N/A**: データベース使用なし（ファイルシステム + VSCode Secret Storage）
- [x] フロントエンドロード時間目標が設定されているか（該当する場合）
  - Webview UI: 既存のReactコンポーネントパターンに準拠
  - 新規ダイアログのロード時間: < 300ms

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - Slack API連携: 専用サービスクラスに分離 (`SlackApiService`)
  - OAuth処理: 独立したサービス (`SlackOAuthService`)
  - 機密情報検出: 独立したユーティリティ (`SensitiveDataDetector`)
  - Webview UI: React コンポーネントベースの設計
- [x] 設定管理の方針が明確か
  - Slack App credentials: 環境変数 (`SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`)
  - OAuth tokens: VSCode Secret Storage (暗号化保存)
  - 機密情報検出パターン: 設定ファイル (`.vscode/settings.json` で拡張可能)
- [x] バージョニング戦略が定義されているか
  - Semantic Versioning (既存プロジェクト方針に従う)
  - Slack App マニフェスト: バージョン番号を含む
  - 破壊的変更時は移行ガイド提供

**違反の正当化**:
- テスト駆動開発 (II): 既存プロジェクト方針がManual E2E testingのため、自動テストは実施しない。複雑度追跡テーブルには記録不要（プロジェクト標準方針のため）

## プロジェクト構造

### ドキュメント (この機能)

```text
specs/[###-feature]/
├── plan.md              # このファイル (/speckit.plan コマンドの出力)
├── research.md          # Phase 0 の出力 (/speckit.plan コマンド)
├── data-model.md        # Phase 1 の出力 (/speckit.plan コマンド)
├── quickstart.md        # Phase 1 の出力 (/speckit.plan コマンド)
├── contracts/           # Phase 1 の出力 (/speckit.plan コマンド)
└── tasks.md             # Phase 2 の出力 (/speckit.tasks コマンド - /speckit.plan では作成されない)
```

### ソースコード (リポジトリルート)
<!--
  要対応: 以下のプレースホルダーツリーをこの機能の具体的なレイアウトに置き換えてください。
  未使用のオプションを削除し、選択した構造を実際のパス（例: apps/admin、packages/something）で
  展開してください。提供される計画にはオプションラベルを含めないでください。
-->

```text
# VSCode Extension構造 (既存プロジェクトに新規機能追加)

src/extension/                    # Extension Host (Node.js)
├── services/
│   ├── slack-api-service.ts      # Slack Web API連携 (新規)
│   ├── slack-oauth-service.ts    # OAuth認証フロー処理 (新規)
│   └── sensitive-data-detector.ts # 機密情報検出ユーティリティ (新規)
├── commands/
│   ├── slack-share-workflow.ts   # ワークフロー共有コマンド (新規)
│   └── slack-import-workflow.ts  # ワークフローインポートコマンド (新規)
└── utils/
    └── oauth-callback-server.ts  # ローカルHTTPサーバー (OAuth callback用) (新規)

src/webview/                      # Webview UI (React)
├── src/
│   ├── components/
│   │   ├── dialogs/
│   │   │   └── SlackShareDialog.tsx      # Slack共有ダイアログ (新規)
│   │   └── buttons/
│   │       └── SlackImportButton.tsx     # Slackインポートボタン (新規)
│   ├── services/
│   │   └── slack-integration-service.ts  # Extension Hostとの通信 (新規)
│   └── i18n/
│       └── translations/
│           ├── en.ts  # 英語翻訳 (拡張)
│           ├── ja.ts  # 日本語翻訳 (拡張)
│           ├── ko.ts  # 韓国語翻訳 (拡張)
│           ├── zh-CN.ts  # 中国語簡体字翻訳 (拡張)
│           └── zh-TW.ts  # 中国語繁体字翻訳 (拡張)

.vscode/
└── workflows/                    # ワークフロー定義ファイル (既存)
    └── *.json

resources/                        # Slack App関連リソース (新規)
├── slack-app-manifest.json       # Slack App マニフェスト
└── oauth-redirect.html           # OAuth認証リダイレクトページ
```

**構造の決定**: VSCode Extension構造（既存プロジェクト拡張）を採用。Extension Host側に3つの新規サービス、2つの新規コマンド、1つのユーティリティを追加。Webview UI側に2つの新規コンポーネント、1つの新規サービスを追加。既存のi18n対応に5言語の翻訳を拡張。

## 複雑度追跡

> **Constitution Checkで正当化が必要な違反がある場合のみ記入**

該当なし。すべてのConstitution Check項目が合格しており、正当化が必要な違反はありません。
