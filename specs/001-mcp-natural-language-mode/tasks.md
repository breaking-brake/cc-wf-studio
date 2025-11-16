# Tasks: MCP Node Natural Language Mode

**Input**: Design documents from `/specs/001-mcp-natural-language-mode/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: 手動E2Eテストのみ実施。各フェーズ完了時に開発者による手動E2Eテストを行う。

**Organization**: タスクはユーザーストーリーごとにグループ化され、各ストーリーを独立して実装・テスト可能にする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: タスクが属するユーザーストーリー（例: US1, US2, US3, US4）
- 説明には正確なファイルパスを含める

## 進捗管理

**重要**: タスク完了時は、`- [ ]` を `- [x]` に変更してマークしてください。

例:
```markdown
- [ ] T001 未完了のタスク
- [x] T002 完了したタスク
```

これにより、実装の進捗を可視化できます。

---

## Phase 1: セットアップ（共通インフラストラクチャ）

**目的**: プロジェクトの初期化と基本構造の確立

- [x] T001 既存のMCPノード実装を確認し、拡張ポイントを特定する
- [x] T002 [P] TypeScript型定義の計画を確認（src/shared/types/mcp-node.ts拡張）
- [x] T003 [P] 国際化リソースファイルの準備を確認（5言語対応）

---

## Phase 2: 基盤（すべてのストーリーのブロック前提条件）

**目的**: すべてのユーザーストーリーの実装開始前に完了必須のコアインフラストラクチャ

**⚠️ 重要**: このフェーズが完了するまで、ユーザーストーリーの作業を開始できません

- [x] T004 McpNodeMode型定義をsrc/shared/types/mcp-node.tsに追加
- [x] T005 [P] AiParameterConfig インターフェースをsrc/shared/types/mcp-node.tsに追加
- [x] T006 [P] AiToolSelectionConfig インターフェースをsrc/shared/types/mcp-node.tsに追加
- [x] T007 [P] PreservedManualParameterConfig インターフェースをsrc/shared/types/mcp-node.tsに追加
- [x] T008 McpNodeData インターフェースを拡張（mode, aiParameterConfig, aiToolSelectionConfig, preservedManualParameterConfigフィールド追加）
- [x] T009 [P] ModeExportMetadata型定義（discriminated union）をsrc/shared/types/mcp-node.tsに追加
- [x] T010 既存のMcpNodeData正規化関数を更新（mode未定義時に'manualParameterConfig'をデフォルト設定）
- [x] T011 [P] 国際化リソースを5言語（en, ja, ko, zh-CN, zh-TW）に追加（モード名、説明、エラーメッセージ）

**チェックポイント**: 基盤準備完了 - ユーザーストーリーの実装を並列開始可能

---

## Phase 3: User Story 1 - 段階的モード選択機能（作成フロー） (Priority: P1) 🎯 MVP

**⚠️ 設計変更（2025-11-16）**: 当初の計画（編集ダイアログでのモード選択）を破棄し、段階的な意思決定フローに変更。

**新しいゴール**: MCPノード作成時に、段階的な質問（ツール選択方法 → パラメータ設定方法）を通じて、最適なモードを自然に決定できるようにする。

**フロー設計**:
```
作成時（McpNodeDialog）:
1. サーバー選択
2. ツール選択方法を選択:
   ├─ 「ツールを自分で選ぶ」 → 3へ
   └─ 「AIにツールを選んでもらう」 → AIツール選択モード確定 → 自然言語タスク入力
3. （手動の場合）ツールを選択
4. パラメータ設定方法を選択:
   ├─ 「パラメータを自分で設定する」 → 手動パラメータ設定モード確定
   └─ 「AIにパラメータを設定してもらう」 → AIパラメータ設定モード確定 → 自然言語説明入力

編集時（McpNodeEditDialog）:
- モード表示（変更不可）
- モードに応じた編集UI:
  ├─ 手動パラメータ設定モード: パラメータフォーム
  ├─ AIパラメータ設定モード: 自然言語説明の編集
  └─ AIツール選択モード: 自然言語タスク説明の編集
