# Tasks: Slack統合型ワークフロー共有

**Input**: `/specs/001-slack-workflow-sharing/`の設計ドキュメント
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**テスト方針**: 手動E2Eテストのみ実施 (自動テストは含まれません)

**組織方針**: タスクはユーザーストーリー別に整理され、各ストーリーを独立して実装・テスト可能にします。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能 (異なるファイル、依存関係なし)
- **[Story]**: このタスクが属するユーザーストーリー (US1, US2, US3など)
- タスク説明には正確なファイルパスを含める

## 進捗管理

**重要**: タスク完了時は、`- [ ]` を `- [x]` に変更してマークしてください。

例:
```markdown
- [ ] T001 未完了のタスク
- [x] T002 完了したタスク
```

これにより、実装の進捗を可視化できます。

---

## Phase 1: Setup (共通インフラストラクチャ)

**目的**: プロジェクト初期化と基本構造の構築

- [x] T001 プロジェクト構造の確認とディレクトリ準備
- [x] T002 @slack/web-api 7.x 依存関係のインストール
- [x] T003 [P] TypeScript型定義ファイルの準備 (@types/node)
- [x] T004 [P] i18n翻訳ファイルにSlack統合用キーのスケルトン追加 (5言語: en, ja, ko, zh-CN, zh-TW)

---

## Phase 2: Foundational (ブロック前提条件)

**目的**: すべてのユーザーストーリー実装前に完了必須のコアインフラストラクチャ

**⚠️ 重要**: このフェーズが完了するまで、ユーザーストーリーの作業は開始できません

- [x] T005 OAuth認証用ローカルHTTPサーバーの実装 in src/extension/utils/oauth-callback-server.ts
- [x] T006 VSCode Secret Storage連携のトークン管理実装 in src/extension/utils/slack-token-manager.ts
- [x] T007 Slack OAuth認証フローサービスの実装 in src/extension/services/slack-oauth-service.ts
- [x] T008 Slack Web API基本クライアント実装 in src/extension/services/slack-api-service.ts
- [x] T009 [P] 機密情報検出ユーティリティの実装 in src/extension/utils/sensitive-data-detector.ts
- [x] T010 [P] データモデル型定義の作成 in src/extension/types/slack-integration-types.ts
- [x] T011 [P] Webview ↔ Extension Host メッセージング型定義の作成 in src/extension/types/slack-messages.ts
- [x] T012 エラーハンドリングユーティリティの実装 in src/extension/utils/slack-error-handler.ts

**Checkpoint**: 基盤準備完了 - ユーザーストーリー実装を並列開始可能

---

## Phase 3: User Story 1 - VS CodeからSlackへのワークフロー共有 (優先度: P1) 🎯 MVP

**ゴール**: 開発者がVS Code上で作成したワークフロー定義ファイルを、チームのSlackチャンネルに直接共有できるようにする。共有時には機密情報の検出と警告が行われ、Slack上ではリッチメッセージカードとして表示される。

**独立テスト**: VS Code上でワークフローを選択し、Slackチャンネルに共有し、Slack上でリッチメッセージカードを確認できる。

### Manual E2E Tests for User Story 1

以下のテストシナリオは、実装完了後に手動で実施します:

**T001: 基本的なワークフロー共有**
1. Workflow Studioを開く
2. ツールバーの「Share to Slack」ボタンをクリック
3. チャンネル選択ダイアログで共有先を選択
4. 機密情報警告が表示されないことを確認 (機密情報がない場合)
5. Slackチャンネルでリッチメッセージカードを確認

**T002: 機密情報検出警告**
1. ワークフローファイルにAWSキー (`AKIA1234567890ABCDEF`) を含める
2. ツールバーの「Share to Slack」ボタンをクリック
3. 機密情報警告ダイアログが表示されることを確認
4. マスク済みの値 (`AKIA...CDEF`) が表示されることを確認
5. 「続行」を選択して共有完了

**T003: 未認証エラー**
1. Slack未接続の状態でツールバーの「Share to Slack」ボタンをクリック
2. 「Slackに接続してください」エラーが表示されることを確認

### Implementation for User Story 1

