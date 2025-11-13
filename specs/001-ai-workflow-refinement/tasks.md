# Tasks: AI-Assisted Workflow Refinement

**Input**: Design documents from `/specs/001-ai-workflow-refinement/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/refinement-messages.json

**Tests**: ユーザー指示により、開発者による手動E2Eテストのみを実施します。自動テストは含まれません。

**Organization**: タスクはユーザーストーリーごとにグループ化されており、各ストーリーを独立して実装・テストできます。

## 進捗管理

**重要**: タスク完了時は、`- [ ]` を `- [x]` に変更してマークしてください。

例:
```markdown
- [ ] T001 未完了のタスク
- [x] T002 完了したタスク
```

これにより、実装の進捗を可視化できます。

---

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可能（異なるファイル、依存関係なし）
- **[Story]**: どのユーザーストーリーに属するか（例: US1, US2, US3, US4）
- 説明には正確なファイルパスを含めます

## Path Conventions

このプロジェクトはVSCode Extension + Webviewアーキテクチャを使用します:
- Extension Host (TypeScript): `src/extension/`
- Webview UI (React + TypeScript): `src/webview/src/`
- Shared types: `src/shared/types/`

---

## Phase 1: セットアップ（共通インフラ）

**目的**: プロジェクト初期化と基本構造の準備

- [x] T001 [P] 型定義の追加: ConversationHistory, ConversationMessage を src/shared/types/workflow-definition.ts に追加
- [x] T002 [P] メッセージ型の追加: RefineWorkflowMessage, RefinementSuccessMessage, RefinementFailedMessage, ClearConversationMessage, ConversationClearedMessage を src/shared/types/messages.ts に追加
- [x] T003 [P] i18n翻訳キーの追加: refinement 関連の翻訳キーを src/webview/src/i18n/translations/ の5言語ファイル（en.ts, ja.ts, ko.ts, zh-CN.ts, zh-TW.ts）に追加

---

## Phase 2: 基盤（ブロッキング前提条件）

**目的**: すべてのユーザーストーリーの実装前に完了する必要があるコアインフラ

**⚠️ 重要**: このフェーズが完了するまで、ユーザーストーリーの作業は開始できません

- [x] T004 Refinement Service の作成: src/extension/services/refinement-service.ts を作成し、constructRefinementPrompt(), refineWorkflow() 関数を実装
- [x] T005 [P] File Service の拡張: src/extension/services/file-service.ts に会話履歴の保存・読み込み機能を追加 (既存のFileServiceで対応可能なためスキップ)
- [x] T006 [P] Workflow Refinement コマンドハンドラの作成: src/extension/commands/workflow-refinement.ts を作成し、handleRefineWorkflow(), handleClearConversation() を実装
- [x] T007 Extension メッセージハンドラの登録: src/extension/extension.ts にREFINE_WORKFLOW, CLEAR_CONVERSATIONメッセージハンドラを追加
- [x] T008 Zustand ストアの作成: src/webview/src/stores/refinement-store.ts を作成し、チャット状態管理を実装
- [x] T009 [P] Refinement Service (Webview) の作成: src/webview/src/services/refinement-service.ts を作成し、sendRefinementRequest(), clearConversation() を実装

**Checkpoint**: 基盤準備完了 - ユーザーストーリーの実装を並列で開始可能

---

## Phase 3: User Story 1 - 初回ワークフロー改善リクエスト (Priority: P1) 🎯 MVP

**Goal**: ユーザーが「AIで修正」ボタンをクリックしてチャットパネルを開き、改善要求を送信してワークフローを更新できるようにする

**Independent Test**: サンプルワークフローを生成 → 「AIで修正」ボタンをクリック → 改善要求を入力（例: "エラーハンドリングを追加"） → ワークフローがキャンバス上で自動更新されることを確認

### 手動E2Eテスト for User Story 1 ⚠️

**テストシナリオ** (開発者が実施):

1. **チャットパネルの表示**
   - Given: ワークフローがキャンバスに存在する
   - When: ツールバーの「AIで修正」ボタンをクリック
   - Then: チャットパネルがモーダルダイアログとして表示され、空の会話履歴が表示される

2. **改善要求の送信**
   - Given: チャットパネルが開いている
   - When: テキストエリアに「エラーハンドリングを追加して」と入力し、送信ボタンをクリック（またはCtrl/Cmd+Enter）
   - Then: メッセージが「ユーザー」として会話履歴に表示され、プログレスインジケーターが表示される

3. **AI応答とワークフロー更新**
   - Given: 改善要求が処理中
   - When: AIが改善を完了
   - Then: AI応答が「AI」として会話履歴に表示され、キャンバス上のワークフローが自動更新される

4. **変更内容の確認**
   - Given: 改善が適用された
   - When: ユーザーがキャンバス上の更新されたワークフローを確認
   - Then: 要求された改善内容と一致する変更が反映されている

### Implementation for User Story 1

- [x] T010 [P] [US1] MessageBubble コンポーネントの作成: src/webview/src/components/chat/MessageBubble.tsx を作成し、ユーザー/AIメッセージの表示を実装
- [x] T011 [P] [US1] MessageList コンポーネントの作成: src/webview/src/components/chat/MessageList.tsx を作成し、会話履歴の表示と自動スクロールを実装
- [x] T012 [P] [US1] MessageInput コンポーネントの作成: src/webview/src/components/chat/MessageInput.tsx を作成し、テキスト入力・送信ボタン・文字数カウンターを実装
- [x] T013 [P] [US1] IterationCounter コンポーネントの作成: src/webview/src/components/chat/IterationCounter.tsx を作成し、反復回数表示を実装
- [x] T013-1 [P] [US1] WarningBanner コンポーネントの作成: src/webview/src/components/chat/WarningBanner.tsx を作成し、20回以降の警告バナー表示を実装
- [x] T014 [US1] RefinementChatPanel コンポーネントの作成: src/webview/src/components/dialogs/RefinementChatPanel.tsx を作成し、チャットパネルのレイアウトと子コンポーネントの統合を実装（T010-T013に依存）
- [x] T015 [US1] Toolbar の拡張: src/webview/src/components/Toolbar.tsx に「AIで修正」ボタンを追加し、クリック時にチャットパネルを開く機能を実装
- [x] T016 [US1] App コンポーネントの統合: src/webview/src/App.tsx に RefinementChatPanel を追加し、表示制御を実装
- [x] T017 [US1] メッセージフロー統合: Webview → Extension Host → AI → Webview の双方向メッセージング実装と、ワークフロー自動更新の統合
- [x] T018 [US1] エラーハンドリングの追加: タイムアウト、ネットワークエラー、バリデーションエラーのエラーメッセージ表示を実装

**Checkpoint**: この時点で、User Story 1 は完全に機能し、独立してテスト可能

---

## Phase 4: User Story 2 - 反復的改善会話 (Priority: P2)

**Goal**: ユーザーが複数回の改善要求を続けて行い、会話履歴とコンテキストを維持しながらワークフローを段階的に改善できるようにする

**Independent Test**: 初回の改善を実施 → 同じチャットセッションで2-3回の追加要求を実施 → 各改善が前の状態を基に適用され、コンテキストが維持されることを確認

### 手動E2Eテスト for User Story 2 ⚠️

**テストシナリオ** (開発者が実施):

1. **会話コンテキストの維持**
   - Given: チャットパネルに過去の改善会話が存在する
   - When: 新しい改善要求を入力
   - Then: AIが過去の会話コンテキストを考慮し、既存の変更の上に新しい変更を適用する

2. **会話履歴の表示**
   - Given: 複数回の改善が実施された
   - When: ユーザーがチャット履歴を確認
   - Then: すべてのユーザー要求とAI応答が時系列順に表示される

3. **反復回数カウンターの表示**
   - Given: ユーザーが複数回の改善を実施した
   - When: チャットパネルを表示
   - Then: カウンターが「15 iterations」のように表示される

4. **警告バナーの表示**
   - Given: 反復回数が20回以上に達した
   - When: チャットパネルを表示
   - Then: 警告バナーが表示され、会話履歴クリアを推奨するが、送信は可能

### Implementation for User Story 2

- [x] T019 [US2] 会話コンテキスト管理: constructRefinementPrompt() を拡張し、直近3-5往復の会話履歴をプロンプトに含めるロジックを実装（src/extension/services/refinement-service.ts）
- [x] T020 [US2] 反復回数の追跡: conversationHistory.currentIteration のインクリメント処理を実装し、メッセージ送信時に更新（src/extension/commands/workflow-refinement.ts, src/webview/src/stores/refinement-store.ts）
- [x] T021 [US2] 警告バナー表示ロジック: shouldShowWarning() メソッドで currentIteration >= 20 を検証し、警告バナーを表示（src/webview/src/stores/refinement-store.ts）
- [x] T022 [US2] WarningBanner コンポーネント統合: RefinementChatPanel に WarningBanner を追加し、shouldShowWarning() の結果に基づいて表示制御（src/webview/src/components/dialogs/RefinementChatPanel.tsx, src/webview/src/components/chat/WarningBanner.tsx）
- [x] T023 [US2] 国際化テキスト追加: 警告バナーメッセージを5言語で追加（src/webview/src/i18n/translations/*.ts）

**Checkpoint**: この時点で、User Story 1 と User Story 2 の両方が独立して機能する

---

## Phase 5: User Story 3 - 会話の永続化 (Priority: P2)

**Goal**: ユーザーがチャットパネルや拡張機能を閉じた後、同じワークフローを再度開いたときに過去の会話履歴を復元して続きから改善できるようにする

**Independent Test**: 複数回の改善要求を実施 → チャットパネルを閉じる（または拡張機能をリロード） → ワークフローを再度開き「AIで修正」をクリック → 過去の会話履歴が復元されることを確認

### 手動E2Eテスト for User Story 3 ⚠️

**テストシナリオ** (開発者が実施):

1. **チャットパネル再開時の履歴表示**
   - Given: ワークフローに既存の改善会話履歴が存在する
   - When: ユーザーがチャットパネルを閉じて再度開く
   - Then: 過去の会話履歴が表示される

2. **拡張機能再起動後の履歴復元**
   - Given: ワークフローに改善履歴が保存されている
   - When: ユーザーがワークフローを保存し、新しいセッションで再度開き「AIで修正」をクリック
   - Then: 会話履歴がロードされ表示される

3. **初回使用時の空履歴**
   - Given: ワークフローが一度も改善されていない
   - When: ユーザーが初めて「AIで修正」をクリック
   - Then: チャットパネルが空の会話履歴で表示される

### Implementation for User Story 3

- [x] T024 [US3] 会話履歴のシリアライズ: ワークフローJSONに conversationHistory フィールドを保存する機能を実装（src/webview/src/services/workflow-service.ts, src/webview/src/components/Toolbar.tsx）
- [x] T025 [US3] 会話履歴のデシリアライズ: ワークフロー読み込み時に conversationHistory を復元する機能を実装（src/extension/commands/load-workflow.ts, src/webview/src/components/Toolbar.tsx）
- [x] T026 [US3] チャットパネル開閉時の履歴復元: openChat() 時に既存の conversationHistory をストアに読み込む処理を実装（src/webview/src/stores/refinement-store.ts）
- [x] T027 [US3] 初回使用時の履歴初期化: conversationHistory が null の場合、initConversation() で空の履歴を初期化（src/webview/src/stores/refinement-store.ts）
- [x] T028 [US3] 拡張機能リロード対応: ワークフローストアとの統合により、リロード後も conversationHistory が復元されることを確認（src/webview/src/stores/workflow-store.ts, refinement-store.ts）

**Checkpoint**: この時点で、User Story 1, 2, 3 がすべて独立して機能する

---

## Phase 6: User Story 4 - 会話管理 (Priority: P3)

**Goal**: ユーザーが既存の会話履歴をクリアして、新しい改善アプローチで最初からやり直せるようにする

**Independent Test**: 複数回の改善を含む会話履歴を作成 → 「会話履歴クリア」ボタンをクリック → 履歴がクリアされ、ワークフロー状態は保持されることを確認

### 手動E2Eテスト for User Story 4 ⚠️

**テストシナリオ** (開発者が実施):

1. **クリア確認ダイアログの表示**
   - Given: 会話履歴が存在する
   - When: ユーザーが「会話履歴クリア」ボタンをクリック
   - Then: 確認ダイアログが表示される

2. **確認時の履歴クリア**
   - Given: クリア確認ダイアログが表示されている
   - When: ユーザーが確認ボタンをクリック
   - Then: 会話履歴がクリアされ、反復カウンターが0にリセットされ、チャットパネルが空状態で表示される

3. **クリア後の新規会話**
   - Given: 会話履歴がクリアされた
   - When: ユーザーが新しい改善要求を送信
   - Then: AIが過去のコンテキストを考慮せず、新しい会話として処理する

4. **キャンセル時の履歴保持**
   - Given: クリア確認ダイアログが表示されている
   - When: ユーザーがキャンセルボタンをクリック
   - Then: 会話履歴が変更されずに保持される

### Implementation for User Story 4

- [x] T029 [P] [US4] 会話履歴クリアボタンの追加: RefinementChatPanel ヘッダーに「会話履歴クリア」ボタンを追加（src/webview/src/components/dialogs/RefinementChatPanel.tsx）
- [x] T030 [P] [US4] 確認ダイアログコンポーネントの作成（または既存のConfirmDialogを使用）: クリア確認用のダイアログを実装（src/webview/src/components/dialogs/ConfirmDialog.tsx）
- [x] T031 [US4] clearHistory() アクションの実装: Zustand ストアに会話履歴クリア機能を実装（messages: [], currentIteration: 0, updatedAt更新）（src/webview/src/stores/refinement-store.ts）
- [x] T032 [US4] Extension Host でのクリア処理: handleClearConversation() で conversationHistory を null に設定し、ワークフローJSONを保存（src/extension/commands/workflow-refinement.ts）
- [x] T033 [US4] クリア後のメッセージフロー: CLEAR_CONVERSATION → Extension Host → CONVERSATION_CLEARED → Webview のメッセージングを統合（src/webview/src/services/refinement-service.ts, src/extension/commands/workflow-refinement.ts）

**Checkpoint**: すべてのユーザーストーリーが独立して機能し、完全な機能セットが実現

---

## Phase 7: ポリッシュ＆横断的関心事

**目的**: 複数のユーザーストーリーに影響する改善

- [x] T034 [P] アクセシビリティ対応: ARIA labels（role="log", aria-live="polite"）、キーボードナビゲーション（Esc で閉じる、Ctrl/Cmd+Enter で送信）を実装
- [ ] T035 [P] パフォーマンス最適化: メッセージリストの仮想化（react-window または単純なスクロール最適化）、不要な再レンダリングの削減
- [ ] T036 [P] エラーメッセージの国際化検証: 全5言語（en, ja, ko, zh-CN, zh-TW）でエラーメッセージが正しく表示されることを確認
- [ ] T037 [P] VSCode テーマ統合の検証: Light/Dark/High Contrast テーマでUIが適切に表示されることを確認
- [ ] T038 JSDoc コメントの追加: すべての公開API（services, message handlers）に適切なJSDocコメントを追加
- [ ] T039 コードクリーンアップとリファクタリング: 重複コードの削減、命名の一貫性確認
- [ ] T040 quickstart.md の検証: quickstart.md の実装ガイドに従って、すべてのコンポーネントが正しく実装されていることを確認
- [ ] T041 手動E2Eテスト（全シナリオ）: Phase 3-6 のすべてのテストシナリオを通して実行し、エンドツーエンドの動作を検証

---

## 依存関係と実行順序

### フェーズ依存関係

- **セットアップ (Phase 1)**: 依存関係なし - 即座に開始可能
- **基盤 (Phase 2)**: セットアップ完了に依存 - すべてのユーザーストーリーをブロック
- **ユーザーストーリー (Phase 3-6)**: すべて基盤フェーズ完了に依存
  - ユーザーストーリーは並列で進行可能（スタッフィングされている場合）
  - または優先度順に順次進行（P1 → P2 → P2 → P3）
- **ポリッシュ (Phase 7)**: 希望するすべてのユーザーストーリーが完了していることに依存

### ユーザーストーリー依存関係

- **User Story 1 (P1)**: 基盤 (Phase 2) 後に開始可能 - 他ストーリーへの依存なし
- **User Story 2 (P2)**: 基盤 (Phase 2) 後に開始可能 - US1と統合する可能性があるが、独立してテスト可能
- **User Story 3 (P2)**: 基盤 (Phase 2) 後に開始可能 - US1/US2と統合する可能性があるが、独立してテスト可能
- **User Story 4 (P3)**: 基盤 (Phase 2) 後に開始可能 - US1/US2/US3と統合する可能性があるが、独立してテスト可能

### 各ユーザーストーリー内の依存関係

- モデル → サービス
- サービス → エンドポイント/UI
- コア実装 → 統合
- ストーリー完了 → 次の優先度に移行

### 並列実行の機会

- セットアップタスクで [P] マークされたものはすべて並列実行可能
- 基盤タスクで [P] マークされたものはすべて並列実行可能（Phase 2内）
- 基盤フェーズ完了後、すべてのユーザーストーリーを並列で開始可能（チーム能力が許す場合）
- ユーザーストーリー内で [P] マークされたタスクは並列実行可能
- 異なるユーザーストーリーは異なるチームメンバーが並列で作業可能

---

## 並列実行例: User Story 1

```bash
# User Story 1 のすべてのコンポーネントを並列で起動:
Task: "MessageBubble コンポーネントの作成 in src/webview/src/components/chat/MessageBubble.tsx"
Task: "MessageList コンポーネントの作成 in src/webview/src/components/chat/MessageList.tsx"
Task: "MessageInput コンポーネントの作成 in src/webview/src/components/chat/MessageInput.tsx"
Task: "IterationCounter コンポーネントの作成 in src/webview/src/components/chat/IterationCounter.tsx"
```

---

## 実装戦略

### MVP First (User Story 1 のみ)

1. Phase 1: セットアップを完了
2. Phase 2: 基盤を完了（重要 - すべてのストーリーをブロック）
3. Phase 3: User Story 1 を完了
4. **停止して検証**: User Story 1 を独立してテスト
5. 準備ができていればデプロイ/デモ

### 段階的デリバリー

1. セットアップ + 基盤を完了 → 基盤準備完了
2. User Story 1 を追加 → 独立してテスト → デプロイ/デモ (MVP!)
3. User Story 2 を追加 → 独立してテスト → デプロイ/デモ
4. User Story 3 を追加 → 独立してテスト → デプロイ/デモ
5. User Story 4 を追加 → 独立してテスト → デプロイ/デモ
6. 各ストーリーが前のストーリーを壊すことなく価値を追加

### 並列チーム戦略

複数の開発者がいる場合:

1. チームが一緒にセットアップ + 基盤を完了
2. 基盤が完了したら:
   - 開発者A: User Story 1
   - 開発者B: User Story 2
   - 開発者C: User Story 3 & 4
3. ストーリーが独立して完了し統合

---

## Notes

- [P] タスク = 異なるファイル、依存関係なし
- [Story] ラベルはトレーサビリティのためタスクを特定のユーザーストーリーにマッピング
- 各ユーザーストーリーは独立して完了・テスト可能であるべき
- 実装前にテストが失敗することを確認（自動テストを含める場合）
- 各タスクまたは論理的グループ後にコミット
- 任意のチェックポイントで停止し、ストーリーを独立して検証
- 避けるべき: 曖昧なタスク、同じファイルの競合、独立性を壊すストーリー間の依存関係

---

## Phase 3.1: AIで修正UIのサイドバー化 (UI/UX改善)

**目的**: RefinementChatPanelをモーダルダイアログからサイドバー形式に変更し、PropertyPanelと同じ位置に表示させることで、より自然なワークフロー編集体験を提供する

**背景**: 現在の実装ではチャットパネルがモーダルダイアログとして画面中央に表示されるため、キャンバスが隠れてワークフローの確認が困難。サイドバー形式にすることで、ワークフローを見ながらAIとの会話が可能になる。

**設計方針**:
- PropertyPanelと同じ幅(300px)、背景色、ボーダースタイルを使用
- `useRefinementStore.isOpen` 状態に基づいて表示切り替え
- `isOpen === true`: RefinementChatPanel を表示
- `isOpen === false`: PropertyPanel を表示
- 同じ位置に表示されるため、レイアウトシフトなし

### Implementation for Phase 3.1

- [x] T042 [P3.1] RefinementChatPanel のサイドバー化: src/webview/src/components/dialogs/RefinementChatPanel.tsx のモーダルスタイルを削除し、PropertyPanelと同じサイドバースタイル(width: 300px, borderLeft, overflowY: auto)を適用。オーバーレイ、中央配置、ボックスシャドウを削除
- [x] T043 [P3.1] App.tsx のレイアウト更新: src/webview/src/App.tsx の右パネルエリアで条件分岐を実装し、`useRefinementStore().isOpen` に基づいて `<RefinementChatPanel />` または `<PropertyPanel />` を表示。現在のモーダル形式の呼び出しを削除
- [x] T044 [P3.1] UI動作確認: 「AIで修正」ボタンクリック時の切り替え動作、閉じるボタンでPropertyPanelへの復帰、スタイル整合性(幅、背景色、ボーダー)、スクロール動作を確認

**Checkpoint**: この時点で、AIで修正機能がサイドバーとして自然に統合され、ワークフローを見ながらAI会話が可能になる

---

## Phase 3.2: AIで修正の送信フィードバック改善 (UI/UX改善)

**目的**: ユーザーがチャットで指示を送信した後、指示が処理中であることを明確にフィードバックすることで、操作感を向上させる

**課題**:
- 現在の実装では、ユーザーがメッセージを送信してもUIに即座に反映されないため、「送信されたのか?」「処理中なのか?」が分かりづらい
- AIで生成機能には進捗バーがあるが、AIで修正にはない
- ユーザーは自分の発言が送信されたことを確認できない

**解決策**:
1. **即座のメッセージ表示**: ユーザーがメッセージを送信したら、チャット履歴に即座に自分の発言を表示
2. **プログレスバーの追加**: AIで生成と同様に、処理中を示すプログレスバーをチャット入力エリアまたはチャットパネル内に表示
3. **送信ボタンの無効化**: 処理中は送信ボタンを無効化し、重複送信を防止

**設計方針**:
- `MessageInput` コンポーネントにプログレスバー表示機能を追加
- `refinement-store` の `isProcessing` 状態を活用
- ユーザーメッセージは送信直後に `conversationHistory` に追加し、UIに即座に反映
- AI応答は従来通りバックエンドからの成功レスポンス後に追加

### Implementation for Phase 3.2

- [x] T045 [P3.2] MessageInput のプログレスバー実装: src/webview/src/components/chat/MessageInput.tsx にプログレスバー表示機能を追加。`useRefinementStore().isProcessing` に基づいてプログレスバーを表示・非表示。送信ボタンを処理中は無効化
- [x] T046 [P3.2] refinement-store のメッセージ送信フロー改善: src/webview/src/stores/refinement-store.ts にユーザーメッセージの即座追加機能を実装。`startProcessing()` 前にユーザーメッセージを `conversationHistory.messages` に追加する処理を追加
- [x] T047 [P3.2] RefinementChatPanel のメッセージ送信ロジック更新: src/webview/src/components/dialogs/RefinementChatPanel.tsx の `handleSend()` を修正し、メッセージ送信直後にユーザーメッセージをストアに追加。AI応答受信後は従来通り `handleRefinementSuccess()` で追加
- [x] T048 [P3.2] UI動作確認: メッセージ送信時の即座表示、プログレスバーの表示・非表示、送信ボタンの無効化・有効化、エラー時の挙動を確認

**Checkpoint**: この時点で、ユーザーはメッセージ送信が成功したことを即座に確認でき、処理中であることも明確に分かるようになる

---

## Phase 3.3: サイドバー横幅のリサイズ機能 (UI/UX改善)

**目的**: PropertyPanelとRefinementChatPanelの横幅をユーザーがドラッグ操作で調整できるようにし、各ユーザーの見やすい幅で作業できるようにする

**背景**:
- 現在、PropertyPanelとRefinementChatPanelは固定幅300pxで実装されている
- ユーザーによって最適な幅が異なる（画面サイズ、表示内容の長さ、個人の好みなど）
- 特にRefinementChatPanelでは長いメッセージを表示する場合、より広い幅が望ましい場合がある

**解決策**:
1. **リサイズハンドルの追加**: 左端にドラッグ可能なリサイズハンドル（縦線）を表示
2. **ドラッグ操作によるリサイズ**: マウスドラッグで横幅を200px〜600pxの範囲で調整可能
3. **幅の永続化**: 調整した幅をlocalStorageに保存し、次回起動時に復元
4. **視覚的フィードバック**: ドラッグ中はカーソルを変更し、リサイズ中であることを明示

**設計方針**:
- リサイズロジックを共通化するカスタムフック `useResizablePanel` を作成
- 最小幅: 200px（コンテンツが見切れない最小限の幅）
- 最大幅: 600px（キャンバスエリアを圧迫しない最大幅）
- デフォルト幅: 300px（現在の固定幅を維持）
- localStorage キー: `cc-wf-studio.sidebarWidth`

**技術的考慮事項**:
- マウスイベント（mousedown, mousemove, mouseup）を使用したドラッグ実装
- `document.addEventListener` を使用してグローバルなマウスイベントをキャプチャ
- クリーンアップ関数でイベントリスナーを適切に削除
- PropertyPanelとRefinementChatPanelの両方で同じ幅を共有

### Implementation for Phase 3.3

- [x] T049 [P3.3] useResizablePanel カスタムフックの作成: src/webview/src/hooks/useResizablePanel.ts を作成。ドラッグ操作による横幅調整ロジック、最小/最大幅の制限、localStorageへの永続化機能を実装
- [x] T050 [P3.3] ResizeHandle コンポーネントの作成: src/webview/src/components/common/ResizeHandle.tsx を作成。ドラッグ可能な縦線UI、ホバー時の視覚的フィードバック、カーソル変更を実装
- [x] T051 [P3.3] PropertyPanel へのリサイズ機能統合: src/webview/src/components/PropertyPanel.tsx に useResizablePanel と ResizeHandle を統合。固定幅300pxを動的な幅に変更
- [x] T052 [P3.3] RefinementChatPanel へのリサイズ機能統合: src/webview/src/components/dialogs/RefinementChatPanel.tsx に useResizablePanel と ResizeHandle を統合。固定幅300pxを動的な幅に変更
- [x] T053 [P3.3] UI動作確認: ドラッグ操作による幅調整、最小/最大幅の制限、幅の永続化と復元、PropertyPanelとRefinementChatPanelの両方での動作を確認

**Checkpoint**: この時点で、ユーザーは自分の見やすい横幅にサイドバーを調整でき、その設定が次回起動時にも保持されるようになる

---

## Phase 3.4: AIで修正のキャンセル機能とタイムスタンプ改善 (UI/UX改善)

**目的**: AI処理のキャンセル機能を追加し、チャットメッセージのタイムスタンプに日付を含めることで、操作性とユーザビリティを向上させる

**背景**:
- 現在、AIで修正の処理中にキャンセルする機能がない。処理が長引いた場合やユーザーが考え直した場合に、ユーザーは完了を待つしかない
- AIで生成機能には既にキャンセル機能が実装されており、同様のUXをAIで修正にも提供すべき
- チャットメッセージのタイムスタンプは時刻のみ表示され、日付が含まれていないため、古い会話の時期が分かりづらい

**解決策**:
1. **キャンセル機能の追加**:
   - AIで生成機能の実装パターンを参考に、CANCEL_REFINEMENT / REFINEMENT_CANCELLED メッセージ型を追加
   - 処理中の「送信」ボタンを「キャンセル」ボタンに変更
   - キャンセル時はExtension Hostに通知し、進行中のAI処理を中止
   - キャンセル後もチャットパネルは開いたままで、ユーザーは再試行可能

2. **タイムスタンプに日付を追加**:
   - MessageBubble コンポーネントのタイムスタンプ表示を `toLocaleTimeString()` から `toLocaleString()` に変更
   - または、日付と時刻を別々にフォーマットして「YYYY/MM/DD HH:MM:SS」形式で表示
   - 同日のメッセージは時刻のみ、異なる日のメッセージは日付を含める最適化も検討

**設計方針**:
- AIで生成機能のキャンセル実装を参考にする:
  - `cancelWorkflowGeneration()` → `cancelWorkflowRefinement()`
  - `CANCEL_GENERATION` → `CANCEL_REFINEMENT`
  - `GENERATION_CANCELLED` → `REFINEMENT_CANCELLED`
  - AIGenerationError の CANCELLED コード処理パターンを踏襲
- Extension Host側でキャンセルリクエストを受信し、進行中のClaude Code CLI プロセスを終了
- タイムスタンプは `toLocaleString()` を使用してブラウザのロケールに合わせた日付時刻表示

**技術的考慮事項**:
- Extension Host側: `handleRefineWorkflow()` でキャンセルリクエストを処理し、child processをkill
- Webview側: `refineWorkflow()` Promiseで REFINEMENT_CANCELLED メッセージを受信してreject
- RefinementChatPanel: キャンセル時はエラー表示せず、loading状態のみリセット
- MessageInput: 処理中は送信ボタンを「キャンセル」に変更し、クリック時に `cancelWorkflowRefinement()` を呼び出す

### Implementation for Phase 3.4

- [x] T054 [P3.4] メッセージ型の追加: src/shared/types/messages.ts に CancelRefinementPayload, RefinementCancelledMessage 型を追加。WebviewMessage と ExtensionMessage のユニオン型に CANCEL_REFINEMENT と REFINEMENT_CANCELLED を追加
- [x] T055 [P3.4] refinement-service へのキャンセル関数追加: src/webview/src/services/refinement-service.ts に `cancelWorkflowRefinement(requestId: string)` 関数を追加。ai-generation-service.ts の `cancelWorkflowGeneration()` パターンを参考
- [x] T056 [P3.4] refineWorkflow() のキャンセル処理: src/webview/src/services/refinement-service.ts の `refineWorkflow()` Promise内で REFINEMENT_CANCELLED メッセージを受信時に WorkflowRefinementError (code: 'CANCELLED') をreject
- [x] T057 [P3.4] Extension Host のキャンセルハンドラ実装: src/extension/commands/workflow-refinement.ts に `handleCancelRefinement()` 関数を追加し、進行中のrequestIdに紐づくClaude Code CLI プロセスをkillし、REFINEMENT_CANCELLED メッセージを送信
- [x] T058 [P3.4] Extension メッセージハンドラの登録: src/extension/extension.ts に CANCEL_REFINEMENT メッセージハンドラを追加し、`handleCancelRefinement()` を呼び出す
- [x] T059 [P3.4] RefinementChatPanel のキャンセル処理: src/webview/src/components/dialogs/RefinementChatPanel.tsx の `handleSend()` でキャンセルエラー (code: 'CANCELLED') を受信時はエラー表示せず、loading状態のみリセット。AiGenerationDialog.tsx:116-119 のパターンを参考
- [x] T060 [P3.4] MessageInput のキャンセルボタン実装: src/webview/src/components/chat/MessageInput.tsx に `handleCancel()` 関数を追加。処理中は送信ボタンを「キャンセル」に変更し、クリック時に `cancelWorkflowRefinement(currentRequestId)` を呼び出す
- [x] T061 [P3.4] refinement-store への requestId 管理: src/webview/src/stores/refinement-store.ts に `currentRequestId` 状態を追加し、`startProcessing(requestId)` で保存、処理完了/エラー時にクリア
- [x] T062 [P3.4] MessageBubble のタイムスタンプ改善: src/webview/src/components/chat/MessageBubble.tsx のタイムスタンプ表示を `toLocaleTimeString()` から `toLocaleString()` に変更し、日付と時刻を両方表示
- [x] T063 [P3.4] i18n翻訳キーの追加: src/webview/src/i18n/translations/ の5言語ファイルに `refinement.cancelButton` キーを追加
- [x] T064 [P3.4] UI動作確認: キャンセルボタンの表示切り替え、キャンセル実行時のプロセス終了、キャンセル後の再試行、タイムスタンプの日付表示を確認

**Checkpoint**: この時点で、ユーザーはAI処理をキャンセルでき、チャットメッセージの日時を正確に把握できるようになる

---

## Phase 3.5: Skillノードの分岐制約に関するAIガイダンス改善

**目的**: Skillノードが常に1出力ポートである制約をAIに明確に伝え、分岐が必要な場合は Skill + ifElse/switch の組み合わせを提案させる

**背景**:
- Skillノードは仕様上、常に `outputPorts: 1` (固定) である
- ユーザーが「Skillノードで分岐を表現する」ようAI修正を指示すると、AIが Skillノードに複数の出力ポートを設定してしまう
- バリデーションエラー `SKILL_INVALID_PORTS: "Skill outputPorts must equal 1"` が発生し、修正が失敗する
- エラーログ例:
  ```
  [ERROR] Refined workflow failed validation
  validationErrors: [
    {
      "code": "SKILL_INVALID_PORTS",
      "message": "Skill outputPorts must equal 1",
      "field": "nodes[check-time-1].data.outputPorts"
    }
  ]
  ```

**問題の本質**:
- Skillの責務は「再利用可能な専門エージェント」であり、分岐ロジックとは異なる
- 分岐が必要な場合は、Skillノードの後に ifElse または switch ノードを配置するのが正しい設計パターン
- しかし、workflow-schema.json にこの制約が明記されておらず、AIが誤った構造を生成してしまう

**解決策**:
1. **workflow-schema.json のドキュメント改善**: Skillノードの description に「分岐が必要な場合は ifElse/switch ノードを使用」と明記
2. **バリデーションエラーメッセージの改善**: エラー時に解決策（ifElse/switchノードの追加）をヒントとして提示
3. **AIプロンプトへの指示追加**: refinement-service.ts のプロンプト構築時に Skill ノードの制約を明示

**設計方針**:
- 既存の仕様を維持（破壊的変更なし）
- Skillノード自体は変更せず、ドキュメントとガイダンスのみ改善
- AI生成/修正時に正しいパターン（Skill → ifElse/switch）を自動的に提案させる

**技術的考慮事項**:
- workflow-schema.json のサイズ制約（推奨 <10KB, 最大 15KB）に注意
- エラーメッセージは簡潔かつ具体的な解決策を含める
- AIプロンプトへの追加情報は最小限に抑える（トークン効率）

### Implementation for Phase 3.5

- [x] T065 [P3.5] workflow-schema.json のドキュメント改善: resources/workflow-schema.json の `skill.description` フィールドに「Skills always have exactly 1 output port. For conditional branching based on Skill results, add an ifElse or switch node after the Skill node.」を追記。既存のdescriptionを上書きせず、**Important** セクションとして追加
- [x] T066 [P3.5] バリデーションエラーメッセージの改善: src/extension/utils/validate-workflow.ts の `validateSkillNode()` 関数内、SKILL_INVALID_PORTS エラーのメッセージを「Skill outputPorts must equal 1. For branching, use ifElse or switch nodes after the Skill node.」に変更
- [x] T067 [P3.5] refinement-service プロンプトへの制約追加: src/extension/services/refinement-service.ts の `constructRefinementPrompt()` 関数内、プロンプト構築部分に以下を追加: 「**Skill Node Constraints**: Skill nodes MUST have exactly 1 output port (outputPorts: 1). If branching is needed after Skill execution, add an ifElse or switch node after the Skill node.」schema 情報の直後に挿入
- [x] T068 [P3.5] 動作確認とテスト: npm run build 成功を確認 ✓。AI修正でSkillノード + ifElse/switch の組み合わせが正しく生成されることをユーザーが確認

**Checkpoint**: この時点で、AIがSkillノードの制約を理解し、分岐が必要な場合は自動的に正しいパターン（Skill → ifElse/switch）を提案するようになる

---

## Phase 3.6: 分岐ノード選択の改善（3分岐以上でswitchノード選択）

**目的**: AI修正時に3分岐以上が必要な場合、ifElseノードではなくswitchノードを正しく選択させ、接続の論理エラーを防止する

**背景**:
Phase 3.5でSkillノードの出力ポート制約をAIに伝えたが、新たな問題が発覚:
- ユーザーが「時間帯別で返信」(朝・昼・夜の3分岐)を要求
- AIがifElseノード(2分岐専用)を選択してしまう
- 3つ目の分岐を表現できず、接続が論理的に破綻(skill-afternoon → skill-evening の直列接続)

**問題の詳細**:
```json
// ユーザー期待: switchノード → 朝・昼・夜の3並列分岐
// AI生成結果: ifElseノード → true(朝), false(昼 → 夜)という誤った構造
{
  "connections": [
    {"from": "ifelse-1", "to": "skill-morning", "fromPort": "true"},
    {"from": "ifelse-1", "to": "skill-afternoon", "fromPort": "false"},
    {"from": "skill-afternoon", "to": "skill-evening"} // ← 誤った直列接続
  ]
}
```

**根本原因**:
1. AIプロンプトに「分岐数に応じたノード選択ガイダンス」が不足
2. workflow-schema.json の ifElse/switch 説明が不十分
3. 分岐ノードからの直列接続を検出するバリデーションが存在しない

**解決アプローチ (Option 3: 多層的改善)**:
1. **AIプロンプト改善**: 分岐数に応じたノード選択ルールを明記
2. **スキーマ改善**: ifElse(2分岐専用), switch(3+分岐)の使い分けを明記
3. **バリデーション追加**: 分岐ノードからの論理エラー接続を検出(オプション)

**設計原則**:
- Phase 3.5と同様、ドキュメント・プロンプトレベルの改善のみ（破壊的変更なし）
- AI生成とAI修正の両方で効果を発揮
- トークン効率を考慮したコンパクトな記述

**技術的考慮事項**:
- 日本語キーワード("時間帯別"等)のハードコードは避け、汎用的な表現を使用
- バリデーション追加(T071)はオプション（実装コスト vs 効果を検証）
- workflow-schema.json サイズ制約（推奨 <10KB, 最大 15KB）に注意

### Implementation for Phase 3.6

- [x] T069 [P3.6] refinement-service.ts に分岐ノード選択ガイダンスを追加: src/extension/services/refinement-service.ts の `constructRefinementPrompt()` 関数内、「Skill Node Constraints」セクションの直後に以下を追加: 「**Branching Node Selection**: Use ifElse node for 2-way conditional branching (true/false). Use switch node for 3+ way branching or multiple conditions. Each branch output should connect to exactly one downstream node - never create serial connections from different branch outputs.」
- [x] T070 [P3.6] workflow-schema.json の ifElse/switch ノード説明を改善: resources/workflow-schema.json の `ifElse.description` に「Use for 2-way branching only (true/false)」を追記、`switch.description` に「Use for 3+ way branching - ideal for time-based, case-based, or multi-condition routing」を追記
- [ ] T071 [P3.6] (Optional) 分岐ノードからの直列接続バリデーション追加: src/extension/utils/validate-workflow.ts に新規検証ルール追加。ifElse/switchノードの出力ポートから接続された複数ノード間に直列接続が存在する場合、警告エラーを出力（エラーコード: BRANCH_SERIAL_CONNECTION）。T072の動作確認後、必要に応じて実装
- [x] T072 [P3.6] 動作確認とテスト: npm run build の成功を確認 ✓。実際のAI修正動作確認(「時間帯別で返信」等の3分岐シナリオ)はユーザーによる手動テストが必要

**Checkpoint**: この時点で、AIが分岐数に応じて適切なノードタイプ(ifElse vs switch)を選択し、接続の論理エラーが発生しなくなる

---

## Phase 3.7: AI修正プログレスバーの吹き出し内表示 (UI/UX改善)

**目的**: ユーザーがAI修正指示を送信した直後に、ローディング状態のAI吹き出しを表示し、その中でプログレスバーを表現することで、より自然なチャット体験を提供する

**背景**:
- 現在の実装（Phase 3.2）では、プログレスバーがMessageInput（入力エリア）に表示される
- ユーザーからの要望: AI吹き出しの中でプログレスバーを表示したい
- チャットアプリとして自然な体験: AIが「考えている」様子を視覚的に表現

**問題点**:
- MessageInputのプログレスバーは入力エリアと視覚的に分離されており、「AIが動作中」という感覚が薄い
- AI応答が完了するまで、チャット履歴に何も表示されないため、処理が進んでいるか不安になる
- 長時間処理の場合、ユーザーが待機状態を把握しづらい

**解決策（Option 1）**:
1. **即座のフィードバック**: ユーザーメッセージ送信直後に、ローディング状態のAI吹き出しを表示
2. **吹き出し内プログレス表示**: AI吹き出し内にスピナー、プログレスバー、経過時間を表示
3. **完了時の置き換え**: AI応答完了時、ローディングメッセージを実際の応答内容で置き換え

**表示イメージ**:
```
[ユーザー] 時間帯別で返信して

