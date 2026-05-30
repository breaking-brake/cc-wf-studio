# タスク一覧: CC Workflow Studio

**入力**: `/specs/001-cc-wf-studio/` の設計ドキュメント
**前提条件**: plan.md, spec.md, research.md, data-model.md, contracts/

**構成**: タスクはユーザーストーリーごとにグループ化され、各ストーリーを独立して実装・テストできるようにしています。

**⚠️ 重要: タスク完了時の対応**
- タスクを完了したら、必ずこのファイル上でチェックボックスを `- [X]` にマークすること
- 各タスク完了後、進捗を記録し、次のタスクに進む前に確認すること

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（例: US1, US2）
- 説明に正確なファイルパスを含める

---

## Phase 1: セットアップ（共通基盤）

**目的**: プロジェクトの初期化と基本構造

- [X] T001 プロジェクト構造を作成 (src/extension/, src/webview/, src/shared/, tests/ ディレクトリ)
- [X] T002 Extension Host用のTypeScriptプロジェクトを初期化 (tsconfig.json)
- [X] T003 [P] src/webview/にReact + TypeScript + Viteプロジェクトを初期化
- [X] T004 [P] Extension依存関係をインストール: package.jsonに@types/vscode, @types/nodeを追加
- [X] T005 [P] Webview依存関係をインストール: src/webview/package.jsonにreact, react-dom, reactflow, zustand, @types/reactを追加
- [X] T006 [P] biome.jsonでBiomeを設定（コードフォーマット・リンター）
- [X] T007 package.jsonに拡張機能メタデータを作成 (name: cc-wf-studio, displayName, publisher, activationEvents)
- [X] T008 Extension Development Hostデバッグ用に.vscode/launch.jsonを作成
- [X] T009 コンパイルとウォッチタスク用に.vscode/tasks.jsonを作成

---

## Phase 2: 基盤構築（ブロッキング前提条件）

**目的**: すべてのユーザーストーリーの実装前に完了が必須なコアインフラ

**⚠️ 重要**: このフェーズが完了するまで、ユーザーストーリーの作業は開始できません

- [X] T010 src/shared/types/workflow-definition.tsに共通型定義を作成 (data-model.mdのWorkflow, WorkflowNode, Connection, Sub-AgentNode, AskUserQuestionNode型)
- [X] T011 [P] src/shared/types/messages.tsに共通メッセージ型を作成 (extension-webview-api.mdのMessage, ExtensionMessage, WebviewMessage, すべてのpayload型)
- [X] T012 [P] src/extension/extension.tsに拡張機能のアクティベーションを実装 (activate, deactivate関数)
- [X] T013 [P] src/webview/src/stores/workflow-store.tsにZustandストアを作成 (research.md section 3.4のnodes, edges, onNodesChange, onEdgesChange, onConnect)
- [X] T014 src/extension/webview-content.tsにWebview HTMLジェネレーターを実装 (vscode-extension-api.md section 4.2のgetWebviewContent: CSP, nonce, resource URIs)
- [X] T015 src/webview/vite.config.tsでViteビルド設定をセットアップ (dist/webview/への出力、ライブラリモード無効、Reactプラグイン)
- [X] T016 src/webview/src/main.tsxに基本Reactコンポーネント構造を作成 (React 18ルート、VSCode API取得)

**チェックポイント**: 基盤完成 - ユーザーストーリーの実装を並列で開始可能

---

## Phase 3: ユーザーストーリー1 - ワークフロービジュアルエディタでの作成 (優先度: P1) 🎯 MVP

**目標**: VSCode上でビジュアルエディタを開き、Sub-AgentノードとAskUserQuestionノードをドラッグ&ドロップで配置・接続し、ワークフローを作成できる

**独立テスト**: VSCode拡張機能をインストール後、コマンドパレットから「CC Workflow Studio」を開き、新規ワークフローを作成。Sub-Agentノードを1つ配置して保存できることを確認すれば、基本的なエディタ機能が動作していると検証できる。

### ユーザーストーリー1の実装

#### コマンド & Extension Hostコア

- [X] T017 [P] [US1] src/extension/commands/open-editor.tsにopenEditorコマンドを登録 (vscode-extension-api.md section 1.1のvscode.commands.registerCommandとcreateWebviewPanel)
- [X] T018 [P] [US1] src/extension/commands/save-workflow.tsにsaveWorkflowコマンドを登録 (SAVE_WORKFLOWメッセージ処理、.vscode/workflows/への書き込み)
- [X] T019 [P] [US1] src/extension/services/file-service.tsにファイルサービスを実装 (vscode-extension-api.md section 2のvscode.workspace.fs APIを使用したreadFile, writeFile, createDirectory, ensureWorkflowsDirectory)