- [x] T013 [P] [US1] Slackチャンネル一覧取得APIの実装 in src/extension/services/slack-api-service.ts
- [x] T014 [P] [US1] ワークフローファイルアップロードAPIの実装 in src/extension/services/slack-api-service.ts
- [x] T015 [P] [US1] リッチメッセージカード投稿APIの実装 in src/extension/services/slack-api-service.ts
- [x] T016 [P] [US1] Block Kit メッセージビルダー実装 in src/extension/utils/slack-message-builder.ts
- [x] T017 [US1] ワークフロー共有コマンドの実装 in src/extension/commands/slack-share-workflow.ts
- [x] T018 [US1] 機密情報検出とユーザー警告フローの統合 in src/extension/commands/slack-share-workflow.ts
- [x] T019 [P] [US1] Slackチャンネル選択ダイアログコンポーネントの実装 in src/webview/src/components/dialogs/SlackShareDialog.tsx
- [x] T020 [P] [US1] Webview側Slack統合サービスの実装 in src/webview/src/services/slack-integration-service.ts
- [x] T021 [US1] Extension HostとWebview間のメッセージハンドリング実装 in src/extension/commands/open-editor.ts
- [x] T022 [US1] VS Code コマンド登録 (`Slack: Share Workflow`) in src/extension/commands/open-editor.ts
- [x] T023 [P] [US1] i18n翻訳の追加 (ワークフロー共有関連メッセージ) in src/webview/src/i18n/translations/*.ts

**Checkpoint**: User Story 1 バックエンド実装完了 - Webview経由でテスト可能

---

## Phase 3.1: User Story 1 - ツールバーUI統合 (優先度: P1)

**ゴール**: Workflow Studio（Webview UI）内のツールバーに「Share to Slack」ボタンを表示し、クリックするとSlack共有ダイアログが表示される。

**独立テスト**: Workflow Studioを開き、ツールバー（上部）の「Share to Slack」ボタンをクリックして、Slack共有ダイアログが開くことを確認できる。

### Implementation for Phase 3.1

- [x] T023-1 [P] [US1] Toolbar.tsxにonShareToSlackプロパティとボタンを追加 in src/webview/src/components/Toolbar.tsx
- [x] T023-2 [P] [US1] App.tsxでhandleShareToSlackコールバック実装 in src/webview/src/App.tsx
- [x] T023-3 [P] [US1] SlackShareDialogの状態管理とレンダリング in src/webview/src/App.tsx

**Checkpoint**: User Story 1完全実装完了 - Workflow Studioツールバーから直接実行可能

---

## Phase 3.2: Multi-workspace Support (優先度: P1)

**ゴール**: 複数のSlackワークスペースに対応し、ワークスペース選択UIを追加する。

**独立テスト**: 複数のワークスペースに接続し、Share to Slackダイアログでワークスペースを切り替えてチャンネル一覧が更新されることを確認できる。

### Implementation for Phase 3.2

- [x] T023-7 [P] [US1] SlackTokenManagerをマルチワークスペース対応に拡張 in src/extension/utils/slack-token-manager.ts
- [x] T023-8 [P] [US1] SlackApiServiceをワークスペースID指定対応に拡張 in src/extension/services/slack-api-service.ts
- [x] T023-12 [US1] LIST_SLACK_WORKSPACESメッセージハンドラー実装 in src/extension/commands/open-editor.ts
- [x] T023-13 [P] [US1] listSlackWorkspaces() Webviewサービス実装 in src/webview/src/services/slack-integration-service.ts
- [x] T023-14 [P] [US1] SlackShareDialogにワークスペース選択UI追加 in src/webview/src/components/dialogs/SlackShareDialog.tsx
- [x] T023-15 [P] [US1] i18n翻訳追加（ワークスペース選択関連） in src/webview/src/i18n/translations/*.ts

**Checkpoint**: Multi-workspace対応完了 - 複数ワークスペース間でワークフロー共有可能

---

## Phase 3.3: OAuth Authentication UI Integration (優先度: P1)

**ゴール**: SlackShareDialog内にOAuth認証開始ボタンを追加し、未接続状態からワンクリックで認証を開始できるようにする。

**独立テスト**: Slack未接続の状態でShare to Slackダイアログを開き、「Connect to Slack」ボタンをクリックしてOAuth認証フローが開始されることを確認できる。

### Implementation for Phase 3.3

- [x] T024-1 [P] [US1] SlackShareDialogに「Connect to Slack」ボタン追加 in src/webview/src/components/dialogs/SlackShareDialog.tsx
- [x] T024-2 [P] [US1] OAuth認証成功後のワークスペース一覧再取得処理 in src/webview/src/components/dialogs/SlackShareDialog.tsx
- [x] T024-3 [P] [US1] i18n翻訳追加（Connect to Slackボタン関連） in src/webview/src/i18n/translations/*.ts
- [x] T024-4 [P] [US1] GET_OAUTH_REDIRECT_URI message type追加 in src/shared/types/messages.ts
- [x] T024-5 [P] [US1] Extension HostでのRedirect URI取得ハンドラー実装 in src/extension/commands/open-editor.ts
- [x] T024-6 [P] [US1] WebviewでのRedirect URI表示UI実装 in src/webview/src/components/dialogs/SlackShareDialog.tsx
- [x] T024-7 [US1] ngrok統合によるHTTPS URL取得 (以下のサブタスク)
  - [x] T024-7-1 [P] [US1] ngrok依存関係の追加 in package.json (devDependencies)
  - [x] T024-7-2 [P] [US1] ngrokサービスクラスの実装 in src/extension/utils/ngrok-service.ts
  - [x] T024-7-3 [US1] Extension HostでngrokトンネルURL取得 in src/extension/commands/open-editor.ts
  - [x] T024-7-4 [P] [US1] エラーハンドリング実装（ngrok未インストール等） in src/extension/utils/ngrok-service.ts
  - [x] T024-7-5 [P] [US1] Vite設定でngrokを外部依存関係に追加 in vite.extension.config.ts

**Checkpoint**: OAuth認証UI統合完了 - ユーザーはダイアログ内から直接Slack認証を開始可能、開発時にHTTPS Redirect URIを取得可能

---

## Phase 3.4: Share未保存ワークフロー対応 (優先度: P1)

**ゴール**: 現在のキャンバス状態（未保存または編集中）を直接Slackに共有できるようにし、Save操作を強制しない自然なUXを実現する。

**独立テスト**: 未保存のワークフローまたは保存後に編集したワークフローをShare to Slackして、現在の画面状態が正しく共有されることを確認できる。

### 背景

**問題点：**
- workflowIdを送信してExtension側でファイルから読み込むため、未保存ワークフローではファイルが存在せず失敗する
- Save後に編集した場合、古いファイル内容が共有される
- ユーザーは「今画面に見えているワークフロー」を共有したいが、それができない

**解決方法：**
- Webview側で現在のノード/エッジからWorkflowオブジェクトを動的に生成
- payloadにworkflow全体を含めてExtensionに送信
- Extension側でファイル読み込みをスキップし、受け取ったworkflowをそのまま使用

### Implementation for Phase 3.4

- [x] T024-8 [P] [US1] ShareWorkflowToSlackPayload型定義の拡張 in src/shared/types/messages.ts
- [x] T024-9 [P] [US1] SlackShareDialogで動的Workflow生成 in src/webview/src/components/dialogs/SlackShareDialog.tsx
- [x] T024-10 [P] [US1] ShareWorkflowOptions型定義の更新 in src/webview/src/services/slack-integration-service.ts
- [x] T024-11 [US1] Extension側ハンドラーの修正（ファイル読み込み削除） in src/extension/commands/slack-share-workflow.ts
- [x] T024-12 [US1] VSCodeネイティブ通知の追加（成功時に"View in Slack"ボタン付き） in src/extension/commands/slack-share-workflow.ts

**Checkpoint**: Share未保存ワークフロー対応完了 - 未保存/編集中のワークフローを直接Slackに共有可能

---

## Phase 4: User Story 2 - Slackからのワンクリックインポート (優先度: P1)

**ゴール**: チームメンバーがSlack上で共有されたワークフローメッセージから、ワンクリックで自分のVS Codeにワークフローをインポートできるようにする。手動でのファイルダウンロード、ディレクトリ配置、エディタでの開く操作は不要。

**独立テスト**: Slackメッセージの「Import to VS Code」ボタンをクリックし、VS Code上でワークフローが自動的に開かれることを確認できる。

### Manual E2E Tests for User Story 2

以下のテストシナリオは、実装完了後に手動で実施します:

**T004: 基本的なワークフローインポート**
1. Slackメッセージの「Import to VS Code」ボタンをクリック
2. VS Codeに戻り、インポート成功通知を確認
3. `.vscode/workflows/` にファイルが保存されていることを確認

**T005: 上書き確認**
1. 既存ワークフローと同名のファイルをインポート
2. 上書き確認ダイアログが表示されることを確認
3. 「上書き」を選択してインポート完了

**T006: ファイル破損エラー**
1. ワークフローファイルが破損している状態でインポート実行
2. エラーメッセージが表示され、インポートが失敗することを確認

### Implementation for User Story 2

- [x] T024 [P] [US2] Slackファイルダウンロード実装 in src/extension/services/slack-api-service.ts
- [x] T025 [P] [US2] ワークフロー定義ファイルバリデーション実装 in src/extension/utils/workflow-validator.ts
- [x] T026 [US2] ワークフローインポートコマンドの実装 in src/extension/commands/slack-import-workflow.ts
- [x] T027 [US2] ファイル上書き確認ダイアログの実装 in src/extension/commands/slack-import-workflow.ts
- [x] T028 [US2] インポート後のファイル自動オープン機能 in src/extension/commands/slack-import-workflow.ts
- [x] T029 [P] [US2] Slackインポートボタンコンポーネントの実装 in src/webview/src/components/buttons/SlackImportButton.tsx
- [x] T030 [US2] deep link ハンドリング実装 (VS Code URI handler) in src/extension/extension.ts
- [x] T031 [US2] VS Code コマンド登録 (`Slack: Import Workflow`) in src/extension/extension.ts
- [x] T032 [P] [US2] i18n翻訳の追加 (ワークフローインポート関連メッセージ) in src/webview/src/i18n/translations/*.ts

**Checkpoint**: User Story 1とUser Story 2が独立して動作することを確認

---

## Phase 5: User Story 3 - VS Code内からの過去ワークフロー検索・再利用 (優先度: P2)

**ゴール**: 開発者がVS Code内から、Slackに過去に共有されたワークフローを検索し、再利用できるようにする。チャンネル名、ワークフロー名、作成者、共有日時などで絞り込み検索が可能。

**独立テスト**: VS Code上で「Slackワークフロー検索」コマンドを実行し、過去に共有されたワークフローを検索・インポートできることを確認できる。

### Manual E2E Tests for User Story 3

以下のテストシナリオは、実装完了後に手動で実施します:

**T007: ワークフロー検索**
1. コマンドパレットで `Slack: Search Workflows` を実行
2. 検索クエリを入力 (例: `data processing`)
3. 過去に共有されたワークフローがリスト表示されることを確認
4. ワークフローを選択してインポート

**T008: 検索フィルタリング**
1. ワークフロー一覧が表示されている状態でフィルタを適用
2. 作成者名で絞り込み
3. 該当する作成者が共有したワークフローのみが表示されることを確認

**T009: 検索結果ソート**
1. 検索結果が表示されている状態で共有日時降順でソート
2. 最新の共有ワークフローが上位に表示されることを確認

### Implementation for User Story 3

- [ ] T033 [P] [US3] Slackメッセージ検索API実装 in src/extension/services/slack-api-service.ts
- [ ] T034 [P] [US3] 検索結果フィルタリング・ソート実装 in src/extension/services/slack-search-service.ts
- [ ] T035 [US3] ワークフロー検索コマンドの実装 in src/extension/commands/slack-search-workflows.ts
- [ ] T036 [P] [US3] ワークフロー検索ダイアログコンポーネントの実装 in src/webview/src/components/dialogs/SlackSearchDialog.tsx
- [ ] T037 [P] [US3] 検索結果リストコンポーネントの実装 in src/webview/src/components/lists/WorkflowSearchResults.tsx
- [ ] T038 [US3] 検索結果からのインポート機能統合 in src/webview/src/components/dialogs/SlackSearchDialog.tsx
- [ ] T039 [US3] VS Code コマンド登録 (`Slack: Search Workflows`) in src/extension/extension.ts
- [ ] T040 [P] [US3] i18n翻訳の追加 (ワークフロー検索関連メッセージ) in src/webview/src/i18n/translations/*.ts

**Checkpoint**: User Story 1, 2, 3がすべて独立して動作することを確認

---

## Phase 6: User Story 4 - Slack認証とワークスペース管理 (優先度: P3)

**ゴール**: 開発者が初回利用時にSlackワークスペースとの連携を設定し、複数のワークスペースを切り替えながら利用できるようにする。認証情報は安全に管理され、再認証が必要な場合には自動的に通知される。

**独立テスト**: 初回利用時にSlack認証フローを完了し、複数のワークスペースを切り替えることで、柔軟なワークスペース管理が可能であることを確認できる。

### Manual E2E Tests for User Story 4

以下のテストシナリオは、実装完了後に手動で実施します:

**T010: 初回Slack接続**
1. コマンドパレットで `Slack: Connect Workspace` を実行
2. ブラウザでSlack OAuth認証ページが開く
3. ワークスペースを選択し、アクセスを許可
4. VS Codeに戻り、接続成功通知を確認

**T011: ワークスペース切り替え**
1. コマンドパレットで `Slack: Switch Workspace` を実行
2. 利用可能なワークスペース一覧が表示される
3. ワークスペースを選択
4. 切り替え成功通知を確認

**T012: 再認証フロー**
1. Slackアクセストークンの有効期限を切らす (またはトークンを削除)
2. 共有またはインポートを実行
3. 再認証が必要である旨の通知が表示される
4. 再認証フローが開始されることを確認

### Implementation for User Story 4

- [ ] T041 [P] [US4] ワークスペース情報取得API実装 in src/extension/services/slack-api-service.ts
- [ ] T042 [P] [US4] トークン有効性検証実装 in src/extension/services/slack-oauth-service.ts
- [ ] T043 [P] [US4] ワークスペース管理サービスの実装 in src/extension/services/slack-workspace-manager.ts
- [ ] T044 [US4] Slack接続コマンドの実装 in src/extension/commands/slack-connect.ts
- [ ] T045 [US4] Slack切断コマンドの実装 in src/extension/commands/slack-disconnect.ts
- [ ] T046 [US4] ワークスペース切り替えコマンドの実装 in src/extension/commands/slack-switch-workspace.ts
- [ ] T047 [P] [US4] ワークスペース接続状態表示UI実装 in src/webview/src/components/status/SlackConnectionStatus.tsx
- [ ] T048 [P] [US4] ワークスペース切り替えダイアログ実装 in src/webview/src/components/dialogs/SlackWorkspaceSwitchDialog.tsx
- [ ] T049 [US4] VS Code コマンド登録 (`Slack: Connect Workspace`, `Slack: Disconnect`, `Slack: Switch Workspace`) in src/extension/extension.ts
- [ ] T050 [P] [US4] i18n翻訳の追加 (認証・ワークスペース管理関連メッセージ) in src/webview/src/i18n/translations/*.ts

**Checkpoint**: すべてのユーザーストーリーが独立して機能することを確認

---

## Phase 7: Polish & Cross-Cutting Concerns

**目的**: 複数のユーザーストーリーにまたがる改善

- [ ] T051 [P] エラーメッセージとログ出力の一貫性確認 in src/extension/utils/slack-error-handler.ts
- [ ] T052 [P] パフォーマンス最適化 (Slack API呼び出しのキャッシング検討)
- [ ] T053 [P] セキュリティハードニング (トークン漏洩チェック、ログ出力制限)
- [ ] T054 [P] i18n翻訳の完全性確認 (すべての5言語で一貫性チェック)
- [ ] T055 コード品質チェック (npm run format, npm run lint, npm run check, npm run build)
- [ ] T056 quickstart.mdの検証 (すべての手順が正確に動作することを確認)
- [ ] T057 [P] VSCode Extension マニフェスト更新 (package.json: コマンド、スコープ、依存関係)
- [ ] T058 [P] Slack App マニフェスト作成 in resources/slack-app-manifest.json

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存関係なし - 即座に開始可能
- **Foundational (Phase 2)**: Setupに依存 - すべてのユーザーストーリーをブロック
- **User Stories (Phase 3-6)**: すべてFoundational完了に依存
  - ユーザーストーリーは並列実行可能 (複数人で作業する場合)
  - または優先順位順に順次実行 (P1 → P2 → P3)
- **Polish (Phase 7)**: すべての実装したいユーザーストーリー完了に依存

### User Story Dependencies

- **User Story 1 (P1)**: Foundational (Phase 2) 完了後に開始可能 - 他ストーリーへの依存なし
- **User Story 2 (P1)**: Foundational (Phase 2) 完了後に開始可能 - US1と統合するが独立してテスト可能
- **User Story 3 (P2)**: Foundational (Phase 2) 完了後に開始可能 - US1/US2と統合するが独立してテスト可能
- **User Story 4 (P3)**: Foundational (Phase 2) 完了後に開始可能 - すべてのストーリーに基盤を提供するが独立してテスト可能

### Within Each User Story

- モデル/型定義 → サービス → コマンド → UI コンポーネント
- Extension Host実装 → Webview実装 → 統合
- コア機能実装 → エラーハンドリング → i18n

### Parallel Opportunities

- Setupタスク ([P]マーク) は並列実行可能
- Foundationalタスク ([P]マーク) は並列実行可能 (Phase 2内)
- Foundational完了後、すべてのユーザーストーリーを並列開始可能 (チーム規模による)
- ユーザーストーリー内の [P] タスクは並列実行可能
- 異なるユーザーストーリーは異なるチームメンバーが並列作業可能

---

## Parallel Example: User Story 1

```bash
# User Story 1のAPI実装タスクを並列実行:
Task: "Slackチャンネル一覧取得APIの実装 in src/extension/services/slack-api-service.ts"
Task: "ワークフローファイルアップロードAPIの実装 in src/extension/services/slack-api-service.ts"
Task: "リッチメッセージカード投稿APIの実装 in src/extension/services/slack-api-service.ts"

# User Story 1のUIコンポーネント実装を並列実行:
Task: "Slackチャンネル選択ダイアログコンポーネントの実装 in src/webview/src/components/dialogs/SlackShareDialog.tsx"
Task: "Webview側Slack統合サービスの実装 in src/webview/src/services/slack-integration-service.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1完了: Setup
2. Phase 2完了: Foundational (重要 - すべてのストーリーをブロック)
3. Phase 3完了: User Story 1
4. **停止して検証**: User Story 1を独立してテスト
5. デモ/デプロイ可能な状態

### Incremental Delivery

1. Setup + Foundational完了 → 基盤準備完了
2. User Story 1追加 → 独立テスト → デプロイ/デモ (MVP!)
3. User Story 2追加 → 独立テスト → デプロイ/デモ
4. User Story 3追加 → 独立テスト → デプロイ/デモ
5. User Story 4追加 → 独立テスト → デプロイ/デモ
6. 各ストーリーが前ストーリーを壊さずに価値を追加

### Parallel Team Strategy

複数の開発者がいる場合:

1. チーム全体でSetup + Foundationalを完了
2. Foundational完了後:
   - 開発者A: User Story 1
   - 開発者B: User Story 2
   - 開発者C: User Story 3
   - 開発者D: User Story 4
3. ストーリーが独立して完了・統合される

---

## Manual E2E Testing Plan

以下の手動E2Eテストシナリオは、各ユーザーストーリー実装完了後に実施します:

### User Story 1 - ワークフロー共有

- **T001**: 基本的なワークフロー共有
- **T002**: 機密情報検出警告
- **T003**: 未認証エラー

### User Story 2 - ワークフローインポート

- **T004**: 基本的なワークフローインポート
- **T005**: 上書き確認
- **T006**: ファイル破損エラー

### User Story 3 - ワークフロー検索

- **T007**: ワークフロー検索
- **T008**: 検索フィルタリング
- **T009**: 検索結果ソート

### User Story 4 - 認証・ワークスペース管理

- **T010**: 初回Slack接続
- **T011**: ワークスペース切り替え
- **T012**: 再認証フロー

### Additional Error Cases

quickstart.md (セクション 5.2) に記載された追加のエラーケーステストも実施:

- **E001**: 未認証エラー
- **E002**: チャンネルアクセスエラー
- **E003**: ネットワークエラー

### Performance Tests

quickstart.md (セクション 5.3) に記載されたパフォーマンステストも実施:

- **P001**: 共有処理時間 (< 3秒目標)
- **P002**: インポート処理時間 (< 2秒目標)
- **P003**: 機密情報検出時間 (< 500ms目標、100KB未満ファイル)

測定方法: `console.time()` / `console.timeEnd()` でログ出力

---

## Phase 8: Manual Token Input方式への移行 (優先度: P0 - ベータ版必須) 🔧

**目的**: OAuth認証フロー（ngrok使用）を削除し、ユーザーが手動でSlack Bot Tokenを入力する方式に簡素化

**背景**:
- ベータ版では、OAuth認証フロー（ngrok経由）が複雑すぎる
- 個人開発・小規模チームではManual Token Inputの方が理解しやすい
- GitHub CopilotなどもManual Token方式をサポート

**ゴール**: ユーザーがhttps://api.slack.com/appsで自分でSlack Appを作成し、Bot Tokenを手動入力してVSCodeと接続する

### Manual E2E Tests for Phase 8

**T010-M: Manual Token入力で初回接続**
1. コマンドパレットで `Slack: Connect Workspace (Manual Token)` を実行
2. Bot Token (xoxb-...) を入力
3. 接続成功通知を確認（Workspace名が表示される）
4. Share to Slackでワークスペースが選択可能であることを確認

**T011-M: 複数ワークスペースの手動接続**
1. 2つ目のワークスペースに対してManual Token入力
2. 両方のワークスペースが選択可能であることを確認

**T012-M: 無効なToken formatでのエラー表示**
1. `xoxp-` (User Token) を入力
2. エラーメッセージ「Bot Tokenが必要です (xoxb-で始まる)」が表示されることを確認

**T013-M: Token再入力で接続情報を上書き**
1. 既存の接続があるワークスペースに対して、新しいBot Tokenで再接続
2. 古い接続情報が新しい情報で上書きされることを確認

### Implementation for Phase 8

**削除するファイル**:
- src/extension/services/slack-oauth-service.ts (OAuth認証フロー全体)
- src/extension/utils/oauth-callback-server.ts (ローカルコールバックサーバー)
- src/extension/utils/ngrok-service.ts (ngrokトンネル管理)

**Backend (Extension Host)**

- [x] T100 [P] SlackTokenManagerの簡素化 in src/extension/utils/slack-token-manager.ts
  - Manual入力用の新メソッド追加: `storeManualConnection(workspaceId, workspaceName, teamId, accessToken, userId)`
  - Token validation強化: Bot Token (`xoxb-`) のみ許可

- [x] T101 Manual Token入力コマンドハンドラー実装 in src/extension/commands/slack-connect-manual.ts
  - VSCode Input Box UIでBot Token (xoxb-...) のみ入力
  - Token format validation (`xoxb-` prefix確認)
  - `auth.test` APIでToken検証 & ワークスペース情報自動取得:
    - Workspace ID (team_id)
    - Workspace Name (team)
  - Author名はgit configから取得（Slack User IDは使用しない）
  - VSCode Secret Storageに保存

- [x] T102 Extension Host message handler追加 in src/extension/commands/open-editor.ts
  - `CONNECT_SLACK_MANUAL` メッセージハンドラー追加
  - Input validation & error handling
  - Success/Failedレスポンス送信

- [x] T103 VSCode コマンド登録 in src/extension/extension.ts
  - `Slack: Connect Workspace (Manual Token)` コマンド追加
  - `package.json` の `contributes.commands` に追加

**Frontend (Webview UI)**

- [x] T104 [P] Manual Token入力ダイアログコンポーネント in src/webview/src/components/dialogs/SlackManualTokenDialog.tsx
  - Workspace Name入力フィールド
  - Workspace ID (Team ID)入力フィールド
  - Bot Token入力フィールド（type="password"）
  - User ID入力フィールド
  - セットアップ手順へのリンク（docs/slack-manual-token-setup.md）
  - Validation UI（token format check）

- [x] T105 [P] Webview service追加 in src/webview/src/services/slack-integration-service.ts
  - `connectSlackManual(workspaceName, workspaceId, teamId, token, userId)` 実装
  - Extension Hostへのメッセージ送信

- [x] T106 SlackShareDialogの更新 in src/webview/src/components/dialogs/SlackShareDialog.tsx
  - 「Connect to Slack (Manual Token)」ボタンに変更
  - OAuth関連UI削除（ngrok URL表示、Redirect URI表示など）
  - Manual Token Dialog呼び出し

**Message Types**

- [x] T107 [P] Message type定義追加 in src/shared/types/messages.ts
  - `CONNECT_SLACK_MANUAL` request payload定義
  - `CONNECT_SLACK_MANUAL_SUCCESS` response定義
  - `CONNECT_SLACK_MANUAL_FAILED` response定義
  - OAuth関連message types削除（GET_OAUTH_REDIRECT_URI等）

**Dependencies & Configuration**

- [x] T108 [P] package.json更新
  - `@ngrok/ngrok` 依存関係削除（devDependencies）
  - 他のngrok関連パッケージ削除確認
  - OAuth関連VSCode設定項目削除

- [x] T109 [P] Vite設定更新 in vite.extension.config.ts
  - ngrok外部依存関係設定削除（存在する場合）

**Documentation**

- [x] T110 [P] セットアップ手順の簡易説明追加 in src/webview/src/components/dialogs/SlackManualTokenDialog.tsx
  - ダイアログ内に「How to Get Bot Token」セクションを追加（5ステップ）
  - 必須スコープの明示（channels:read, chat:write, files:write, groups:read）
  - セキュリティ・プライバシー情報の表示
  - 詳細なドキュメントは作成せず、ダイアログ内の簡潔な説明で対応

- [x] T111 README.md更新
  - Key Featuresに「Slack Workflow Sharing (β)」を追加
  - README肥大化を避けるため詳細セクションは作成せず簡潔な説明のみ

- [x] T112 quickstart.md更新 in specs/001-slack-workflow-sharing/quickstart.md
  - OAuth認証セクションは既に存在せず削除不要
  - Manual Token入力セクションは既に記載済み（2.4 Bot User Tokenの取得）

**i18n**

- [x] T113 [P] 翻訳追加 in src/webview/src/i18n/translations/*.ts (5言語: en, ja, ko, zh-CN, zh-TW)
  - Manual Token入力ダイアログ関連テキスト
  - セットアップガイドへのリンクテキスト
  - OAuth関連翻訳キー削除（使用されなくなったキー）

**Cleanup**

- [x] T114 削除ファイルのimport参照削除
  - SlackOAuthService importを削除
  - NgrokService importを削除
  - OAuthCallbackServer importを削除
  - OAuth関連サービスファイル削除（slack-oauth-service.ts, ngrok-service.ts, oauth-callback-server.ts）
  - GET_OAUTH_REDIRECT_URIメッセージハンドラー削除

- [x] T115 型定義クリーンアップ in src/extension/types/slack-integration-types.ts
  - OAuth関連フィールド削除またはOptionalに変更
  - SlackWorkspaceConnection.tokenScopeをOptionalに変更

**Testing & QA**

- [ ] T116 Manual E2E Testing
  - T010-M: Manual Token入力で初回接続
  - T011-M: 複数ワークスペースの手動接続
  - T012-M: 無効なToken formatでのエラー表示確認

- [x] T117 Code quality checks
  - `npm run format && npm run lint && npm run check && npm run build`

**Checkpoint**: Manual Token方式への移行完了 - OAuth依存なし、ユーザーは手動接続可能

---

## Notes

- **[P] タスク** = 異なるファイル、依存関係なし
- **[Story] ラベル** = タスクを特定のユーザーストーリーにマッピング (トレーサビリティ確保)
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 各タスクまたは論理的グループ後にコミット
- 任意のチェックポイントで停止し、ストーリーを独立して検証可能
- 避けるべき: 曖昧なタスク、同一ファイルでの競合、ストーリー独立性を壊すクロス依存関係
- 手動E2Eテストはすべての実装完了後に実施
- Code quality checksはコミット前に必ず実行 (npm run format && npm run lint && npm run check && npm run build)