[AI] 🔄 ワークフローを修正しています...
     ▓▓▓▓▓▓▓░░░░░░░░ 45%
     (15秒経過)
```

完了後:
```
[AI] ワークフローを修正しました。
```

**設計原則**:
- `ConversationMessage` に `isLoading` フラグを追加（破壊的変更なし）
- MessageBubble コンポーネントにローディング状態表示を追加
- MessageInput のプログレスバーは削除（Phase 3.2の実装を置き換え）
- チャット履歴にローディング状態は残さない（完了時に置き換え）

**技術的考慮事項**:
- ローディングメッセージのIDは一時的（`loading-${requestId}` 形式）
- 完了時は `removeMessage()` → `addMessage()` で置き換え
- キャンセル時もローディングメッセージを削除
- エラー時はローディングメッセージをエラー内容で置き換え

### Implementation for Phase 3.7

- [x] T073 [P3.7] ConversationMessage 型に isLoading フラグ追加: src/shared/types/workflow-definition.ts の `ConversationMessage` インターフェースに `isLoading?: boolean` フィールドを追加
- [x] T074 [P3.7] ProgressBar コンポーネント作成: src/webview/src/components/chat/ProgressBar.tsx を新規作成。プログレスバー、パーセンテージ、経過時間表示を実装。タイムアウト時間（90秒）を基準に進捗率を計算（最大95%）
- [x] T075 [P3.7] MessageBubble のローディング状態表示: src/webview/src/components/chat/MessageBubble.tsx に `isLoading` 状態の表示ロジックを追加。ProgressBar コンポーネントと翻訳テキストを表示
- [x] T076 [P3.7] refinement-store にメッセージ操作メソッド追加: src/webview/src/stores/refinement-store.ts に `addLoadingAiMessage()`, `updateMessageLoadingState()`, `updateMessageContent()` メソッドを追加
- [x] T077 [P3.7] RefinementChatPanel のローディングメッセージ追加: src/webview/src/components/dialogs/RefinementChatPanel.tsx の `handleSend()` を修正。送信直後にローディング状態のAIメッセージを追加し、完了時に内容更新とローディング解除
- [x] T078 [P3.7] MessageInput のプログレスバー削除: src/webview/src/components/chat/MessageInput.tsx からプログレスバー表示ロジックとタイマーを削除（Phase 3.2 の T045 実装を削除）
- [x] T079 [P3.7] i18n 翻訳キーの追加: src/webview/src/i18n/translations/ の5言語ファイルとtranslation-keys.tsに `refinement.aiProcessing` キーを追加
- [x] T080 [P3.7] ビルド検証: `npm run build` でTypeScriptコンパイルエラーがないことを確認（UI動作確認はユーザー実施）

**Checkpoint**: この時点で、ユーザーはAI修正指示後、即座にAIが動作中であることを視覚的に確認でき、より自然なチャット体験が提供される

---

## Phase 3.8: エラー表示とリトライ機能 (UI/UX改善)

**目的**: AI修正処理が失敗した場合に、エラー内容をAI吹き出し内に表示し、ユーザーがワンクリックでリトライできる機能を提供する

**背景**:
- Phase 3.7実装後の発見事項:
  1. タイムアウト時間がAI生成(90秒)よりも短い(60秒)
  2. エラー発生時、ローディングメッセージが空のまま残り、何が起きたか分からない
- ユーザー体験の問題:
  - エラーが発生してもフィードバックがない
  - 再試行するには同じメッセージを再入力する必要がある

**問題点**:
- **タイムアウト不一致**: refinement-service.tsのデフォルトタイムアウトが60秒、AI生成は90秒
- **エラーフィードバック不足**: エラー時にローディングが解除されるだけで、原因が表示されない
- **再試行の手間**: 失敗後、ユーザーが手動でメッセージを再入力する必要がある

**解決策（Option 1 + リトライボタン）**:
1. **タイムアウト統一**: refinement-service.tsのデフォルトタイムアウトを90秒に変更
2. **エラー状態の型追加**: ConversationMessageに`isError`と`errorCode`フィールドを追加
3. **エラーメッセージ表示**: AI吹き出し内にエラー内容を表示（赤背景、⚠️アイコン）
4. **リトライボタン**: エラー吹き出しに「もう一度試す」ボタンを表示
5. **リトライ時の動作**: 元のユーザーメッセージを再送信（エラーメッセージは削除）

**表示イメージ**:

エラー発生時:
```
[ユーザー] 時間帯別で返信して

