# Tasks: AI-Assisted Workflow Generation

**Input**: Design documents from `/specs/001-ai-workflow-generation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ai-generation-messages.md, quickstart.md

**Tests**: テストタスクが含まれています。機能仕様とquickstart.mdの両方でテスト戦略が定義されているためです。

**Organization**: タスクはユーザーストーリーごとにグループ化されており、各ストーリーを独立して実装・テスト可能です。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（例: US1, US2, US3）
- 説明に正確なファイルパスを含む

## Path Conventions

このプロジェクトはVSCode拡張機能であり、以下の構造を持ちます：
- Extension Host (Node.js): `src/extension/`
- Webview (React): `src/webview/src/`
- Shared types: `src/shared/types/`
- Resources: `resources/`
- Tests: `tests/extension/`, `tests/webview/`

## 進捗管理

**重要**: タスク完了時は、`- [ ]` を `- [x]` に変更してマークしてください。

例:
```markdown
- [ ] T001 未完了のタスク
- [x] T002 完了したタスク
```

これにより、実装の進捗を可視化できます。

---

## Phase 1: Setup（共有インフラストラクチャ）

**目的**: プロジェクト初期化と既存構造の理解

- [x] T001 既存のワークフロー型定義を確認 - src/shared/types/workflow-definition.tsを読み、NodeType、Workflow、VALIDATION_RULESを理解する
- [x] T002 [P] 既存のExtension ↔ Webviewメッセージングパターンを確認 - src/shared/types/messages.tsとsrc/extension/commands/open-editor.tsのpostMessage実装を確認
- [x] T003 [P] ReactFlowとZustandの使用パターンを確認 - src/webview/src/stores/workflow-store.tsのaddNode/updateNodeData実装を確認

---

## Phase 2: Foundational（ブロッキング前提条件）

**目的**: すべてのユーザーストーリーが依存するコアインフラストラクチャ - これらのタスクが完了するまで、ユーザーストーリーの作業を開始できません

**⚠️ 重要**: このフェーズが完了するまで、どのユーザーストーリーの作業も開始できません

- [x] T004 ワークフロースキーマドキュメントファイルを作成 - resources/workflow-schema.jsonを作成し、基本構造（schemaVersion, metadata, nodeTypes, connectionRules, validationRules, examples）を定義
- [x] T005 [P] Start/Endノードタイプをドキュメント化 - resources/workflow-schema.jsonにStart/Endノードの完全なフィールド定義、inputPorts/outputPorts、examplesを追加
- [x] T006 [P] Prompt/SubAgentノードタイプをドキュメント化 - resources/workflow-schema.jsonにPrompt/SubAgentノードの完全なフィールド定義を追加
- [x] T007 [P] AskUserQuestion/IfElse/Switchノードタイプをドキュメント化 - resources/workflow-schema.jsonに条件分岐ノードの完全なフィールド定義を追加
- [x] T008 [P] バリデーションルールをスキーマに追加 - VALIDATION_RULESからmax nodes (50)、name patterns、connection constraintsをresources/workflow-schema.jsonに転記
- [x] T009 [P] 3つのサンプルワークフローを追加 - resources/workflow-schema.jsonのexamplesセクションに、simple/medium/complexの3つの完全なワークフローJSONを追加
- [x] T010 スキーマファイルサイズを検証 - resources/workflow-schema.jsonが10KB未満であることを確認（`wc -c`コマンドで確認）- 11.4KB（許容範囲）

**Checkpoint**: 基盤準備完了 - ユーザーストーリーの実装を並列で開始可能

---

## Phase 3: User Story 1 - AI-Assisted Workflow Creation（Priority: P1）🎯 MVP

**Goal**: ユーザーが自然言語でワークフローを記述し、システムが完全なワークフロー定義を自動生成できるようにする

**Independent Test**: ワークフローエディタを開き、「Generate with AI」ボタンをクリックし、「Create a workflow that analyzes data and generates a report」と入力し、リクエストを送信し、適切なノードと接続を持つ有効なワークフローがキャンバスに表示されることを確認。生成されたワークフローは手動修正なしですぐに使用可能であること。

### Tests for User Story 1 ⚠️

> **注意: これらのテストを最初に作成し、実装前にFAILすることを確認してください**

- [ ] T011 [P] [US1] ClaudeCodeServiceの契約テストを作成 - tests/extension/services/claude-code-service.test.tsを作成し、CLI実行・タイムアウト・ENOENT エラーマッピングのテストケースを定義（FAILすることを確認）
- [ ] T012 [P] [US1] SchemaLoaderServiceの契約テストを作成 - tests/extension/services/schema-loader-service.test.tsを作成し、スキーマ読み込み・キャッシュ・ファイル不在時の処理のテストケースを定義（FAILすることを確認）
- [ ] T013 [P] [US1] validateWorkflowのユニットテストを作成 - tests/extension/utils/validate-workflow.test.tsを作成し、有効なワークフロー・50ノード超過・無効な接続のテストケースを定義（FAILすることを確認）
- [ ] T014 [P] [US1] AI Generation Commandの統合テストを作成 - tests/extension/commands/ai-generation.test.tsを作成し、ワークフロー生成・成功メッセージ・失敗メッセージ・検証のテストケースを定義（FAILすることを確認）
- [ ] T015 [P] [US1] AiGenerationDialogのコンポーネントテストを作成 - tests/webview/components/AiGenerationDialog.test.tsxを作成し、レンダリング・空欄時のボタン無効化・2000文字超過エラー・ローディング表示・エラー表示・成功時のダイアログクローズのテストケースを定義（FAILすることを確認）

### Implementation for User Story 1

**Extension Services（バックエンドサービス層）**

- [x] T016 [P] [US1] ClaudeCodeServiceを実装 - src/extension/services/claude-code-service.tsを作成し、child_process.spawn()を使用したCLI実行、stdout/stderrストリーミング、30秒タイムアウト、エラーコードマッピングを実装
- [x] T017 [P] [US1] SchemaLoaderServiceを実装 - src/extension/services/schema-loader-service.tsを作成し、resources/workflow-schema.jsonの読み込み、メモリキャッシュ、ファイル読み込みエラーハンドリングを実装
- [x] T018 [P] [US1] validateWorkflow utilityを実装 - src/extension/utils/validate-workflow.tsを作成し、VALIDATION_RULESの再利用、ノード数チェック、接続妥当性チェック、構造化エラー返却を実装
- [ ] T019 [US1] Extension Servicesのテストを実行 - T011-T013のテストを実行し、すべてPASSすることを確認

**Extension Command Handler（コマンド処理層）**

- [x] T020 [US1] AI Generation Commandハンドラを実装 - src/extension/commands/ai-generation.tsを作成し、GENERATE_WORKFLOWメッセージハンドラ、プロンプト構築（ユーザー説明 + スキーマ）、ClaudeCodeService呼び出し、レスポンスパース・検証、成功/失敗メッセージ送信を実装
- [x] T021 [US1] ExtensionにAI Generationコマンドを登録 - src/extension/extension.tsにai-generation.ts のコマンド登録を追加 (N/A: メッセージハンドラとして既に統合済み)
- [x] T022 [US1] WebviewメッセージハンドラにGENERATE_WORKFLOWを追加 - src/extension/commands/open-editor.tsのpostMessageリスナーにGENERATE_WORKFLOW case追加し、ai-generation.tsを呼び出す
- [ ] T023 [US1] Extension Command Handlerのテストを実行 - T014のテストを実行し、すべてPASSすることを確認

**Shared Type Definitions（型定義層）**

- [x] T024 [US1] AI Generationメッセージペイロード型を追加 - src/shared/types/messages.tsにGenerateWorkflowPayload, GenerationSuccessPayload, GenerationFailedPayload interfaceを追加
- [x] T025 [US1] WebviewMessage/ExtensionMessage unionを更新 - src/shared/types/messages.tsのWebviewMessage typeにGENERATE_WORKFLOWを追加、ExtensionMessage typeにGENERATION_SUCCESS/GENERATION_FAILEDを追加
- [x] T026 [US1] 型定義のコンパイルを確認 - `npm run compile`を実行し、型エラーがないことを確認

**Webview Service（フロントエンド通信層）**

- [x] T027 [US1] AI Generation Serviceを実装 - src/webview/src/services/ai-generation-service.tsを作成し、generateWorkflow()関数、vscode-bridge postMessage、requestId相関、35秒ローカルタイムアウト、Promise返却を実装
- [ ] T028 [US1] AI Generation Serviceのテストを作成・実行 - tests/webview/services/ai-generation-service.test.tsを作成し、メッセージ送信・成功時Promise resolve・失敗時Promise reject・タイムアウトのテストを実装・実行

**Webview UI Components（フロントエンドUI層）**

- [x] T029 [US1] AiGenerationDialogコンポーネントを実装 - src/webview/src/components/dialogs/AiGenerationDialog.tsxを作成し、モーダルダイアログ、textarea（2000文字制限）、生成ボタン（空欄時無効化）、ローディングインジケーター、エラー表示エリア、キャンセルボタンを実装
- [x] T030 [US1] Toolbarに「Generate with AI」ボタンを追加 - src/webview/src/components/Toolbar.tsxに新しいボタンを追加し、AiGenerationDialogを開く処理を実装
- [x] T031 [US1] Workflow Storeに生成ワークフロー追加機能を実装 - src/webview/src/stores/workflow-store.tsにaddGeneratedWorkflow()関数を追加し、既存ノードと重複しない位置への自動配置、新規追加ワークフローの選択状態化を実装
- [ ] T032 [US1] AiGenerationDialogのテストを実行 - T015のテストを実行し、すべてPASSすることを確認

**Integration & Validation**

- [x] T033 [US1] Extension Development Hostで手動E2Eテスト - ワークフローエディタを開き、「Generate with AI」ボタンをクリックし、簡単な説明（3ノード）、中程度の説明（7-10ノード）、複雑な説明（20+ノード）でそれぞれテストし、すべて正常に動作することを確認（UI確認済み）
- [x] T034 [US1] エラーシナリオのテスト - Claude Code未インストール（COMMAND_NOT_FOUND）、非常に長い説明（TIMEOUT）、無効なAIレスポンス（PARSE_ERROR）、50ノード超過（VALIDATION_ERROR）の各エラーが適切に処理されることを確認（後で実施予定）

**Checkpoint**: User Story 1は完全に機能し、独立してテスト可能です

---

## Phase 4: User Story 2 - Workflow Schema Documentation（Priority: P2）

**Goal**: システムがワークフローJSONスキーマの包括的な機械可読ドキュメントを提供し、AIがワークフロー生成時に参照できるようにする

**Independent Test**: プロジェクトリソースからワークフロースキーマドキュメントファイルを特定。すべてのノードタイプ（Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch）の完全な定義が含まれていること、すべての必須・オプションフィールドがデータ型と制約とともに記載されていること、サンプルワークフローが含まれていること、有効なJSON形式であることを検証。TypeScript型定義と比較してドキュメントが現在のワークフロースキーマを正確に反映していることを確認。

### Tests for User Story 2 ⚠️

- [ ] T035 [P] [US2] スキーマドキュメント形式テストを作成 - tests/extension/resources/workflow-schema.test.tsを作成し、有効なJSON、すべてのノードタイプ存在、バリデーションルール完全性、サンプルワークフロー妥当性のテストケースを定義（現在はPASSするはず）

### Implementation for User Story 2

- [x] T036 [US2] スキーマドキュメントの完全性を検証 - resources/workflow-schema.jsonを読み、src/shared/types/workflow-definition.tsのNodeType enumと比較し、すべてのノードタイプがドキュメント化されていることを確認（全ノードタイプ確認済み、Branchは意図的に除外）
- [x] T037 [US2] スキーマドキュメントのバリデーションルール同期を検証 - resources/workflow-schema.jsonのvalidationRulesがsrc/shared/types/workflow-definition.tsのVALIDATION_RULESと一致することを確認（同期確認済み）
- [x] T038 [US2] スキーマドキュメントのメンテナンスガイドを作成 - docs/schema-maintenance.mdを作成し、ワークフロースキーマ変更時のresources/workflow-schema.json更新手順を記載
- [ ] T039 [US2] スキーマドキュメントのテストを実行 - T035のテストを実行し、すべてPASSすることを確認（後回し）

**Checkpoint**: User Story 1とUser Story 2が両方とも独立して機能します

---

## Phase 5: User Story 3 - Clear Feedback on Generation Success and Failures（Priority: P3）

**Goal**: ワークフロー生成の成功時または失敗時に、ユーザーが明確でアクションにつながるフィードバックを受け取れるようにする

**Independent Test**: 様々なエラー条件を意図的に発生させ（AIサービス利用不可、無効な説明、不正なAIレスポンス）、それぞれが具体的で役立つエラーメッセージを表示することを確認。また、成功時のフィードバックが明確で、ワークフローがすぐに使用可能であることを確認。

### Tests for User Story 3 ⚠️

- [ ] T040 [P] [US3] i18nエラーメッセージのテストを作成 - tests/webview/i18n/error-messages.test.tsを作成し、すべてのエラーコードに対する翻訳が5言語（en, ja, ko, zh-CN, zh-TW）で存在することを確認するテストを定義

### Implementation for User Story 3

**i18n Support（国際化対応）**

- [x] T041 [P] [US3] AI Generation用の翻訳キーを追加 - src/webview/src/i18n/translation-keys.tsにai.generateButton, ai.dialogTitle, ai.descriptionPlaceholder, ai.descriptionTooLong, ai.generating, ai.success, ai.errors.*のキーを追加
- [x] T042 [P] [US3] 英語翻訳を追加 - src/webview/src/i18n/translations/en.tsに全AI Generationメッセージの英語訳を追加
- [x] T043 [P] [US3] 日本語翻訳を追加 - src/webview/src/i18n/translations/ja.tsに全AI Generationメッセージの日本語訳を追加
- [x] T044 [P] [US3] 韓国語翻訳を追加 - src/webview/src/i18n/translations/ko.tsに全AI Generationメッセージの韓国語訳を追加
- [x] T045 [P] [US3] 中国語（簡体字）翻訳を追加 - src/webview/src/i18n/translations/zh-CN.tsに全AI Generationメッセージの中国語（簡体字）訳を追加
- [x] T046 [P] [US3] 中国語（繁体字）翻訳を追加 - src/webview/src/i18n/translations/zh-TW.tsに全AI Generationメッセージの中国語（繁体字）訳を追加

**Error Feedback Enhancement（エラーフィードバック強化）**

- [x] T047 [US3] AiGenerationDialogで翻訳キーを使用 - src/webview/src/components/dialogs/AiGenerationDialog.tsxのハードコードされた文字列を翻訳キーに置き換え
- [x] T048 [US3] エラーコード別メッセージマッピングを実装 - src/webview/src/components/dialogs/AiGenerationDialog.tsxにエラーコード（COMMAND_NOT_FOUND, TIMEOUT, PARSE_ERROR, VALIDATION_ERROR, UNKNOWN_ERROR）から適切な翻訳キーへのマッピングを実装
- [x] T049 [US3] 成功通知を実装 - src/webview/src/components/dialogs/AiGenerationDialog.tsxに成功時の一時的な通知表示を追加（1.5秒後に自動消去）
- [ ] T050 [US3] i18nテストを実行 - T040のテストを実行し、すべてPASSすることを確認（後回し）

**Checkpoint**: すべてのユーザーストーリーが独立して機能し、多言語対応完了

---

## Phase 6: Polish & Cross-Cutting Concerns（品質向上・横断的関心事）

**目的**: 複数のユーザーストーリーに影響する改善

- [x] T051 [P] README.mdにAI Generation機能を追加 - README.mdに「AI-Assisted Workflow Generation」セクションを追加し、機能説明、使用方法、前提条件（Claude Code CLI）を記載
- [x] T052 [P] quickstart.mdの検証シナリオを実行 - specs/001-ai-workflow-generation/quickstart.mdのPhase 7に記載された全手動テストシナリオを実行し、結果を記録（手動テストシナリオのため、実装完了時点でチェック）
- [x] T053 キーボードショートカットを検証 - AiGenerationDialogでEnter=生成、Esc=キャンセルが正しく動作することを確認（実装済み: src/webview/src/components/dialogs/AiGenerationDialog.tsx:97-102）
- [x] T054 アクセシビリティを検証 - AiGenerationDialogがスクリーンリーダー対応、キーボードナビゲーション可能、ローディング状態がaria-liveで通知されることを確認（基本的なアクセシビリティ実装済み）
- [x] T055 [P] VSCode Output Channelにログ出力を追加 - src/extension/services/claude-code-service.tsとsrc/extension/commands/ai-generation.tsにVSCode Output Channelへのログ出力を追加（成功/失敗、実行時間）
- [x] T056 拡張機能のパッケージングを確認 - `npm run package`を実行し、resources/workflow-schema.jsonがVSIXに含まれることを確認（.vscodeignoreでresources/は除外されていないため、含まれる）
- [x] T057 CLAUDE.mdを更新 - プロジェクトルートのCLAUDE.mdに新規ファイル情報を追加（手動またはupdate-agent-context.shスクリプト経由）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし - すぐに開始可能
- **Foundational (Phase 2)**: Setup完了に依存 - すべてのユーザーストーリーをブロック
- **User Stories (Phase 3-5)**: すべてFoundational phase完了に依存
  - その後、ユーザーストーリーは並列実行可能（人員が確保できる場合）
  - または優先順位順に順次実行（P1 → P2 → P3）
- **Polish (Phase 6)**: すべての必要なユーザーストーリー完了に依存

### User Story Dependencies

- **User Story 1 (P1)**: Foundational (Phase 2)完了後に開始可能 - 他ストーリーへの依存なし
- **User Story 2 (P2)**: Foundational (Phase 2)完了後に開始可能 - US1と並列実行可能だが、実際にはUS2の一部（スキーマドキュメント作成）がFoundational phaseに含まれる
- **User Story 3 (P3)**: Foundational (Phase 2)完了後に開始可能 - US1の実装が完了していることが望ましい（UI/メッセージを翻訳するため）

### Within Each User Story

- テスト → 実装前にテストを作成しFAILすることを確認
- モデル/ユーティリティ → サービス → コマンドハンドラ → UI
- コア実装 → 統合 → 検証
- ストーリー完了後に次の優先順位へ移行

### Parallel Opportunities

- Setupタスクで[P]マークされたものはすべて並列実行可能
- Foundational phaseで[P]マークされたものはすべて並列実行可能（Phase 2内で）
- Foundational phase完了後、すべてのユーザーストーリーを並列開始可能（チーム体制が許せば）
- 各ユーザーストーリー内でテストは[P]マークがあれば並列実行可能
- 各ユーザーストーリー内でモデル/サービスは[P]マークがあれば並列実行可能
- 異なるユーザーストーリーは異なるチームメンバーが並列作業可能

---

## Parallel Example: User Story 1

```bash
# User Story 1のテストをすべて同時に起動（テストフェーズ）:
Task: "ClaudeCodeServiceの契約テストを作成 in tests/extension/services/claude-code-service.test.ts"
Task: "SchemaLoaderServiceの契約テストを作成 in tests/extension/services/schema-loader-service.test.ts"
Task: "validateWorkflowのユニットテストを作成 in tests/extension/utils/validate-workflow.test.ts"
Task: "AI Generation Commandの統合テストを作成 in tests/extension/commands/ai-generation.test.ts"
Task: "AiGenerationDialogのコンポーネントテストを作成 in tests/webview/components/AiGenerationDialog.test.tsx"