```

**独立テスト**: MCPノード作成時に、段階的な選択を通じて3つのモード（手動パラメータ設定、AIパラメータ設定、AIツール選択）のいずれかに到達でき、選択したモードに応じた設定UIが表示されることを確認。

### User Story 1 の実装

**破棄したタスク（参考）**:
- ~~T012-T015: McpNodeEditDialogベースのモード選択（実装済みだが設計変更により破棄）~~

**新規タスク**:

#### 共通コンポーネント（T012-T016）
- [x] T012 [P] [US1] ToolSelectionModeStepコンポーネントを作成（src/webview/src/components/mode-selection/ToolSelectionModeStep.tsx）- ツール手動/自動の2択カード
- [x] T013 [P] [US1] ParameterConfigModeStepコンポーネントを作成（src/webview/src/components/mode-selection/ParameterConfigModeStep.tsx）- パラメータ手動/自動の2択カード
- [x] T014 [P] [US1] AiToolSelectionInputコンポーネントを作成（src/webview/src/components/mode-selection/AiToolSelectionInput.tsx）- AIツール選択モード用タスク説明入力（最小長20文字）
- [x] T015 [P] [US1] AiParameterConfigInputコンポーネントを作成（src/webview/src/components/mode-selection/AiParameterConfigInput.tsx）- AIパラメータ設定モード用パラメータ説明入力（最小長10文字）
- [x] T016 [P] [US1] ModeIndicatorBadgeコンポーネントを作成（src/webview/src/components/mode-selection/ModeIndicatorBadge.tsx）- モード表示バッジ（テキスト + 色付きボーダー）

#### 作成フロー統合（T017-T021）
- [x] T017 [US1] McpNodeDialogを拡張して段階的モード選択フローを追加（src/webview/src/components/dialogs/McpNodeDialog.tsx）
- [x] T018 [US1] McpNodeDialog用のウィザード状態管理フックを作成（src/webview/src/hooks/useMcpCreationWizard.ts）
- [x] T019 [US1] サーバー選択後のツール選択方法ステップを実装
- [x] T020 [US1] ツール選択後のパラメータ設定方法ステップを実装
- [x] T021 [US1] AIツール選択モード時のツール自動選択フロー実装（ツール選択ステップスキップ）

#### 編集フロー簡素化（T022-T024）
- [x] T022 [US1] McpNodeEditDialogを簡素化（モード選択削除、モード表示のみ）
- [x] T023 [US1] McpNodeEditDialogにモード別編集UIを実装（手動パラメータ設定: パラメータフォーム、AIパラメータ設定: 説明編集、AIツール選択: タスク編集）
- [x] T024 [US1] 既存の不要ファイルを削除（旧ModeSelectionStep.tsx, useMcpNodeWizard.ts）

#### 国際化とアクセシビリティ（T025-T026）
- [x] T025 [P] [US1] 国際化リソースを更新（ツール選択方法、パラメータ設定方法の文言）
- [x] T026 [US1] キーボードナビゲーションとARIA属性を実装（role="radiogroup", aria-describedby）

### User Story 1 の手動E2Eテスト

- [x] T027 [US1] **手動E2E**: MCPノード作成時にサーバー選択後、ツール選択方法の2択が表示されることを確認
- [x] T028 [US1] **手動E2E**: 「ツールを自分で選ぶ」選択時、ツール選択→パラメータ設定方法選択に進むことを確認
- [x] T029 [US1] **手動E2E**: 「AIにツールを選んでもらう」選択時、タスク説明入力画面に進み、AIツール選択モードで保存されることを確認
- [x] T030 [US1] **手動E2E**: パラメータ設定方法で「自分で設定」選択時、手動パラメータ設定モードでパラメータフォームが表示されることを確認
- [x] T031 [US1] **手動E2E**: パラメータ設定方法で「AIに設定してもらう」選択時、AIパラメータ設定モードで自然言語入力画面が表示されることを確認
- [x] T032 [US1] **手動E2E**: 既存ノード編集時、モードが表示され（変更不可）、モードに応じた編集UIが表示されることを確認
- [x] T033 [US1] **手動E2E**: キャンバス上のMCPノードにモードバッジ（テキスト表示）が表示されることを確認

**チェックポイント**: この時点でUser Story 1が完全に機能し、独立してテスト可能であること

---

## Phase 4: User Story 2 - AIパラメータ設定モード詳細実装 (Priority: P2)

**⚠️ 設計変更（2025-11-16）**: User Story 1にAiParameterConfigInputコンポーネントの基本実装が含まれるため、このフェーズでは検証、保存、編集の詳細実装に集中。

**ゴール**: AIパラメータ設定モードの入力検証、データ保存、編集機能を完成させる。

**前提条件**: User Story 1（Phase 3）でAiParameterConfigInputコンポーネントが作成済み。

### User Story 2 の実装

**注**: T015（AiParameterConfigInputコンポーネント）はPhase 3で実装済み。

- [x] T034 [P] [US2] 自然言語バリデーター関数を作成（src/webview/src/utils/natural-language-validator.ts、必須入力（1文字以上）、debounce 300ms）
- [x] T035 [US2] AiParameterConfigInputに検証ロジックを統合（リアルタイム検証、エラー表示）
- [x] T036 [US2] McpNodeDialogでAI Parameter Config Mode選択時の保存ロジックを実装（mode、serverId、toolName、aiParameterConfigを保存）- バリデーション追加
- [x] T037 [US2] McpNodeEditDialogでAIパラメータ設定モード編集UIを実装（説明の編集、検証、保存）- バリデーション改善
- [x] T038 [P] [US2] 自然言語説明が空の場合のエラーメッセージを国際化（MCP_NL_DESC_REQUIRED）- Phase 3で実装済み
- [x] T039 [US2] ワークフローストアを拡張してAIパラメータ設定モードデータを処理（src/webview/src/stores/workflow-store.ts）- Phase 2の型定義により自動対応

### User Story 2 の手動E2Eテスト

- [x] T040 [US2] **手動E2E**: パラメータ設定方法で「AIに設定してもらう」選択時、自然言語説明テキストエリアが表示されることを確認
- [x] T041 [US2] **手動E2E**: 自然言語説明入力時に必須入力検証（1文字以上）が機能し、空の場合にエラーメッセージが表示されることを確認
- [x] T042 [US2] **手動E2E**: 有効な自然言語説明でノード保存時にmode、serverId、toolName、aiParameterConfigが正しく保存されることを確認
- [x] T043 [US2] **手動E2E**: 保存されたAIパラメータ設定モードノードを編集時、自然言語説明が表示され編集できることを確認
- [x] T044 [US2] **手動E2E**: キャンバス上のAIパラメータ設定モードノードにモードバッジ（AIパラメータ設定モード表示）が表示されることを確認

**チェックポイント**: この時点でUser Story 1とUser Story 2の両方が独立して機能すること

---

## Phase 5: User Story 3 - AIツール選択モード詳細実装 (Priority: P3)

**⚠️ 設計変更（2025-11-16）**: User Story 1にAiToolSelectionInputコンポーネントの基本実装が含まれるため、このフェーズでは利用可能ツール取得、検証、保存、編集の詳細実装に集中。

**ゴール**: AIツール選択モードの利用可能ツール取得、入力検証、データ保存、編集機能を完成させる。

**前提条件**: User Story 1（Phase 3）でAiToolSelectionInputコンポーネントとツール自動選択フローが作成済み。

### User Story 3 の実装

**注**: T014（AiToolSelectionInputコンポーネント）とT021（ツール自動選択フロー）はPhase 3で実装済み。

- [x] T045 [P] [US3] MCP cache serviceを拡張して選択されたサーバーから利用可能ツールを取得・キャッシュ（src/extension/services/mcp-cache-service.ts） - getTools()関数を追加（src/extension/services/mcp-cli-service.ts）、キャッシュロジックを統合
- [x] T046 [P] [US3] MCPサーバーから利用可能ツールリストを取得するメッセージハンドラを追加（Extension Host） - handleGetMcpTools()をgetTools()使用に更新、キャッシュロジックを一元化
- [x] T047 [US3] AiToolSelectionInputに検証ロジックを統合（必須入力（1文字以上）、リアルタイム検証、エラー表示）
- [x] T048 [US3] McpNodeDialogでAI Tool Selection Mode選択時の保存ロジックを実装（mode、serverId、aiToolSelectionConfig保存、ツールリスト取得） - バリデーション追加、型修正、T045-T046未実装のため availableTools は空配列
- [x] T049 [US3] McpNodeEditDialogでAIツール選択モード編集UIを実装（タスク説明の編集、検証、保存） - バリデーション改善
- [x] T050 [P] [US3] タスク説明が空の場合のエラーメッセージを国際化（MCP_TASK_DESC_REQUIRED） - Phase 3で実装済み
- [x] T051 [US3] ワークフローストアを拡張してAIツール選択モードデータを処理（src/webview/src/stores/workflow-store.ts） - Phase 2の型定義により自動対応
- [x] T052 [US3] 既存のMcpNodeComponentを拡張してモードバッジを表示（src/webview/src/components/nodes/McpNode/McpNode.tsx） - Phase 3で実装済み

### User Story 3 の手動E2Eテスト

- [x] T053 [US3] **手動E2E**: ツール選択方法で「AIに選んでもらう」選択時、ツール選択がスキップされ、タスク説明フィールドが表示されることを確認
- [x] T054 [US3] **手動E2E**: タスク説明入力時に必須入力検証（1文字以上）が機能し、空の場合にエラーメッセージが表示されることを確認
- [x] T055 [US3] **手動E2E**: 有効なタスク説明でノード保存時にmode、serverId、aiToolSelectionConfig（taskDescription、availableTools、timestamp）が正しく保存されることを確認
- [x] T056 [US3] **手動E2E**: 保存されたAIツール選択モードノードを編集時、タスク説明が表示され編集できることを確認
- [x] T057 [US3] **手動E2E**: キャンバス上のAIツール選択モードノードにモードバッジ（AIツール選択モード表示）が表示されることを確認
- [x] T058 [US3] **手動E2E**: バッジにホバーしたときにモード説明とタスク説明プレビューが表示されることを確認

**チェックポイント**: すべてのユーザーストーリー（US1、US2、US3）が独立して機能すること

---

## Phase 6: User Story 4 - 自然言語設定を実行可能なスラッシュコマンドにエクスポート (Priority: P2)

**ゴール**: 自然言語MCPノードを含むワークフローがClaude Codeが実行可能なスラッシュコマンドとしてエクスポートされるようにする

**独立テスト**: 3つのモードすべてでMCPノードを含むワークフローを作成し、各ワークフローをスラッシュコマンドにエクスポートし、エクスポートされたコマンドファイルを確認して、各ワークフローにClaude Codeがユーザーの意図を解釈するための適切なメタデータと指示が含まれることを確認。

### User Story 4 の実装

- [x] T052 [P] [US4] 手動パラメータ設定モード用のエクスポートフォーマッター関数を作成（既存フォーマットを使用、src/extension/services/export-service.ts） - formatManualParameterConfigMode()関数を実装
- [x] T053 [P] [US4] AIパラメータ設定モード用のエクスポートフォーマッター関数を作成（ツール名、パラメータスキーマ、自然言語説明、Claude Code指示を含む） - formatAiParameterConfigMode()関数を実装、パラメータ制約も表示
- [x] T054 [P] [US4] AIツール選択モード用のエクスポートフォーマッター関数を作成（サーバーID、利用可能ツールリスト、タスク説明、Claude Code指示を含む） - formatAiToolSelectionMode()関数を実装
- [x] T055 [US4] 既存のgenerateSlashCommandFile関数を拡張してMCPノードのモードを検出しモード別フォーマッターを呼び出す - generateWorkflowExecutionLogic()にswitch文追加、モード検出ロジック実装
- [x] T056 [US4] AIパラメータ設定モード用のエクスポートメタデータHTMLコメント形式を実装 - JSON形式のHTMLコメントとして埋め込み
- [x] T057 [US4] AIツール選択モード用のエクスポートメタデータHTMLコメント形式を実装 - JSON形式のHTMLコメントとして埋め込み
- [x] T058 [US4] ワークフロー検証を拡張してモード別設定の整合性を確認（src/extension/utils/validate-workflow.ts） - モード別の必須フィールド検証を追加（共通必須フィールドをserverId/validationStatus/outputPortsに制限、各モード固有の必須フィールドをモード別に検証。aiToolSelectionモードではtoolName/toolDescription/parameters/parameterValuesは全てオプショナル）
- [x] T059 [P] [US4] エクスポートエラーメッセージを国際化（モード設定不一致、サーバー利用不可など） - ユーザー向けコンテンツは既にtranslate()使用、検証エラーは開発者向けのため英語維持

### User Story 4 の手動E2Eテスト

- [x] T060 [US4] **手動E2E**: 手動パラメータ設定モードMCPノードを含むワークフローのエクスポート時に、スラッシュコマンドに明示的なツール名とパラメータキー・バリューペアが含まれることを確認 - 正常動作確認
- [x] T061 [US4] **手動E2E**: AIパラメータ設定モードMCPノードを含むワークフローのエクスポート時に、ツール名、パラメータスキーマ、自然言語説明、Claude Code指示が含まれることを確認 - 正常動作確認
- [x] T062 [US4] **手動E2E**: AIツール選択モードMCPノードを含むワークフローのエクスポート時に、サーバーID、利用可能ツールリスト、タスク説明、Claude Code指示が含まれることを確認 - 正常動作確認（availableTools空でもClaude Codeが実行時にツール自動選択）
- [x] T063 [US4] **手動E2E**: 異なるモードの複数MCPノードを含むワークフローのエクスポート時に、各ノードのエクスポートフォーマットがそのモードを正しく反映することを確認 - 正常動作確認
- [x] T064 [US4] **手動E2E**: エクスポートされたスラッシュコマンドファイルをテキストエディタで開き、メタデータとフォーマットが正しいことを確認 - 正常動作確認

**チェックポイント**: すべてのユーザーストーリー（US1、US2、US3、US4）が完全に機能し、相互運用可能であること

---

## Phase 7: 統合とポリッシュ

**目的**: 複数のユーザーストーリーに影響する改善

- [x] T067 後方互換性の検証（v1.2.0ワークフローがmode='manualParameterConfig'としてロードされることを確認）- normalizeMcpNodeData()の実装とworkflow-store.tsでの使用を検証、正しく実装済み
- [x] T070 [P] すべてのUIコンポーネントの国際化を確認（5言語）- 23個の翻訳キーがすべて5言語（en, ja, ko, zh-CN, zh-TW）に存在することを確認
- [x] T071 [P] エラーハンドリングとエラーメッセージの一貫性を確認（3要素形式: 何が・なぜ・どうする）- ユーザー向け/開発者向けエラーメッセージが一貫したパターンで記述されていることを確認
- [x] T074 [P] JSDocコメントをすべての新規パブリックインターフェースに追加 - 型定義、ユーティリティ、サービス関数、UIコンポーネント全てにJSDocコメント追加完了

### 統合の手動E2Eテスト

- [x] T078 **手動E2E**: v1.2.0形式のワークフローをロードして、すべてのMCPノードがmode='manualParameterConfig'でロードされることを確認 - 実際のv1.2.0ワークフロー（xxx_v120.json）で検証完了、modeフィールドが欠落したMCPノードが正しくmanualParameterConfigモードでロードされることを確認
- [x] T081 **手動E2E**: すべての5言語（en, ja, ko, zh-CN, zh-TW）でUIを表示し、翻訳が適切であることを確認 - 5言語すべてでMCPノード作成/編集ダイアログの翻訳が適切に表示されることを確認

---

## 依存関係と実行順序

### フェーズ依存関係

- **セットアップ（Phase 1）**: 依存関係なし - すぐに開始可能
- **基盤（Phase 2）**: セットアップ完了に依存 - すべてのユーザーストーリーをブロック
- **ユーザーストーリー（Phase 3-6）**: すべて基盤フェーズ完了に依存
  - ユーザーストーリーはその後並列に進行可能（人員が確保されている場合）
  - または優先順序で順次進行（P1 → P2/P4 → P3）
- **統合とポリッシュ（Phase 7）**: すべての希望するユーザーストーリーが完了に依存

### ユーザーストーリー依存関係

- **User Story 1 (P1)**: 基盤（Phase 2）後に開始可能 - 他ストーリーへの依存なし
- **User Story 2 (P2)**: 基盤（Phase 2）後に開始可能 - US1と統合可能だが独立してテスト可能
- **User Story 3 (P3)**: 基盤（Phase 2）後に開始可能 - US1/US2と統合可能だが独立してテスト可能
- **User Story 4 (P2)**: US1, US2, US3の実装完了後に開始（エクスポート機能はすべてのモードに依存）

### 各ユーザーストーリー内

- 型定義とインターフェースが最初
- UIコンポーネント実装
- 統合とデータフロー
- ストーリー完了後に手動E2Eテスト実施
- 次の優先順位に移る前にストーリー完了

### 並列実行の機会

- すべてのセットアップタスク（[P]マーク付き）は並列実行可能
- すべての基盤タスク（[P]マーク付き）はPhase 2内で並列実行可能
- 基盤フェーズ完了後、US1とUS2は並列開始可能（チーム容量による）
- ストーリー内のモデル（[P]マーク付き）は並列実行可能
- 異なるユーザーストーリーは異なるチームメンバーが並列作業可能

---

## 並列実行例: User Story 1

```bash
# User Story 1のUIコンポーネントをまとめて起動:
Task: "ModeSelectionStepコンポーネントを作成（src/webview/src/components/mode-selection/ModeSelectionStep.tsx）"
Task: "モード選択カード用のスタイルを追加（Material Design風レイアウト）"
```

---

## 並列実行例: User Story 4

```bash
# User Story 4のエクスポートフォーマッター関数をまとめて起動:
Task: "手動パラメータ設定モード用のエクスポートフォーマッター関数を作成（src/extension/services/export-service.ts）"
Task: "AIパラメータ設定モード用のエクスポートフォーマッター関数を作成"
Task: "AIツール選択モード用のエクスポートフォーマッター関数を作成"
```

---

## 実装戦略

### MVPファースト（User Story 1のみ）

1. Phase 1: セットアップを完了
2. Phase 2: 基盤を完了（重要 - すべてのストーリーをブロック）
3. Phase 3: User Story 1を完了
4. **停止して検証**: User Story 1を独立してテスト
5. 準備ができたらデプロイ/デモ

### 段階的デリバリー

1. セットアップ + 基盤を完了 → 基盤準備完了
2. User Story 1を追加 → 独立してテスト → デプロイ/デモ（MVP!）
3. User Story 2を追加 → 独立してテスト → デプロイ/デモ
4. User Story 4を追加（エクスポート機能） → 独立してテスト → デプロイ/デモ
5. User Story 3を追加 → 独立してテスト → デプロイ/デモ
6. 各ストーリーが前のストーリーを壊さずに価値を追加

### 並列チーム戦略

複数の開発者がいる場合:

1. チーム全体でセットアップ + 基盤を完了
2. 基盤完了後:
   - 開発者A: User Story 1
   - 開発者B: User Story 2
   - 基礎完了後、開発者C: User Story 4（US1, US2完了を待つ）
3. US1, US2, US4完了後、開発者D: User Story 3
4. ストーリーを独立して完了・統合

---

## 注意事項

- [P]タスク = 異なるファイル、依存関係なし
- [Story]ラベルはタスクを特定のユーザーストーリーにマップし、トレーサビリティを確保
- 各ユーザーストーリーは独立して完了・テスト可能であること
- 各タスクまたは論理グループ後にコミット
- 各チェックポイントで停止してストーリーを独立検証
- 避けるべきこと: 曖昧なタスク、同じファイルの競合、ストーリーの独立性を壊す相互依存

---

## タスクサマリー（2025-11-16更新）

**⚠️ 設計変更による再計画**: 編集ダイアログから作成ダイアログへのモード選択移動に伴い、タスク構成を変更。

**総タスク数**: 約85タスク（Phase 6以降は未集計）

**ユーザーストーリー別タスク数**:
- **User Story 1 (P1)**: 22タスク（実装15 + 手動E2E 7）- 作成フローの段階的モード選択
- **User Story 2 (P2)**: 11タスク（実装6 + 手動E2E 5）- AIパラメータ設定モード詳細実装
- **User Story 3 (P3)**: 14タスク（実装8 + 手動E2E 6）- AIツール選択モード詳細実装
- **User Story 4 (P2)**: 13タスク（実装8 + 手動E2E 5）- エクスポート機能（変更なし）
- **セットアップ**: 3タスク
- **基盤**: 8タスク
- **統合とポリッシュ**: 17タスク（実装10 + 手動E2E 7）

**主な変更点**:
- User Story 1のタスク数増加（15→22）: 作成フローの複雑化により
- User Story 2のタスク数減少（11→11）: コンポーネント作成がUS1に移動
- User Story 3のタスク数維持（14→14）: 構成変更だが総数は同じ

**並列実行機会**:
- Phase 3: T012-T016（コンポーネント作成）が並列実行可能
- Phase 4-5: バリデーター、国際化タスクが並列実行可能

**独立テスト基準**: 各ユーザーストーリー（US1-US4）に独立テスト基準が定義され、手動E2Eテストタスクが含まれる

**推奨MVPスコープ**: User Story 1（段階的モード選択機能）のみ