#### Webview UI - React Flow キャンバス

- [X] T020 [US1] src/webview/src/components/WorkflowEditor.tsxにWorkflowEditorコンポーネントを作成 (research.md section 3.4のnodeTypes, edgeTypes, ストア統合を持つReactFlowコンポーネント)
- [X] T021 [P] [US1] src/webview/src/components/nodes/Sub-AgentNode.tsxにSub-AgentNodeコンポーネントを作成 (NodeProps<Sub-AgentNode>, 入出力用Handle, research.md section 3.2)
- [X] T022 [P] [US1] src/webview/src/components/nodes/AskUserQuestionNode.tsxにAskUserQuestionNodeコンポーネントを作成 (動的2-4分岐ポート、research.md section 3.3のuseUpdateNodeInternals)
- [X] T023 [US1] src/webview/src/components/WorkflowEditor.tsxでノードタイプを登録 (research.md section 3.1のagentSkillとaskUserQuestionを持つnodeTypesオブジェクト、コンポーネント外でメモ化)

#### Webview UI - サイドパネル

- [X] T024 [P] [US1] src/webview/src/components/NodePalette.tsxにNodePaletteコンポーネントを作成 (Sub-AgentとAskUserQuestionのドラッグ可能なノードテンプレート)
- [X] T025 [P] [US1] src/webview/src/components/PropertyPanel.tsxにPropertyPanelコンポーネントを作成 (選択されたノードのプロパティ表示、nameとprompt/questionTextの編集、変更時にストア更新)
- [X] T026 [US1] src/webview/src/App.tsxにレイアウトを実装 (3カラムレイアウト: NodePalette, WorkflowEditor, PropertyPanel)

#### Extension-Webview間通信

- [X] T027 [US1] src/extension/extension.tsにメッセージハンドラを実装 (extension-webview-api.md section 2のSAVE_WORKFLOW, STATE_UPDATE用panel.webview.onDidReceiveMessage)
- [X] T028 [P] [US1] src/webview/src/services/vscode-bridge.tsにVSCodeブリッジサービスを作成 (extension-webview-api.md section 3のpostMessageラッパー、requestIdパターンを持つsaveWorkflow関数)

#### ワークフローの永続化

- [X] T029 [US1] src/webview/src/services/workflow-service.tsにワークフローシリアライゼーションを実装 (React Flow状態をWorkflow定義に変換、data-model.md section 1に対するバリデーション)
- [X] T030 [US1] src/webview/src/services/workflow-service.tsにワークフローデシリアライゼーションを実装 (JSONからWorkflowを読み込み、React Flow状態に変換)
- [X] T031 [US1] src/extension/commands/save-workflow.tsに保存ロジックを追加 (ワークフロー名のバリデーション、ディレクトリの存在確認、data-model.md section 3.1の2スペースインデントでJSON書き込み)

#### UI洗練 & パフォーマンス

- [X] T032 [P] [US1] src/webview/src/components/WorkflowEditor.tsxにReact Flowパフォーマンス最適化を適用 (research.md section 3.1のカスタムノード用React.memo、ハンドラ用useCallback、nodeTypes/edgeTypes用useMemo)
- [X] T033 [P] [US1] src/webview/src/styles/main.cssにCSSスタイリングを追加 (plan.md Constitution Check IIIのVSCode Webview UI Toolkitスタイル、ノードビジュアルデザイン)
- [ ] T034 [US1] src/webview/src/components/WorkflowEditor.tsxにキーボードショートカットを実装 (plan.md UX一貫性のノード選択用Tab/Enter/Arrowキー) - **MVPでは不要と判断**

#### エラーハンドリング & バリデーション

- [X] T035 [US1] src/extension/services/workflow-service.tsにワークフローバリデーションを追加 (data-model.md section 5の名前フォーマット、最大50ノード、接続の妥当性) - **完了: ロジック実装済み、UIからの呼び出しも実装済み**
- [X] T036 [US1] src/webview/src/components/ErrorNotification.tsxにエラーメッセージ表示を実装 (extension-webview-api.md section 1.4のextensionからのERRORメッセージ表示、コード固有のスタイリング)