[AI] ⚠️ AIの処理がタイムアウトしました。
     もう一度お試しいただくか、より簡潔な指示に変更してください。

     [🔄 もう一度試す]
```

リトライクリック後:
```
[ユーザー] 時間帯別で返信して

[AI] 🔄 ワークフローを修正しています...
     ▓▓▓▓░░░░░░░░░░ 30%
     (10秒経過)
```

**設計原則**:
- エラーメッセージはAI吹き出し内に表示（チャット履歴として残る）
- エラー吹き出しは通常のAI吹き出しと視覚的に区別（赤背景）
- リトライボタンは元のユーザーメッセージを保持して再送信
- リトライ時はエラーメッセージを削除し、新しいローディングメッセージで置き換え

**技術的考慮事項**:
- `ConversationMessage`に破壊的変更なし（オプショナルフィールドのみ追加）
- エラーコードに応じた適切なエラーメッセージを多言語で提供
- リトライ時は新しいrequestIdとmessageIdを生成
- 元のユーザーメッセージはRefinementChatPanelのローカルステートに保持

**エラーコード別メッセージ**:
- `TIMEOUT`: 「AIの処理がタイムアウトしました。もう一度お試しいただくか、より簡潔な指示に変更してください。」
- `PARSE_ERROR`: 「AI応答の解析に失敗しました。もう一度お試しください。」
- `VALIDATION_ERROR`: 「生成されたワークフローが検証に失敗しました。別の指示をお試しください。」
- `COMMAND_NOT_FOUND`: 「Claude Code CLIが見つかりません。Claude Codeをインストールしてください。」（リトライ不可）
- `CANCELLED`: リトライボタン不要（ユーザーが明示的にキャンセル）
- `UNKNOWN_ERROR`: 「予期しないエラーが発生しました。もう一度お試しください。」

**リトライ可否の判定**:
- リトライ可能: `TIMEOUT`, `PARSE_ERROR`, `VALIDATION_ERROR`, `UNKNOWN_ERROR`
- リトライ不可: `COMMAND_NOT_FOUND`, `CANCELLED`

### Implementation for Phase 3.8

- [x] T081 [P3.8] タイムアウト時間の統一: src/extension/services/refinement-service.ts (line 103) のデフォルトタイムアウトを `60000` → `90000` に変更。定数 `MAX_REFINEMENT_TIMEOUT_MS` を定義して統一。また src/webview/src/services/refinement-service.ts (line 90) と src/extension/services/claude-code-service.ts (line 86) のタイムアウト関連メッセージも修正
- [x] T082 [P3.8] ConversationMessage 型にエラーフィールド追加: src/shared/types/workflow-definition.ts の `ConversationMessage` インターフェースに `isError?: boolean` と `errorCode?: 'COMMAND_NOT_FOUND' | 'TIMEOUT' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'UNKNOWN_ERROR'` フィールドを追加
- [x] T083 [P3.8] refinement-store にエラー操作メソッド追加: src/webview/src/stores/refinement-store.ts に `updateMessageErrorState(messageId, isError, errorCode)` メソッドを追加。エラー状態とコードを更新
- [x] T084 [P3.8] エラーコード別メッセージマッピング: src/webview/src/utils/error-messages.ts (新規ファイル) にエラーコードから翻訳キーへのマッピング関数 `getErrorMessageInfo()` と `isRetryableError()` を実装
- [x] T085 [P3.8] MessageBubble のエラー表示スタイル: MessageBubble.tsx にエラー状態の表示ロジックを追加。赤背景 (`var(--vscode-inputValidation-errorBackground)`)、⚠️アイコン、エラーメッセージ表示
- [x] T086 [P3.8] リトライボタンコンポーネント: MessageBubble.tsx にリトライボタンを追加。リトライ可能なエラーコードの場合のみ表示。`onRetry` コールバックを親から受け取る
- [x] T087 [P3.8] RefinementChatPanel のエラーハンドリング修正: RefinementChatPanel.tsx の `handleSend()` の catch ブロックを修正。エラー発生時に `updateMessageErrorState()` を呼び出してエラー状態を設定
- [x] T088 [P3.8] RefinementChatPanel のリトライロジック: RefinementChatPanel.tsx に `handleRetry(messageId)` メソッドを実装。MessageList コンポーネント経由で MessageBubble にリトライハンドラーを渡す
- [x] T089 [P3.8] i18n エラーメッセージキーの追加: src/webview/src/i18n/translations/ の5言語ファイル(en, ja, ko, zh-CN, zh-TW)とtranslation-keys.tsに `refinement.error.retryButton` を追加（既存のエラーメッセージキーを活用）
- [x] T090 [P3.8] ビルド検証と動作確認: `npm run build` でTypeScriptコンパイル成功を確認。型エラーを修正して正常にビルド完了

**Checkpoint**: ✅ Phase 3.8 完了。この時点で、ユーザーはエラー発生時に何が起きたかを理解でき、ワンクリックでリトライできるようになる。タイムアウト時間も統一され（90秒）、AI修正の成功率が向上する

---

## Phase 3.9: エラー時のローディング表示残存問題の修正

**問題**: タイムアウトやエラー発生時、ローディング中のAI吹き出しがそのまま残り、新しいエラー吹き出しとは別に表示されてしまう

**現在の挙動**:
```
[ユーザー] ワークフローを改善して
[AI] AIがリクエストを処理中です... 95% 90s/90s  ← これが残る
[AI] ⚠️ AI修正がタイムアウトしました... [リトライ]
```

**期待される挙動**:
```
[ユーザー] ワークフローを改善して
[AI] ⚠️ AI修正がタイムアウトしました... [リトライ]
```

**根本原因**:
- RefinementChatPanel.tsx で `updateMessageLoadingState(aiMessageId, false)` を呼んだ後、`updateMessageErrorState()` を呼んでいる
- 2つの状態更新の間でメッセージが空の状態になる

**解決方針**:
- `updateMessageErrorState()` 内で `isLoading: false` も同時に設定
- RefinementChatPanel.tsx から `updateMessageLoadingState()` の呼び出しを削除
- MessageBubble.tsx で `isError` が true の場合は `isLoading` を無視

### Implementation for Phase 3.9

- [x] T091 [P3.9] refinement-store のエラー設定時にローディングもクリア: src/webview/src/stores/refinement-store.ts の `updateMessageErrorState()` メソッドで `isLoading: false` も同時に設定 (line 244)
- [x] T092 [P3.9] RefinementChatPanel のローディング解除処理を削除: src/webview/src/components/dialogs/RefinementChatPanel.tsx の catch ブロックから `updateMessageLoadingState(aiMessageId, false)` を削除 (line 85-93)
- [x] T093 [P3.9] MessageBubble のローディング表示条件を修正: src/webview/src/components/chat/MessageBubble.tsx で `const isLoading = (message.isLoading ?? false) && !isError;` として、エラー時はローディングを表示しない (line 27)
- [x] T094 [P3.9] ビルド検証と動作確認: `npm run build` でコンパイル成功を確認。タイムアウト時にローディング表示が残らないことを確認

**Issue Found**: リトライボタン押下時に既存エラーメッセージ+新規ローディングメッセージの2つが同時表示される問題を発見

### Additional Implementation for Phase 3.9 (Retry Fix)

- [x] T095 [P3.9] handleRetry のリトライロジック修正: src/webview/src/components/dialogs/RefinementChatPanel.tsx の `handleRetry()` を async 関数に変更し、`handleSend()` を呼ばずにリトライ専用処理フローを実装。既存のエラーメッセージIDを再利用してローディング状態に変換し、refinement 処理結果を同じメッセージに反映 (lines 119-195)
- [x] T096 [P3.9] ビルド検証と動作確認: `npm run build` でコンパイル成功を確認。リトライ時に新しいメッセージが作成されず、既存メッセージが再利用されることを確認

**Checkpoint**: ✅ Phase 3.9 完了。この修正により、エラー発生時にローディング中のメッセージが残らず、エラーメッセージのみが表示されるようになる。また、リトライ時は既存のエラーメッセージがローディング状態に変換され、新しいメッセージが作成されなくなる

---

### Phase 3.10: AI処理中のUI非活性化 (オーバーレイ方式)

**目的**: AI修正処理中にノードパレット、キャンバスエリアなどのUI要素への操作を防ぐため、半透明オーバーレイを表示してユーザーインタラクションをブロックする

**実装方針**:
- `refinement-store.ts`の`isProcessing`フラグを活用
- キャンバス全体を覆う半透明オーバーレイコンポーネントを作成
- オーバーレイは`isProcessing === true`の時のみ表示
- z-indexを適切に設定し、全てのUI要素より前面に配置
- オーバーレイ上にオプションで「AI処理中...」メッセージを表示可能

**影響範囲**:
- Webview UI (新規オーバーレイコンポーネント追加)
- 既存の`refinement-store.ts`の`isProcessing`状態を参照

#### Tasks

- [x] **[P3.10] T097**: オーバーレイコンポーネントの作成 - src/webview/src/components/common/ProcessingOverlay.tsx を新規作成。Props: `isVisible: boolean`, `message?: string`。半透明オーバーレイ (rgba(0, 0, 0, 0.3)) + 中央メッセージ表示エリア
- [x] **[P3.10] T098**: App.tsxへのオーバーレイ統合 (修正版) - src/webview/src/App.tsx の左2カラム (NodePalette + WorkflowEditor) を囲むdivを追加し、position: relative設定。ProcessingOverlayを配置。RefinementChatPanelは除外し、AI処理中も操作可能に (lines 93-105)
- [x] **[P3.10] T099**: 国際化対応 - src/webview/src/i18n/translations/{en,ja,ko,zh-CN,zh-TW}.ts に `refinement.processingOverlay` キーを追加。src/webview/src/i18n/translation-keys.ts の型定義も更新 (line 323)
- [x] **[P3.10] T100**: Toolbarへのオーバーレイ追加 - src/webview/src/components/Toolbar.tsx にProcessingOverlayをインポート。`isProcessing`を取得し、Toolbarのルート要素に position: relative を追加してオーバーレイを配置 (lines 10, 38, 220, 417)
- [x] **[P3.10] T101**: 動作確認とビルドテスト - `npm run build` 成功。ユーザー確認により、AI処理中にToolbar + 左2カラムが非活性化され、RefinementChatPanelのキャンセルボタンは操作可能なことを確認

**Checkpoint**: ✅ Phase 3.10 完了。AI処理中にToolbarと左2カラム（NodePalette + WorkflowEditor）が半透明オーバーレイで覆われ、ユーザーが誤操作できなくなる。RefinementChatPanelは除外され、キャンセルボタンなどの操作が可能

---

### Phase 3.11: キャンセル時のローディングメッセージ削除

**目的**: AI修正処理をキャンセルした際に、ローディング中のAIメッセージ（「AIがリクエストを処理中です... 64% 39s / 90s」）が会話履歴に残ってしまう問題を解決する

**問題の詳細**:
- 現在、キャンセル時に`handleRefinementFailed()`を呼んで`isProcessing`をfalseにしているが、ローディング中のAIメッセージは残ったまま
- ユーザーはキャンセル＝「やっぱりやめた」という意図なので、痕跡を残さない方が自然

**実装方針**:
- `refinement-store.ts`に`removeMessage(messageId)`メソッドを追加
- キャンセル処理時（CANCELLED error）に該当のAIメッセージを会話履歴から削除
- エラー時はメッセージを残してエラー状態表示、キャンセル時はメッセージ削除という一貫した設計

**影響範囲**:
- `src/webview/src/stores/refinement-store.ts` (新規メソッド追加)
- `src/webview/src/components/dialogs/RefinementChatPanel.tsx` (キャンセル処理の修正)

#### Tasks

- [x] **[P3.11] T102**: refinement-storeにremoveMessageメソッド追加
  - **File**: `src/webview/src/stores/refinement-store.ts`
  - **Action**: `removeMessage(messageId: string)`メソッドを実装
    - 指定されたmessageIdを持つメッセージを会話履歴から削除
    - `messages.filter(msg => msg.id !== messageId)`で実装
    - `updatedAt`を更新
    - 型定義(RefinementStore interface)にも追加

- [x] **[P3.11] T103**: handleSendのキャンセル処理でメッセージ削除
  - **File**: `src/webview/src/components/dialogs/RefinementChatPanel.tsx`
  - **Action**: `handleSend`のcatchブロック（error.code === 'CANCELLED'）を修正
    - `removeMessage(aiMessageId)`を呼び出してローディング中のAIメッセージを削除
    - `handleRefinementFailed()`は引き続き呼び出す

- [x] **[P3.11] T104**: handleRetryのキャンセル処理でメッセージ削除
  - **File**: `src/webview/src/components/dialogs/RefinementChatPanel.tsx`
  - **Action**: `handleRetry`のcatchブロック（error.code === 'CANCELLED'）を修正
    - `removeMessage(aiMessageId)`を呼び出してローディング中のAIメッセージを削除
    - `handleRefinementFailed()`は引き続き呼び出す

- [x] **[P3.11] T105**: 動作確認とビルドテスト
  - **Actions**:
    - AI修正開始後にキャンセルボタンを押し、ローディングメッセージが削除されることを確認
    - リトライ中にキャンセルボタンを押し、ローディングメッセージが削除されることを確認
    - タイムアウトやその他のエラー時は、メッセージが残ってエラー表示されることを確認（既存動作）
    - `npm run build`でビルドエラーがないことを確認

**Checkpoint**: Phase 3.11 完了後、AI修正処理をキャンセルした際にローディング中のメッセージが会話履歴から削除され、クリーンな状態に戻る

---

### Phase 3.12: 空のキャンバスからAI修正を開始可能にする

**目的**: activeWorkflowが存在しない状態（空のキャンバス）でも「AIで修正」ボタンを押せるようにし、最初からAI修正で会話しながらワークフローを作成できるようにする

**現状の問題**:
- 現在は「AIで生成」→「AIで修正」という2段階の操作が必要
- activeWorkflowがnullの場合、「AIで修正」ボタンが非活性になっている（Toolbar.tsx:314）
- 空のキャンバスから直接AI修正を使えた方がユーザー体験が向上する

**実装方針（Option 1: 空のワークフローを自動生成）**:
- 「AIで修正」ボタン押下時に、activeWorkflowがなければ空のワークフローを自動生成
- 空のワークフローにはStart/Endノードのみを含む（現在のデフォルトキャンバスと同じ）
- 会話履歴は生成された空のワークフローに紐づく
- 既存のrefinement-service.tsをそのまま使用可能（修正不要）

**設計上の利点**:
- 実装コストが最小（Toolbar.tsxとworkflow-store.tsのみ修正）
- 既存の「会話履歴は常にワークフローに紐づく」設計を維持
- activeWorkflowの概念を変更する必要がない
- リスクが低く、既存機能への影響がほぼない

**影響範囲**:
- `src/webview/src/components/Toolbar.tsx` (ボタンの非活性条件を削除、空ワークフロー生成ロジック追加)
- `src/webview/src/stores/workflow-store.ts` (createEmptyWorkflowヘルパー関数追加)

#### Tasks

- [x] **[P3.12] T106**: workflow-storeにcreateEmptyWorkflowヘルパー関数を追加
  - **File**: `src/webview/src/stores/workflow-store.ts`
  - **Action**: `createEmptyWorkflow()`関数を実装 ✓
    - 空のワークフローオブジェクトを生成（Start/Endノードのみ）
    - ワークフローIDはユニークに生成（`workflow-${Date.now()}-${Math.random()}`）
    - 名前は"Untitled Workflow"
    - conversationHistoryは未定義（後でrefinement-storeが初期化）
    - NodeTypeを正しくimport（require使用を避ける）
  - **Action**: WorkflowStoreインターフェースに`setActiveWorkflow`メソッドを追加 ✓
    - activeWorkflowを設定し、対応するノード・エッジをキャンバスに反映

- [x] **[P3.12] T107**: Toolbarの「AIで修正」ボタンを常に有効化
  - **File**: `src/webview/src/components/Toolbar.tsx`
  - **Action**: `handleOpenRefinementChat`を修正 ✓
    - activeWorkflowがnullの場合、createEmptyWorkflow()で空のワークフローを生成
    - setActiveWorkflow()でstoreに設定
    - その後、既存の会話履歴ロード/初期化処理を実行
  - **Action**: ボタンの`disabled`属性を削除（常に有効） ✓
  - **Action**: ボタンの`opacity`スタイル調整を削除 ✓

- [x] **[P3.12] T108**: 翻訳キーの追加と初期メッセージ表示
  - **Files**: `src/webview/src/i18n/translations/*.ts`, `src/webview/src/i18n/translation-keys.ts`
  - **Action**: 初期メッセージ用翻訳キーを追加 ✓
    - `refinement.initialMessage.description`: メイン説明文
    - `refinement.initialMessage.note`: Claude Code使用の注記
    - 全5言語（ja, en, ko, zh-CN, zh-TW）に追加
  - **File**: `src/webview/src/components/chat/MessageList.tsx`
  - **Action**: メッセージがない場合の初期表示を修正 ✓
    - 中央揃えで説明文と注記を表示
    - dangerouslySetInnerHTMLを使用せず、通常のテキスト表示

- [x] **[P3.12] T109**: 動作確認とビルドテスト
  - **Actions**:
    - 空のキャンバス状態で「AIで修正」ボタンが有効化されていることを確認 ✓
    - ボタン押下で空のワークフローが生成され、会話パネルが開くことを確認 ✓
    - 初期メッセージが中央に表示されることを確認 ✓
    - `npm run build`でビルドエラーがないことを確認 ✓
    - `npm run lint`でlintエラーがないことを確認 ✓

**Checkpoint**: Phase 3.12 完了後、空のキャンバスから直接「AIで修正」を使ってワークフローを作成できるようになり、「AIで生成」と「AIで修正」のどちらから始めても良い柔軟なUXを実現。初期表示には簡潔な説明文を表示し、ユーザーに使い方を案内

---

### Phase 3.13: キャンバスの実際の状態をAI修正に反映

**目的**: 初回の「AIで修正」実行時に、空のワークフロー（StartとEndのみ）ではなく、キャンバス上の実際のノード配置状態をAIに渡すようにする

**現状の問題**:
- Phase 3.12で、activeWorkflowがない場合は自動的に空のワークフロー（StartとEndノードのみ）を生成している
- ユーザーが手動でノードを配置した後に「AIで修正」を押した場合、その配置状態がAIに渡されず、空のワークフローから開始される
- ユーザーの意図：手動で配置したノードを基にAIに修正してほしい

**実装方針**:
- `createEmptyWorkflow()`の代わりに、現在のキャンバス状態（nodes, edges）から実際のWorkflowオブジェクトを生成する`createWorkflowFromCanvas()`を実装
- 手動で配置されたノードがある場合はそれらを含むワークフローをAIに渡す
- ノードが全くない場合はデフォルトのStart/Endノードのみを含む

**設計上の利点**:
- ユーザーが手動で配置したノードを尊重
- AIがユーザーの意図をより正確に理解できる
- 「手動配置 + AI修正」という柔軟なワークフロー作成方法を提供

**影響範囲**:
- `src/webview/src/stores/workflow-store.ts` (createWorkflowFromCanvas関数追加)
- `src/webview/src/components/Toolbar.tsx` (handleOpenRefinementChatを修正)

#### Tasks

- [x] **[P3.13] T110**: workflow-storeにcreateWorkflowFromCanvas関数を追加
  - **File**: `src/webview/src/stores/workflow-store.ts`
  - **Action**: `createWorkflowFromCanvas(nodes: Node[], edges: Edge[]): Workflow`関数を実装 ✓
    - 現在のキャンバス状態（nodes, edges）からWorkflowオブジェクトを生成
    - React FlowのNode/EdgeをWorkflow型のnodes/connectionsに変換
    - ワークフローIDはユニークに生成（`workflow-${Date.now()}-${Math.random()}`）
    - 名前は"Untitled Workflow"
    - conversationHistoryは未定義（後でrefinement-storeが初期化）
    - ノードが全くない場合はデフォルトのStart/Endノードを含める
    - WorkflowNode型注釈を追加してlintエラーを解消

- [x] **[P3.13] T111**: Toolbarの「AIで修正」ロジックを変更
  - **File**: `src/webview/src/components/Toolbar.tsx`
  - **Action**: `handleOpenRefinementChat`を修正 ✓
    - activeWorkflowがnullの場合、`createWorkflowFromCanvas(nodes, edges)`を呼び出す
    - `createEmptyWorkflow()`の代わりに`createWorkflowFromCanvas()`をimport
    - キャンバスの実際の状態がWorkflowとしてAIに渡されるようにする

- [x] **[P3.13] T112**: 動作確認とビルドテスト
  - **Actions**:
    - `npm run build`でビルドエラーがないことを確認 ✓
    - `npm run lint`でlintエラーがないことを確認 ✓
    - 実際の動作確認は拡張機能実行時にユーザーが検証

**Checkpoint**: Phase 3.13 完了後、初回「AIで修正」実行時にキャンバスの実際の状態がAIに渡され、ユーザーが手動で配置したノードを基にAIが修正を行うようになる。これにより、「手動配置 + AI修正」という柔軟なワークフロー作成方法が実現される。

---

### Phase 3.14: 「AIで生成」機能の削除と「AIで修正」への統一

**目的**: Phase 3.13により「AIで修正」が「AIで生成」の完全上位互換となったため、UIを統一し、「AIで修正」ボタン1つに集約する

**現状の問題**:
- 「AIで生成」と「AIで修正」の2つのボタンが存在し、機能的に重複している
- 「AIで生成」: モーダルダイアログで1回限りの生成
- 「AIで修正」: チャットパネルで対話的な生成・修正（Phase 3.13により初回生成も可能）
- ユーザーが「どちらを使うべきか」迷う可能性がある

**Phase 3.13による機能状況**:
- 「AIで修正」は空のキャンバスから新規生成できる（「AIで生成」と同等）
- 「AIで修正」は手動配置ノードを尊重して修正できる（「AIで生成」以上）
- 「AIで修正」は対話的な改善が可能（「AIで生成」にない機能）
- 「AIで修正」は会話履歴を保持（「AIで生成」にない機能）

**実装方針**:
- 「AIで生成」ボタンをToolbarから削除
- 「AIで生成」関連のUIコンポーネント（AiGenerationDialog）を削除
- 「AIで生成」関連のサービス（ai-generation-service）は**削除しない**（Extension Hostで使用中）
- 「AIで修正」ボタンを強調表示（プライマリボタンスタイル）
- 翻訳キーを更新し、「AIで修正」の説明を拡充
- オンボーディングツアーを更新

**削除対象**:
- Toolbar.tsx: 「AIで生成」ボタンとAiGenerationDialogコンポーネント
- src/webview/src/components/dialogs/AiGenerationDialog.tsx: ファイル全体
- src/webview/src/i18n/translations/*.ts: ai.* 翻訳キー（dialogTitle, dialogDescription, descriptionLabel等）

**削除しない対象**:
- src/webview/src/services/ai-generation-service.ts: Extension Hostが使用中（src/extension/commands/ai-generation.ts）
- Extension Host側のai-generation関連コード: Webview以外のワークフロー生成で使用される可能性

**影響範囲**:
- `src/webview/src/components/Toolbar.tsx` (ボタン削除、ダイアログimport削除)
- `src/webview/src/components/dialogs/AiGenerationDialog.tsx` (ファイル削除)
- `src/webview/src/i18n/translations/*.ts` (翻訳キー削除: ai.dialogTitle, ai.dialogDescription等)
- `src/webview/src/i18n/translation-keys.ts` (型定義から ai.* キーを削除)
- `src/webview/src/components/Tour.tsx` (ツアーステップ更新: ai-generate-button関連削除)

#### Tasks

- [x] **[P3.14] T113**: Toolbarから「AIで生成」ボタンとダイアログを削除 ✓
  - **File**: `src/webview/src/components/Toolbar.tsx`
  - **Actions**:
    - Line 21: `import { AiGenerationDialog } from './dialogs/AiGenerationDialog';` 削除 ✓
    - Line 46: `const [showAiDialog, setShowAiDialog] = useState(false);` 削除 ✓
    - Line 293-310: 「Generate with AI Button」コメントとボタン要素を削除 ✓
    - Line 415: `<AiGenerationDialog isOpen={showAiDialog} onClose={() => setShowAiDialog(false)} />` 削除 ✓
    - コメントを「Phase 3.14: Unified AI generation/refinement」に更新 ✓

- [x] **[P3.14] T114**: AiGenerationDialogコンポーネントファイルを削除 ✓
  - **File**: `src/webview/src/components/dialogs/AiGenerationDialog.tsx`
  - **Action**: ファイル全体を削除（421行） ✓

- [x] **[P3.14] T115**: 翻訳キーの削除（5言語分） ✓
  - **Files**:
    - `src/webview/src/i18n/translations/en.ts` ✓
    - `src/webview/src/i18n/translations/ja.ts` ✓
    - `src/webview/src/i18n/translations/ko.ts` ✓
    - `src/webview/src/i18n/translations/zh-CN.ts` ✓
    - `src/webview/src/i18n/translations/zh-TW.ts` ✓
  - **Actions**: 以下の`ai.*`翻訳キーを削除 ✓
    - ai.dialogTitle, ai.dialogDescription, ai.descriptionLabel, ai.descriptionPlaceholder
    - ai.characterCount, ai.usageNote, ai.overwriteWarning
    - ai.generateButton, ai.cancelButton, ai.cancelGenerationButton
    - ai.generating, ai.progressTime, ai.success
    - ai.error.emptyDescription, ai.error.descriptionTooLong, ai.error.commandNotFound
    - ai.error.timeout, ai.error.parseError, ai.error.validationError, ai.error.unknown

- [x] **[P3.14] T116**: translation-keys.tsの型定義を更新 ✓
  - **File**: `src/webview/src/i18n/translation-keys.ts`
  - **Action**: `TranslationKeys`型から`ai.*`キーを削除（T115で削除した翻訳キーに対応） ✓

- [x] **[P3.14] T117**: Tourコンポーネントからai-generate-buttonステップを削除 ✓
  - **File**: `src/webview/src/constants/tour-steps.ts`
  - **Actions**:
    - Line 80-85: ai-generate-buttonステップを削除し、ai-refine-buttonステップに置き換え ✓
    - 翻訳ファイル5言語すべてでtour.generateWithAIをtour.refineWithAIに更新 ✓
      - ja: 「「AIで修正」ボタンで、AIとチャットしながらワークフローを生成・改善できます...」
      - en: "Use the 'Refine with AI' button to create or improve workflows..."
      - ko: "「AI로 수정」버튼을 사용하여 AI와 대화하며 워크플로우를 생성하거나 개선..."
      - zh-CN: "使用「AI优化」按钮通过与AI对话创建或改进工作流..."
      - zh-TW: "使用「AI優化」按鈕透過與AI對話建立或改善工作流程..."
    - translation-keys.tsにtour.refineWithAIを追加 ✓

- [x] **[P3.14] T118**: ビルドとLintテスト ✓
  - **Actions**:
    - `npm run build`でビルドエラーがないことを確認 ✓
    - `npm run lint`でlintエラーがないことを確認 ✓
    - 未使用import、未定義の翻訳キー参照がないことを確認 ✓

- [x] **[P3.14] T119**: 手動E2Eテスト（ユーザーによる拡張機能実行時に検証） ✓
  - **Test Scenarios**:
    1. 空のキャンバスで「AIで修正」を開き、「ユーザー管理システムを作って」と入力してワークフローが生成されることを確認 ✓
    2. 生成されたワークフローに対して「エラーハンドリングを追加」と修正要求を送信し、更新されることを確認 ✓
    3. 手動でノードを配置した後、「AIで修正」を開き、「このフローを改善して」と入力してノードが尊重されることを確認 ✓
    4. ツアー機能で「AIで修正」ステップが正しく表示されることを確認 ✓
  - **検証結果**: すべてのシナリオで正常動作を確認。UIが統一され、ユーザーエクスペリエンスが向上した。

**Checkpoint**: Phase 3.14 完了 ✓ - 「AIで生成」と「AIで修正」の機能が「AIで修正」1つに統一され、ユーザーは1つのボタンで新規生成も修正も実行できるシンプルなUIとなった。Phase 3.13の機能により、空のキャンバスでも手動配置済みのキャンバスでも対応可能。10ファイル変更、617行削除、UIがクリーンで直感的に改善された。

---

### Phase 3.14.1: 反復制限のソフトウォーニング化とUX改善 ✓

**目的**: 20回の反復制限をハードリミットからソフトウォーニングに変更し、ユーザーエクスペリエンスを向上させる

**背景**:
- 従来は20回の反復でメッセージ送信がブロックされていた
- ユーザーが作業を継続したい場合に不便
- ソフトウォーニングに変更し、情報提供しつつ送信は許可する方針に変更

**実装内容**:

- [x] **[P3.14.1] 反復制限の削除**:
  - **File**: `src/webview/src/stores/refinement-store.ts:295-298`
  - **Action**: `canSend()` メソッドから反復回数20回の制限チェックを削除 ✓
  - **Before**: `if (conversationHistory.currentIteration >= 20) { return false; }`
  - **After**: 制限チェックを削除し、常に送信可能に

- [x] **[P3.14.1] ソフトウォーニング機能の追加**:
  - **File**: `src/webview/src/stores/refinement-store.ts`
  - **Action**: `shouldShowWarning()` メソッドを追加 ✓
  - **Logic**: `currentIteration >= 20` で警告バナーを表示

- [x] **[P3.14.1] 表示形式の改善**:
  - **Files**: `src/webview/src/i18n/translations/{ja,en,ko,zh-CN,zh-TW}.ts`
  - **Action**: `refinement.iterationCounter` キーの値を変更 ✓
  - **Before**: `"{current} iterations"` (技術的で分かりにくい)
  - **After**:
    - 日本語: `"編集回数: {current}回"`
    - 英語: `"Edits: {current}"`
    - 韓国語: `"편집 횟수: {current}회"`
    - 簡体字中国語: `"编辑次数: {current}次"`
    - 繁体字中国語: `"編輯次數: {current}次"`

- [x] **[P3.14.1] ツールチップの追加**:
  - **File**: `src/webview/src/components/chat/IterationCounter.tsx`
  - **Action**: バッジにツールチップを追加し、パフォーマンス影響を説明 ✓
  - **Files**: `src/webview/src/i18n/translations/{ja,en,ko,zh-CN,zh-TW}.ts`
  - **新規キー**: `refinement.iterationCounter.tooltip`
  - **内容**:
    - 日本語: `"編集回数が多いと保存・読み込みが遅くなり、編集作業に支障が出る可能性があります"`
    - 英語: `"High edit counts may slow down save/load operations and impact editing workflow"`
    - 韓国語: `"편집 횟수가 많으면 저장·불러오기가 느려지고 편집 작업에 지장이 생길 수 있습니다"`
    - 簡体字中国語: `"编辑次数过多可能导致保存·加载速度变慢,影响编辑工作"`
    - 繁体字中国語: `"編輯次數過多可能導致儲存·載入速度變慢,影響編輯工作"`

- [x] **[P3.14.1] IterationCounterの簡素化**:
  - **File**: `src/webview/src/components/chat/IterationCounter.tsx`
  - **Action**: 色分け警告表示を削除し、シンプルなバッジに統一 ✓
  - **Removed**: `isApproachingLimit` 使用と条件付き背景色変更
  - **Result**: 常に同じスタイルのバッジを表示

**影響範囲**:
- `src/webview/src/stores/refinement-store.ts` (canSend, shouldShowWarning)
- `src/webview/src/components/chat/WarningBanner.tsx` (既存、Phase 3でT013-1で作成済み)
- `src/webview/src/components/chat/IterationCounter.tsx` (表示形式、ツールチップ)
- `src/webview/src/components/dialogs/RefinementChatPanel.tsx` (WarningBanner統合、T022で完了済み)
- `src/webview/src/i18n/translation-keys.ts` (型定義追加)
- `src/webview/src/i18n/translations/*.ts` (5言語の翻訳更新)

**ビルド確認**:
- [x] `npm run check`: ✓ Biome linting passed
- [x] `npm run build`: ✓ TypeScript compilation and Vite build successful

**UX改善ポイント**:
1. **ブロック解除**: ユーザーは20回以上でも作業を継続可能
2. **明確な表示**: 「編集回数」と明記し、何をカウントしているか明確化
3. **情報提供**: ツールチップでパフォーマンス影響を説明し、ユーザー教育
4. **ソフトウォーニング**: 警告バナーで情報提供しつつ、送信はブロックしない

**Checkpoint**: Phase 3.14.1 完了 ✓ - 20回反復制限がハードリミットからソフトウォーニングに変更され、ユーザーは情報を得つつも作業を継続できるようになった。表示形式とツールチップの改善により、UXが大幅に向上。6ファイル変更、ユーザーフレンドリーなインターフェースを実現。

---

### Phase 3.15: ハイブリッドアプローチ - VSCodeターミナル統合 (UI/UX改善)

**目的**: チャットUIを残しつつ、「ターミナルで編集」ボタンを追加し、Claude Code CLIの対話セッションをVSCodeターミナルで起動できるようにする

**背景**:
- 現在のチャットUIは簡易的な修正に適している（Phase 3.1-3.14で洗練されたUI）
- 複雑な修正や詳細な対話が必要な場合、Claude Code CLIの全機能を活用したい
- ユーザーに両方のワークフローを提供し、状況に応じて使い分けられるようにする

**ユースケース**:
1. **簡易修正**: チャットUIで「エラーハンドリングを追加」などの短い指示
2. **複雏な修正**: ターミナルでClaude Codeと詳細に対話しながら編集
3. **ファイル直接編集**: Claude Codeのツール機能（Read, Edit, Write等）をフル活用

**実装方針（ハイブリッドアプローチ）**:
```
[RefinementChatPanel]
  ├─ 通常の会話（現在の実装を維持）
  ├─ メッセージ履歴表示
  ├─ メッセージ入力エリア
  └─ [🖥️ ターミナルで編集] ボタン（ヘッダーに追加）
       ↓
  [VSCode Terminal] Claude Code対話セッション起動
       - 現在のワークフローファイルパスを渡す
       - 会話履歴をsystem-promptで注入
       - ワークフローファイル変更後、Extension側でFileSystemWatcherで検知
       - Webview側で自動再読み込み
```

**Claude Code CLI起動例**:
```bash
cd /path/to/workspace
claude --system-prompt "あなたはワークフロー編集の専門家です。
現在のワークフロー: .vscode/workflows/workflow-123.json

会話履歴:
[USER]: エラーハンドリングを追加して
[AI]: IfElseノードを追加しました

このワークフローを改善してください。" \
"ユーザーからの次の指示を待っています"
```

**設計上の利点**:
- 既存のPhase 3.1-3.14の実装を無駄にしない
- 簡易修正と複雑な修正の両方をサポート
- ユーザーが自由に選択可能
- ファイル変更の同期はFileSystemWatcherで自動化

**技術的考慮事項**:
- VSCode Terminal API (`vscode.window.createTerminal()`) を使用
- `terminal.sendText()` でコマンド送信
- FileSystemWatcher でワークフローJSONファイルの変更を監視
- 変更検知後、workflow-storeで再読み込み
- 会話履歴は最新3-5往復をsystem-promptに含める（トークン制限考慮）

**影響範囲**:
- `src/webview/src/components/dialogs/RefinementChatPanel.tsx` (ボタン追加)
- `src/extension/commands/workflow-refinement.ts` (新規: handleOpenTerminal)
- `src/extension/services/terminal-service.ts` (新規: Claude Code起動ロジック)
- `src/extension/services/file-watcher-service.ts` (新規: ワークフロー変更監視)
- `src/shared/types/messages.ts` (新規: OPEN_TERMINAL_EDITOR メッセージ型)
- `src/webview/src/i18n/translations/*.ts` (翻訳キー追加)

### Implementation for Phase 3.15

- [ ] **[P3.15] T120**: メッセージ型の追加
  - **File**: `src/shared/types/messages.ts`
  - **Action**: `OpenTerminalEditorMessage` 型を追加
    ```typescript
    export interface OpenTerminalEditorMessage {
      type: 'OPEN_TERMINAL_EDITOR';
      requestId: string;
      payload: {
        workflowId: string;
        workflowFilePath: string;
        conversationHistory: ConversationHistory;
      };
    }
    ```
  - WebviewMessageユニオン型に追加

- [ ] **[P3.15] T121**: terminal-service の作成
  - **File**: `src/extension/services/terminal-service.ts` (新規作成)
  - **Action**: `openClaudeCodeTerminal()` 関数を実装
    - 現在のワークスペースのルートディレクトリを取得
    - 会話履歴から直近3-5往復を抽出してsystem-promptを構築
    - `vscode.window.createTerminal()` でターミナル作成
    - `terminal.sendText()` でClaude Codeコマンド送信
      - `claude --system-prompt "..." "ワークフローの改善を開始します"`
    - `terminal.show()` でターミナルを表示
  - エラーハンドリング（Claude Codeがインストールされていない場合）

- [ ] **[P3.15] T122**: file-watcher-service の作成
  - **File**: `src/extension/services/file-watcher-service.ts` (新規作成)
  - **Action**: `watchWorkflowFile()` 関数を実装
    - `vscode.workspace.createFileSystemWatcher()` で特定のワークフローJSONファイルを監視
    - 変更検知時にWebviewに `WORKFLOW_FILE_CHANGED` メッセージを送信
    - ペイロードに更新されたワークフロー内容を含める
  - `disposeWatcher()` でクリーンアップ

- [ ] **[P3.15] T123**: handleOpenTerminal コマンドハンドラの作成
  - **File**: `src/extension/commands/workflow-refinement.ts`
  - **Action**: `handleOpenTerminal()` 関数を実装
    - OpenTerminalEditorMessage を受信
    - ワークフローファイルパスを解決
    - terminal-service.openClaudeCodeTerminal() を呼び出し
    - file-watcher-service.watchWorkflowFile() で監視開始
    - 成功/失敗メッセージをWebviewに送信

- [ ] **[P3.15] T124**: Extension メッセージハンドラの登録
  - **File**: `src/extension/extension.ts`
  - **Action**: OPEN_TERMINAL_EDITOR メッセージハンドラを追加
    - `case 'OPEN_TERMINAL_EDITOR': await handleOpenTerminal(message, panel.webview);`

- [ ] **[P3.15] T125**: RefinementChatPanel に「ターミナルで編集」ボタン追加
  - **File**: `src/webview/src/components/dialogs/RefinementChatPanel.tsx`
  - **Action**: ヘッダーエリアに新しいボタンを追加
    - アイコン: 🖥️ または VSCode Terminal アイコン
    - クリック時に `handleOpenTerminal()` を呼び出し
    - `refinement-service.openTerminalEditor()` 経由でメッセージ送信
  - スタイル: 既存の「会話履歴クリア」ボタンと同じデザイン

- [ ] **[P3.15] T126**: refinement-service にターミナル起動関数追加
  - **File**: `src/webview/src/services/refinement-service.ts`
  - **Action**: `openTerminalEditor()` 関数を実装
    - OPEN_TERMINAL_EDITOR メッセージを構築
    - postMessage() でExtension Hostに送信
    - 成功/失敗の通知を受け取る

- [ ] **[P3.15] T127**: ワークフロー変更の自動再読み込み
  - **File**: `src/webview/src/stores/workflow-store.ts`
  - **Action**: WORKFLOW_FILE_CHANGED メッセージハンドラを追加
    - Extension Hostからの変更通知を受信
    - 更新されたワークフローでストアを更新
    - キャンバスのノード・エッジを再描画
  - 会話履歴も更新されている場合は refinement-store も同期

- [ ] **[P3.15] T128**: i18n 翻訳キーの追加
  - **Files**: `src/webview/src/i18n/translations/*.ts` (5言語)
  - **Action**: 翻訳キーを追加
    - `refinement.openTerminalButton`: "ターミナルで編集" (ja), "Edit in Terminal" (en), etc.
    - `refinement.openTerminalTooltip`: "Claude Codeをターミナルで起動し、詳細な対話編集を行います" (ja), etc.
    - `refinement.terminalOpenSuccess`: "ターミナルでClaude Codeを起動しました" (ja), etc.
    - `refinement.error.terminalOpenFailed`: "ターミナルの起動に失敗しました" (ja), etc.
  - `translation-keys.ts` の型定義も更新

- [ ] **[P3.15] T129**: system-prompt構築ロジックの実装
  - **File**: `src/extension/services/terminal-service.ts`
  - **Action**: `constructTerminalSystemPrompt()` ヘルパー関数を実装
    - 現在のワークフローファイルパスを含める
    - 会話履歴から直近3-5往復を抽出（トークン制限考慮）
    - workflow-schema.json の要約を含める（オプション）
    - プロンプト例:
      ```
      あなたはClaude Code Workflow Studioのワークフロー編集専門家です。

      現在のワークフローファイル: .vscode/workflows/workflow-123.json

      会話履歴（最新5往復）:
      [USER]: エラーハンドリングを追加
      [AI]: IfElseノードを2つ追加しました
      [USER]: もっと詳細にして
      [AI]: バリデーションロジックを追加しました

      ユーザーはターミナルで詳細な編集を行いたいと考えています。
      ワークフローファイルを直接編集し、改善してください。
      ```

- [ ] **[P3.15] T130**: ビルドとLintテスト
  - **Actions**:
    - `npm run build` でビルドエラーがないことを確認
    - `npm run lint` でlintエラーがないことを確認
    - TypeScript型エラーがないことを確認

- [ ] **[P3.15] T131**: 手動E2Eテスト（ユーザーによる拡張機能実行時に検証）
  - **Test Scenarios**:
    1. チャットパネルで数回の会話後、「ターミナルで編集」ボタンをクリック
    2. VSCodeターミナルが開き、Claude Codeが起動することを確認
    3. system-promptに会話履歴が含まれていることを確認
    4. ターミナルでワークフローファイルを編集
    5. ファイル保存後、Webview上のキャンバスが自動更新されることを確認
    6. 会話履歴も同期されることを確認（ターミナルで編集した内容が反映）

**Checkpoint**: Phase 3.15 完了後、ユーザーは簡易修正（チャットUI）と複雑な修正（ターミナル）を状況に応じて使い分けられるようになる。既存のチャットUI実装を維持しながら、Claude Code CLIの全機能を活用可能になり、柔軟なワークフロー編集体験を提供する。

---