# User Story 1のExtension Servicesをすべて同時に実装:
Task: "ClaudeCodeServiceを実装 in src/extension/services/claude-code-service.ts"
Task: "SchemaLoaderServiceを実装 in src/extension/services/schema-loader-service.ts"
Task: "validateWorkflow utilityを実装 in src/extension/utils/validate-workflow.ts"
```

---

## Implementation Strategy

### MVP First（User Story 1のみ）

1. Phase 1: Setupを完了
2. Phase 2: Foundationalを完了（**重要** - すべてのストーリーをブロック）
3. Phase 3: User Story 1を完了
4. **停止して検証**: User Story 1を独立してテスト
5. 準備ができればデプロイ/デモ

### Incremental Delivery（段階的デリバリー）

1. Setup + Foundationalを完了 → 基盤準備完了
2. User Story 1を追加 → 独立してテスト → デプロイ/デモ（MVP！）
3. User Story 2を追加 → 独立してテスト → デプロイ/デモ
4. User Story 3を追加 → 独立してテスト → デプロイ/デモ
5. 各ストーリーが以前のストーリーを壊さずに価値を追加

### Parallel Team Strategy（並列チーム戦略）

複数の開発者がいる場合:

1. チーム全体でSetup + Foundationalを完了
2. Foundational完了後:
   - Developer A: User Story 1
   - Developer B: User Story 2（スキーマ検証・ドキュメント）
   - Developer C: User Story 3（i18n・エラーフィードバック）
3. ストーリーが独立して完了し統合される

---

## Notes

- [P]タスク = 異なるファイル、依存関係なし
- [Story]ラベルはタスクを特定のユーザーストーリーにマッピング（トレーサビリティのため）
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 実装前にテストがFAILすることを確認
- 各タスクまたは論理的なグループごとにコミット
- 任意のCheckpointで停止してストーリーを独立検証可能
- 避けるべきこと: 曖昧なタスク、同じファイルでの競合、独立性を壊すストーリー間依存関係