**チェックポイント**: この時点でユーザーストーリー1は完全に機能し、独立してテスト可能 - ユーザーはノードを持つワークフローを作成し、接続し、.vscode/workflows/*.jsonに保存できる

---

## Phase 4: ユーザーストーリー2 - ワークフローを.claude設定ファイルで保存 (優先度: P2)

**目標**: 作成したワークフローを、Claude Codeの設定ファイル形式（.claude/agents/*.md と .claude/commands/*.md）でエクスポートできる

**独立テスト**: シンプルなワークフロー（Sub-Agentノード1つとAskUserQuestionノード1つ）を作成し、「エクスポート」ボタンをクリック。.claude/agents/配下にSub-Agent設定ファイルが生成され、.claude/commands/配下にSlashCommand用のマークダウンファイルが生成されることを確認。生成されたファイルの内容が正しいフォーマットであることを検証すれば完了。

### ユーザーストーリー2の実装

#### エクスポートコマンド & サービス

- [X] T037 [P] [US2] src/extension/commands/export-workflow.tsにexportWorkflowコマンドを登録 (EXPORT_WORKFLOWメッセージ処理、ファイル存在チェック、エクスポートサービス呼び出し)
- [X] T038 [US2] src/extension/services/export-service.tsにエクスポートサービスを作成 (spec.md Technical SpecificationsのexportWorkflow関数、Workflowを.claude形式に変換)

#### Sub-Agent設定ファイル生成

- [X] T039 [P] [US2] src/extension/services/export-service.tsにSubAgentNodeからSub-Agent設定ファイルへのコンバーターを実装 (spec.md section Export Format DetailsのgenerateSubAgentFile関数: name, description, tools, model, promptボディ)
- [X] T040 [P] [US2] src/extension/services/export-service.tsにノード名からファイル名へのコンバーターを実装 (spec.mdのtoLowerCase、スペースをハイフンに、例: "Data Analysis" → "data-analysis.md")

#### SlashCommand生成

- [X] T041 [US2] src/extension/services/export-service.tsにSlashCommandファイルジェネレーターを実装 (spec.mdのgenerateSlashCommandFile関数: YAML frontmatter, allowed-tools: Task,AskUserQuestion)
- [X] T042 [US2] src/extension/services/export-service.tsにワークフロー実行ロジックジェネレーターを実装 (spec.md section DD-003のTaskツール呼び出しとAskUserQuestion分岐の技術的指示を生成)
- [X] T043 [US2] src/extension/services/export-service.tsにAskUserQuestion分岐ロジックを実装 (data-model.md section 1.4のオプションラベルを下流ノードにマッピング、条件付き実行指示を生成)

#### ファイル競合ハンドリング

- [X] T044 [US2] src/extension/services/export-service.tsにファイル存在チェックを実装 (vscode-extension-api.md section 2.5のvscode.workspace.fs.statを使用して.claude/agents/*.mdと.claude/commands/*.mdの存在をチェック)
- [X] T045 [US2] src/extension/commands/export-workflow.tsに上書き確認ダイアログを追加 (vscode-extension-api.md section 3.3とDD-005の「上書き」と「キャンセル」ボタンを持つvscode.window.showWarningMessage)
- [X] T046 [US2] src/extension/extension.tsでCONFIRM_OVERWRITEメッセージを処理 (extension-webview-api.md section 2.3のユーザー確認に基づいてエクスポートを継続または中止) - **MVPでは不要と判断（Extension側で直接ダイアログ表示を実装）**

#### エクスポート用Webview UI

- [X] T047 [P] [US2] src/webview/src/components/Toolbar.tsxにエクスポートボタンを追加 (extensionへのEXPORT_WORKFLOWメッセージをトリガー)
- [ ] T048 [P] [US2] src/webview/src/components/ExportProgress.tsxにエクスポート進捗インジケーターを作成 (エクスポート状態表示、EXPORT_SUCCESSペイロードからエクスポートされたファイルリストを表示) - **MVPでは不要と判断（Toolbar.tsxで簡易的な進捗表示を実装済み）**
- [X] T049 [US2] src/webview/src/services/vscode-bridge.tsにエクスポートワークフロー関数を実装 (extension-webview-api.md section 2.2のrequestIdを持つexportWorkflow、EXPORT_SUCCESSとERRORレスポンスを処理)

#### エクスポートバリデーション

- [X] T050 [US2] src/extension/services/export-service.tsに.claudeファイルフォーマットバリデーションを追加 (spec.md NFR-006のYAML frontmatterフォーマット、UTF-8エンコーディングを確保)
- [X] T051 [US2] src/extension/commands/export-workflow.tsにエクスポート後の検証を追加 (生成されたファイルを読み込み、構造を検証、ファイルリストを含むEXPORT_SUCCESSを送信)

**チェックポイント**: この時点でユーザーストーリー1と2の両方が独立して機能 - ユーザーはビジュアルエディタでワークフローを作成でき、かつClaude Code実行用の.claude形式にエクスポートできる

---

## Phase 5: 洗練 & 横断的関心事

**目的**: 複数のユーザーストーリーに影響する改善

- [ ] T052 [P] src/extension/services/logger.tsに包括的なロギングを追加 (拡張機能ログ用vscode.window.createOutputChannel)
- [ ] T053 [P] src/extension/services/telemetry.tsにテレメトリーを実装 (ワークフロー作成、保存、エクスポートイベントの追跡 - オプション、プライバシー対応)
- [ ] T054 [P] src/extension/services/config-service.tsに設定サポートを追加 (vscode-extension-api.md section 5のvscode.workspace.getConfigurationからcc-wf-studio.workflowsDirectory, cc-wf-studio.exportDirectoryを読み取り)
- [ ] T055 package.jsonにcontributes.configurationを作成 (vscode-extension-api.md section 5.2のworkflowsDirectory, exportDirectory設定を定義)
- [ ] T056 拡張機能アイコンとREADME.mdを追加 (マーケットプレイスアセット、使用方法)
- [ ] T057 [P] quickstart.mdの検証を実行 (すべてのセットアップ手順が機能することを確認、クリーン環境でテスト)
- [X] T058 [P] コードクリーンアップとリファクタリング (Biomeフォーマット適用、デッドコード削除、命名改善) - **完了: lint/formatエラー212個→0個、non-null assertion削除、型安全性向上、アクセシビリティ改善**
- [ ] T059 すべてのストーリーでパフォーマンス最適化 (plan.md NFR-001の50ノードパフォーマンス目標を検証、research.md section 3.1の残りの最適化を適用)
- [ ] T060 アクセシビリティ監査 (plan.md Constitution Check IIIのキーボードナビゲーション、ARIAラベル、スクリーンリーダーサポート)

---

## 依存関係 & 実行順序

### フェーズの依存関係

- **セットアップ (Phase 1)**: 依存関係なし - すぐに開始可能
- **基盤構築 (Phase 2)**: セットアップ完了に依存 - すべてのユーザーストーリーをブロック
- **ユーザーストーリー1 (Phase 3)**: 基盤構築フェーズ完了に依存
- **ユーザーストーリー2 (Phase 4)**: 基盤構築フェーズ完了に依存（チーム能力があればUS1と並列実行可能だが、意味のあるテストにはUS1のワークフロー作成が必要）
- **洗練 (Phase 5)**: すべての望ましいユーザーストーリーの完了に依存

### ユーザーストーリーの依存関係

- **ユーザーストーリー1 (P1)**: 基盤構築 (Phase 2) 後に開始可能 - 他のストーリーへの依存関係なし
- **ユーザーストーリー2 (P2)**: 基盤構築 (Phase 2) 後に開始可能 - 機能的には独立だが、エンドツーエンドテストにはUS1の恩恵あり（US1でワークフロー作成、US2でエクスポート）

### 各ユーザーストーリー内

#### ユーザーストーリー1:
1. コマンド & Extension Hostコア (T017-T019) を最初に
2. Webview UIコンポーネントはT016後に並列で進行可能
3. Extension-Webview間通信 (T027-T028) はコマンド後に
4. ワークフロー永続化 (T029-T031) はファイルサービス (T019) 後に
5. UI洗練 (T032-T034) はコアコンポーネント後に
6. エラーハンドリング (T035-T036) を最後に

#### ユーザーストーリー2:
1. エクスポートサービス基盤 (T037-T038) を最初に
2. Sub-Agent設定ファイル生成 (T039-T040) とSlashCommand生成 (T041-T043) を並列実行可能
3. ファイル競合ハンドリング (T044-T046) はエクスポートサービス基盤後に
4. Webview UI (T047-T049) はエクスポートサービスと並列実行可能
5. エクスポートバリデーション (T050-T051) を最後に

### 並列実行の機会

- [P]マークのすべてのセットアップタスクは並列実行可能 (T003-T006)
- 基盤構築タスクの[P]マーク (T011, T012, T013) は並列実行可能
- 基盤構築フェーズ完了後、US1とUS2は並列開始可能（US2はテストにUS1の恩恵ありという注意点あり）
- US1内: T021-T022（ノードコンポーネント）、T024-T025（サイドパネル）、T028、T032-T033は並列実行可能
- US2内: T039-T040とT041-T043は並列実行可能、T047-T048は並列実行可能

---

## 並列実行例: ユーザーストーリー1

```bash
# ノードコンポーネントを一緒に起動:
Task: "src/webview/src/components/nodes/Sub-AgentNode.tsxにSub-AgentNodeコンポーネントを作成"
Task: "src/webview/src/components/nodes/AskUserQuestionNode.tsxにAskUserQuestionNodeコンポーネントを作成"

# サイドパネルを一緒に起動:
Task: "src/webview/src/components/NodePalette.tsxにNodePaletteコンポーネントを作成"
Task: "src/webview/src/components/PropertyPanel.tsxにPropertyPanelコンポーネントを作成"

# UI洗練を一緒に起動:
Task: "src/webview/src/components/WorkflowEditor.tsxにReact Flowパフォーマンス最適化を適用"
Task: "src/webview/src/styles/main.cssにCSSスタイリングを追加"
```

---

## 並列実行例: ユーザーストーリー2

```bash
# Sub-Agent設定ファイルとSlashCommand生成を一緒に起動:
Task: "src/extension/services/export-service.tsにSubAgentNodeからSub-Agent設定ファイルへのコンバーターを実装"
Task: "src/extension/services/export-service.tsにSlashCommandファイルジェネレーターを実装"

# エクスポート用Webview UIを一緒に起動:
Task: "src/webview/src/components/Toolbar.tsxにエクスポートボタンを追加"
Task: "src/webview/src/components/ExportProgress.tsxにエクスポート進捗インジケーターを作成"
```

---

## 実装戦略

### MVP優先（ユーザーストーリー1のみ）

1. Phase 1: セットアップ完了
2. Phase 2: 基盤構築完了（重要 - すべてのストーリーをブロック）
3. Phase 3: ユーザーストーリー1完了
4. **停止して検証**: ユーザーストーリー1を独立してテスト
   - エディタを開き、2-3ノードのワークフローを作成
   - .vscode/workflows/に保存
   - リロードして永続性を検証
5. 準備ができたらデプロイ/デモ

### インクリメンタル配信

1. セットアップ + 基盤構築完了 → 基盤準備完了
2. ユーザーストーリー1追加 → 独立テスト → デプロイ/デモ（MVP!）
   - ユーザーはワークフローを視覚的に作成・保存可能
3. ユーザーストーリー2追加 → 独立テスト → デプロイ/デモ
   - ユーザーは実行用の.claude形式にワークフローをエクスポート可能
4. 各ストーリーが既存のストーリーを壊さずに価値を追加

### 並列チーム戦略

複数の開発者がいる場合:

1. チームで一緒にセットアップ + 基盤構築を完了
2. 基盤構築完了後:
   - 開発者A: ユーザーストーリー1（ビジュアルエディタ）
   - 開発者B: ユーザーストーリー2（エクスポート機能）
3. ストーリーが独立して完了し統合
4. 統合テスト: US1エディタでワークフローを作成、US2機能でエクスポート

---

## タスク数サマリー

- **Phase 1 (セットアップ)**: 9タスク (T001-T009)
- **Phase 2 (基盤構築)**: 7タスク (T010-T016)
- **Phase 3 (ユーザーストーリー1)**: 20タスク (T017-T036)
- **Phase 4 (ユーザーストーリー2)**: 15タスク (T037-T051)
- **Phase 5 (洗練)**: 9タスク (T052-T060)

**総タスク数**: 60

**MVPスコープ（ユーザーストーリー1のみ）**: 36タスク (Phase 1 + Phase 2 + Phase 3)

---

## 注意事項

- [P]タスク = 異なるファイル、依存関係なし
- [Story]ラベルはタスクを特定のユーザーストーリーにマッピングしてトレーサビリティを確保
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 各タスクまたは論理グループ後にコミット
- 任意のチェックポイントで停止してストーリーを独立して検証
- すべてのファイルパスはリポジトリルートからの絶対パス
- Extension Hostコード変更後にTypeScriptコンパイルが必要
- Webviewコード変更後にViteビルドが必要
- このタスクリストにはテストが含まれていません（spec.mdはMVP用のTDDアプローチを明示的に要求していません）
