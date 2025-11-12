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

- [ ] T010 [P] [US1] MessageBubble コンポーネントの作成: src/webview/src/components/chat/MessageBubble.tsx を作成し、ユーザー/AIメッセージの表示を実装
- [ ] T011 [P] [US1] MessageList コンポーネントの作成: src/webview/src/components/chat/MessageList.tsx を作成し、会話履歴の表示と自動スクロールを実装
- [ ] T012 [P] [US1] MessageInput コンポーネントの作成: src/webview/src/components/chat/MessageInput.tsx を作成し、テキスト入力・送信ボタン・文字数カウンターを実装
- [ ] T013 [P] [US1] IterationCounter コンポーネントの作成: src/webview/src/components/chat/IterationCounter.tsx を作成し、X/20の反復回数表示を実装
- [ ] T014 [US1] RefinementChatPanel コンポーネントの作成: src/webview/src/components/dialogs/RefinementChatPanel.tsx を作成し、チャットパネルのレイアウトと子コンポーネントの統合を実装（T010-T013に依存）
- [ ] T015 [US1] Toolbar の拡張: src/webview/src/components/Toolbar.tsx に「AIで修正」ボタンを追加し、クリック時にチャットパネルを開く機能を実装
- [ ] T016 [US1] App コンポーネントの統合: src/webview/src/App.tsx に RefinementChatPanel を追加し、表示制御を実装
- [ ] T017 [US1] メッセージフロー統合: Webview → Extension Host → AI → Webview の双方向メッセージング実装と、ワークフロー自動更新の統合
- [ ] T018 [US1] エラーハンドリングの追加: タイムアウト、ネットワークエラー、バリデーションエラーのエラーメッセージ表示を実装

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
   - Given: ユーザーが反復上限に近づいている
   - When: チャットパネルを表示
   - Then: カウンターが「15/20 iterations remaining」のように表示される

4. **反復上限の制御**
   - Given: 反復上限（20回）に達した
   - When: ユーザーが追加の要求を送信しようとする
   - Then: システムが送信を防止し、上限に達したメッセージを表示する

### Implementation for User Story 2

- [ ] T019 [US2] 会話コンテキスト管理: constructRefinementPrompt() を拡張し、直近3-5往復の会話履歴をプロンプトに含めるロジックを実装（src/extension/services/refinement-service.ts）
- [ ] T020 [US2] 反復回数の追跡: conversationHistory.currentIteration のインクリメント処理を実装し、メッセージ送信時に更新（src/extension/commands/workflow-refinement.ts, src/webview/src/stores/refinement-store.ts）
- [ ] T021 [US2] 反復上限チェック: canSend() メソッドで currentIteration < maxIterations を検証し、上限到達時に送信ボタンを無効化（src/webview/src/stores/refinement-store.ts）
- [ ] T022 [US2] 反復上限警告表示: isApproachingLimit() メソッド（currentIteration >= 18）を実装し、警告色でカウンター表示（src/webview/src/components/chat/IterationCounter.tsx）
- [ ] T023 [US2] 上限到達時エラーハンドリング: ITERATION_LIMIT_REACHED エラーコードの処理を追加し、適切なエラーメッセージを表示（src/extension/commands/workflow-refinement.ts, src/webview/src/stores/refinement-store.ts）

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

- [ ] T024 [US3] 会話履歴のシリアライズ: ワークフローJSONに conversationHistory フィールドを保存する機能を実装（src/extension/services/file-service.ts）
- [ ] T025 [US3] 会話履歴のデシリアライズ: ワークフロー読み込み時に conversationHistory を復元する機能を実装（src/extension/services/file-service.ts）
- [ ] T026 [US3] チャットパネル開閉時の履歴復元: openChat() 時に既存の conversationHistory をストアに読み込む処理を実装（src/webview/src/stores/refinement-store.ts）
- [ ] T027 [US3] 初回使用時の履歴初期化: conversationHistory が null の場合、initConversation() で空の履歴を初期化（src/webview/src/stores/refinement-store.ts）
- [ ] T028 [US3] 拡張機能リロード対応: ワークフローストアとの統合により、リロード後も conversationHistory が復元されることを確認（src/webview/src/stores/workflow-store.ts, refinement-store.ts）

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
   - Then: 会話履歴がクリアされ、反復カウンターが0/20にリセットされ、チャットパネルが空状態で表示される

3. **クリア後の新規会話**
   - Given: 会話履歴がクリアされた
   - When: ユーザーが新しい改善要求を送信
   - Then: AIが過去のコンテキストを考慮せず、新しい会話として処理する

4. **キャンセル時の履歴保持**
   - Given: クリア確認ダイアログが表示されている
   - When: ユーザーがキャンセルボタンをクリック
   - Then: 会話履歴が変更されずに保持される

### Implementation for User Story 4

- [ ] T029 [P] [US4] 会話履歴クリアボタンの追加: RefinementChatPanel ヘッダーに「会話履歴クリア」ボタンを追加（src/webview/src/components/dialogs/RefinementChatPanel.tsx）
- [ ] T030 [P] [US4] 確認ダイアログコンポーネントの作成（または既存のConfirmDialogを使用）: クリア確認用のダイアログを実装（src/webview/src/components/dialogs/ConfirmDialog.tsx）
- [ ] T031 [US4] clearHistory() アクションの実装: Zustand ストアに会話履歴クリア機能を実装（messages: [], currentIteration: 0, updatedAt更新）（src/webview/src/stores/refinement-store.ts）
- [ ] T032 [US4] Extension Host でのクリア処理: handleClearConversation() で conversationHistory を null に設定し、ワークフローJSONを保存（src/extension/commands/workflow-refinement.ts）
- [ ] T033 [US4] クリア後のメッセージフロー: CLEAR_CONVERSATION → Extension Host → CONVERSATION_CLEARED → Webview のメッセージングを統合（src/webview/src/services/refinement-service.ts, src/extension/commands/workflow-refinement.ts）

**Checkpoint**: すべてのユーザーストーリーが独立して機能し、完全な機能セットが実現

---

## Phase 7: ポリッシュ＆横断的関心事

**目的**: 複数のユーザーストーリーに影響する改善

- [ ] T034 [P] アクセシビリティ対応: ARIA labels（role="log", aria-live="polite"）、キーボードナビゲーション（Esc で閉じる、Ctrl/Cmd+Enter で送信）を実装
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
