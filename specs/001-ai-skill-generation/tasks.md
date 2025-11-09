# 実装タスク: AI-Assisted Skill Node Generation

**フィーチャーブランチ**: `001-ai-skill-generation`
**作成日**: 2025-11-09
**仕様書**: [spec.md](spec.md) | **実装計画**: [plan.md](plan.md)

---

## 進捗管理

**重要**: タスク完了時は、`- [ ]` を `- [x]` に変更してマークしてください。

例:
```markdown
- [ ] T001 未完了のタスク
- [x] T002 完了したタスク
```

これにより、実装の進捗を可視化できます。

---

## 概要

このフィーチャーは、AI支援ワークフロー生成機能を拡張し、利用可能なSkillノードを自動選択・挿入する機能を提供します。ユーザーが専門的な機能を必要とするワークフローを記述すると、システムは利用可能なPersonal/ProjectスキルをスキャンしてAI promptに含め、関連するSkillノードを自動的に生成します。

**技術スタック**:
- TypeScript 5.3 (Extension Host)
- React 18.2 (Webview UI)
- 既存の skill-service.ts, ai-generation.ts を再利用
- 新規外部ライブラリ依存なし(ユーザー制約)

**主要コンポーネント**:
- `skill-relevance-matcher.ts` [NEW]: キーワードマッチングによる関連度計算
- `ai-generation.ts` [MODIFY]: Skill listをpromptに追加、skillPath解決
- `validate-workflow.ts` [EXTEND]: Skillノードバリデーションルール追加
- `workflow-schema.json` [VERIFY]: Skillノードタイプドキュメント確認

**テスト方針**: 自動テストは実施せず、ユーザーによる手動E2Eテストのみで検証します。

---

## 依存関係グラフ

### User Story完了順序

```
Phase 1: セットアップ
  ↓
Phase 2: 基盤機能(全User Storyのブロッキング前提条件)
  ├─ Skillスキャン機能検証
  ├─ Keyword matchingアルゴリズム実装
  └─ Skillフィルタリング実装
  ↓
Phase 3: User Story 1 [P1] - Core AI Skill Generation (独立実装可能)
  ├─ Prompt拡張(Skills追加)
  ├─ SkillPath解決
  └─ バリデーション拡張
  ↓
Phase 4: User Story 2 [P2] - Validation & Error Handling (US1依存)
  └─ エラー表示・ビジュアルインジケーター検証
  ↓
Phase 5: User Story 3 [P3] - User Skill Selection (US1依存、オプション)
  └─ UI拡張(Skill checkboxes)
  ↓
Phase 6: Polish & Cross-Cutting Concerns
```

**MVP スコープ**: Phase 1 + Phase 2 + Phase 3 (User Story 1のみ)で完全に動作するコア機能が提供されます。

**並列実装機会**:
- Phase 2内のタスクは一部並列実行可能([P]マーカー参照)
- Phase 3内のタスクはサブグループで並列化可能
- Phase 4, 5は独立しているため、Phase 3完了後に並列実装可能

---

## Phase 1: セットアップ

**ゴール**: 開発環境準備とドキュメント整備

- [x] T001 仕様書・設計ドキュメントの確認 (spec.md, plan.md, data-model.md, contracts/)を完了し、実装方針を理解する
- [x] T002 既存コード調査: `src/extension/services/skill-service.ts`, `src/extension/commands/ai-generation.ts`, `src/extension/utils/validate-workflow.ts`の現状把握
- [x] T003 workflow-schema.jsonのSkillノードタイプドキュメントを確認(存在すればT004をスキップ、なければ追加)
- [x] T004 (条件付き) `resources/workflow-schema.json`にSkillノードタイプドキュメントを追加(research.md Q2参照、約800バイト)
- [x] T005 開発環境セットアップ確認: `npm install`, `npm run compile`が正常に実行できることを確認

**完了基準**:
- 全ドキュメント読了済み
- Skillノードタイプがworkflow-schema.jsonに存在する
- ビルドが実行できる

---

## Phase 2: 基盤機能

**ゴール**: 全User Storyで共通利用する基盤機能の実装(ブロッキング)

### 2.1 Skillスキャン機能検証

- [x] T006 [P] 既存 `scanPersonalSkills()`, `scanProjectSkills()` の動作確認(skill-service.ts)。テスト用モックSkillファイルを作成してスキャン結果をconsole.logで確認
- [x] T007 [P] SkillReference型定義が `src/shared/types/messages.ts` に存在することを確認。存在しない場合はdata-model.mdに基づいて型定義を追加

### 2.2 Keyword Matchingアルゴリズム実装

**ファイル**: `src/extension/services/skill-relevance-matcher.ts` [NEW]

- [x] T008 `tokenize()` 関数実装: 文字列を小文字化、ストップワード除去、最小長3文字フィルタ(data-model.md参照)
- [x] T009 `calculateSkillRelevance()` 関数実装: userTokensとskillTokensの交差を計算し、スコア算出(formula: |intersection| / sqrt(|userTokens| * |skillTokens|))
- [ ] T010 動作確認: console.logで "Analyze PDF documents" と sample Skill description のスコア計算結果を出力し、0.0-1.0の範囲であることを確認

### 2.3 Skillフィルタリング実装

**ファイル**: `src/extension/services/skill-relevance-matcher.ts` [MODIFY]

- [x] T011 `filterSkillsByRelevance()` 関数実装: 全Skillsに対して関連度計算、threshold(0.6)でフィルタ、maxResults(20)で制限
- [x] T012 Duplicate Skill名処理実装: 同名Skillが複数scopeに存在する場合、project scopeを優先(data-model.md参照)
- [ ] T013 動作確認: 10個のモックSkillを用意し、filterSkillsByRelevanceの出力をconsole.logで確認(ソート順序、duplicate処理、maxResults制限)

---

## Phase 3: User Story 1 [P1] - Core AI Skill Generation

**ゴール**: AIが関連するSkillノードを自動生成する(コア機能)

**Independent Test**: "Create a workflow that analyzes PDF documents"というリクエストでPDF関連Skillが存在する場合、生成されたワークフローに正しいSkillノードが含まれることを手動で検証

### 3.1 Prompt拡張

**ファイル**: `src/extension/commands/ai-generation.ts` [MODIFY]

- [x] T014 [US1] `handleGenerateWorkflow()` 修正: Skill scanning実行(`scanPersonalSkills()` + `scanProjectSkills()`)をPromise.allで並列実行
- [x] T015 [US1] `handleGenerateWorkflow()` 修正: `filterSkillsByRelevance()`を呼び出してtop 20 Skillsを取得
- [x] T016 [US1] `constructPrompt()` 関数シグネチャ拡張: 第3引数に `filteredSkills: SkillRelevanceScore[]` を追加
- [x] T017 [US1] `constructPrompt()` 修正: "Available Skills"セクションをpromptに追加(JSON配列形式、name/description/scopeのみ含む)。contracts/skill-scanning-api.md参照
- [ ] T018 [US1] 動作確認: 生成されたprompt文字列をconsole.logで出力し、"Available Skills"セクションが含まれ、Skill情報が正しいJSON配列形式であることを確認

### 3.2 SkillPath解決

**ファイル**: `src/extension/commands/ai-generation.ts` [MODIFY]

- [x] T019 [US1] `resolveSkillPaths()` 新規関数実装: Workflowノードを走査し、type==='skill'のノードに対してskillPathを解決(contracts/skill-scanning-api.md 4.1参照)
- [x] T020 [US1] `resolveSkillPaths()` エラーハンドリング: Skillが見つからない場合 `validationStatus: 'missing'` を設定
- [x] T021 [US1] `handleGenerateWorkflow()` 修正: CLI実行後、parseしたworkflowに対して `resolveSkillPaths()` を呼び出す
- [ ] T022 [US1] 動作確認: console.logでskillPath解決前後のSkillノードデータを出力し、skillPathが正しく設定されることを確認

### 3.3 バリデーション拡張

**ファイル**: `src/extension/utils/validate-workflow.ts` [EXTEND]

- [x] T023 [US1] `VALIDATION_RULES.SKILL` 定数追加: NAME_PATTERN(/^[a-z0-9-]+$/), NAME_MAX_LENGTH(64), DESCRIPTION_MAX_LENGTH(1024), OUTPUT_PORTS(1), REQUIRED_FIELDS配列(data-model.md参照)
- [x] T024 [US1] `validateSkillNode()` 新規関数実装: required fields, name format, length制約をチェック(contracts/skill-scanning-api.md 5.1参照)
- [x] T025 [US1] エラーコード定義追加: SKILL_MISSING_FIELD, SKILL_INVALID_NAME, SKILL_NAME_TOO_LONG, SKILL_DESC_TOO_LONG, SKILL_FILE_NOT_FOUND, SKILL_INVALID_YAML, SKILL_INVALID_PORTS
- [x] T026 [US1] `validateAIGeneratedWorkflow()` 修正: Skillノードに対して `validateSkillNode()` を呼び出すロジックを追加

### 3.4 手動E2Eテスト

- [x] T027 [US1] VSCode拡張機能をローカルビルド(`npm run compile`)→実行(`F5`)、AI Generation Dialog開く
- [x] T028 [US1] テスト用Skillファイル作成: `~/.claude/skills/pdf-analyzer/SKILL.md` に有効なYAML frontmatterを持つファイルを作成
- [x] T029 [US1] AI Dialog で "Create a workflow to analyze PDF documents" と入力して生成実行
- [x] T030 [US1] 生成されたワークフローにSkillノード(pdf-analyzer)が含まれること、skillPathが解決済み(`/Users/.../pdf-analyzer/SKILL.md`)、validationStatus='valid'であることをcanvas上で確認
- [x] T031 [US1] 異常系テスト: `~/.claude/skills/pdf-analyzer/SKILL.md` を削除 → 再度生成 → validationStatus='missing'になることを確認

**User Story 1 完了基準**:
- AIが関連するSkillノードを自動生成できる
- skillPathが自動解決される
- 手動E2Eテストで正常系・異常系が確認できる

---

## Phase 4: User Story 2 [P2] - Validation & Error Handling

**ゴール**: Skillが存在しない/無効な場合のバリデーションフィードバック

**依存**: User Story 1 (Phase 3) 完了後に実装可能

**Independent Test**: AI生成で存在しないSkillを参照 → バリデーションがvalidationStatus='missing'を設定 → ユーザーがwarningを視認できることを手動で確認

### 4.1 エラー表示検証

- [ ] T032 [US2] SkillNodeコンポーネントのvalidationインジケーター動作確認: validationStatus='missing'時にオレンジwarningアイコン、'invalid'時に赤errorアイコンが表示されることをブラウザで確認(既存実装の再利用前提)
- [ ] T033 [US2] PropertyPanelでのエラーメッセージ表示確認: "Skill file not found at {skillPath} - please select another Skill or remove this node" が表示されることを確認
- [ ] T034 [US2] 手動E2Eテスト: malformed YAML frontmatterを持つSkillファイル(`~/.claude/skills/invalid-skill/SKILL.md`)作成 → 生成 → validationStatus='invalid'、詳細エラーがProperty panelに表示されることを確認

### 4.2 エラーメッセージ国際化

**ファイル**: `src/extension/i18n/` または `src/webview/src/i18n/`

- [ ] T035 [P] [US2] エラーメッセージキーを各言語ファイル(en, ja, ko, zh-CN, zh-TW)に追加: "skill.file.not.found", "skill.invalid.yaml", "skill.name.invalid"など(contracts/参照)
- [ ] T036 [P] [US2] バリデーションエラー表示時に国際化されたメッセージが使用されることをブラウザで確認

**User Story 2 完了基準**:
- validationStatus='missing'/'invalid'のビジュアル表示が機能する
- Property panelに明確なエラーメッセージと対処方法が表示される
- 全言語でエラーメッセージが翻訳されている

---

## Phase 5: User Story 3 [P3] - User Skill Selection (オプション)

**ゴール**: ユーザーがAI生成時に使用するSkillを手動選択できる(上級機能)

**依存**: User Story 1 (Phase 3) 完了後に実装可能。User Story 2と並行実装可能。

**Independent Test**: AI Generation Dialog開く → "Available Skills"セクション展開 → チェックボックスリスト表示 → 特定Skillのチェック外す → 生成 → 外したSkillが除外されることを手動で確認

### 5.1 UI拡張

**ファイル**: `src/webview/src/components/dialogs/AiGenerationDialog.tsx` [MODIFY]

- [ ] T037 [US3] DialogStateに `selectedSkillNames: Set<string>` を追加、初期値は全Skillsを含む
- [ ] T038 [US3] "Available Skills"折りたたみセクション実装: クリックで展開/折りたたみ可能
- [ ] T039 [US3] Skill checkboxesリスト実装: availableSkills配列をmap、各Skillにcheckbox、デフォルト全チェック
- [ ] T040 [US3] Checkbox onChange実装: チェック/チェック外しでselectedSkillNamesを更新
- [ ] T041 [US3] アクセシビリティ対応: checkboxesにaria-label追加("Select {skillName} for AI generation")

### 5.2 メッセージ型拡張

**ファイル**: `src/shared/types/messages.ts` [MODIFY]

- [ ] T042 [US3] `GenerateWorkflowPayload`に `selectedSkillNames?: string[]` オプションフィールドを追加
- [ ] T043 [US3] Webview側: Generate button click時に `selectedSkillNames` をpayloadに含めてExtensionに送信

### 5.3 Extension側フィルタリング

**ファイル**: `src/extension/commands/ai-generation.ts` [MODIFY]

- [ ] T044 [US3] `handleGenerateWorkflow()` 修正: payloadに `selectedSkillNames` が含まれる場合、filteredSkillsをさらにフィルタ(selectedに含まれるもののみ)
- [ ] T045 [US3] フィルタ後のSkill数が0件の場合の処理: promptにSkillsセクションを含めない、またはwarningログ出力

### 5.4 手動E2Eテスト

- [ ] T046 [US3] Dialog開く → "Available Skills"セクション展開 → checkboxが全てチェック状態で初期化されることを確認
- [ ] T047 [US3] Skill "legacy-processor" のチェック外す → Generate実行 → 生成ワークフローにlegacy-processorが含まれないことを確認
- [ ] T048 [US3] 複数Skillを選択/解除 → 生成後、使用されたSkillリストがDialogに表示されることを確認

**User Story 3 完了基準**:
- UI上でSkill selection checkboxesが表示・操作可能
- 選択されたSkillのみがAI promptに含まれる
- 手動E2Eテストで選択機能が確認できる

---

## Phase 6: Polish & Cross-Cutting Concerns

**ゴール**: 仕上げとドキュメント更新

### 6.1 ドキュメント更新

- [x] T049 [P] CLAUDE.mdにAI Skill Generation機能のセクション追加: 主要ファイル、メッセージフロー、エラーハンドリング(既存001-ai-workflow-generationセクション参照)
- [x] T050 [P] README.md更新: AI Skill Generation機能の使い方、制限事項(20 Skills limit)、パフォーマンス特性を記載

### 6.2 パフォーマンス最適化

- [x] T051 Skillスキャン並列化確認: `Promise.all([scanPersonalSkills(), scanProjectSkills()])` が正しく動作することをログで確認
- [ ] T052 Keyword matching最適化: tokenize処理をSkillスキャン時に事前計算(pre-tokenization)し、relevance計算時の処理時間を短縮

### 6.3 エラーハンドリング強化

- [x] T053 ログ出力拡張: `log('DEBUG', ...)` でSkill scan結果、filtering結果、prompt token数、実行時間を記録(ai-generation.ts)
- [ ] T054 タイムアウトエラー処理確認: AI生成が90秒を超える場合、適切なタイムアウトエラーメッセージが表示されることを確認

### 6.4 最終手動E2Eテスト

- [ ] T055 リント実行: `npm run lint` でコード品質チェック、warningゼロを確認
- [ ] T056 全User Story手動E2Eテスト: US1〜US3の各シナリオを実行し、すべての受け入れ基準を満たすことを確認
- [ ] T057 パフォーマンス手動確認: VSCode Output Channelのログから、scan+filter+prompt構築時間を確認(目標<700ms)
- [ ] T058 100+ Skills環境テスト: 多数のモックSkillファイルを作成し、AI生成が90秒以内に完了することを確認

---

## 実装戦略

### MVP First アプローチ

**MVP = Phase 1 + Phase 2 + Phase 3 (T001-T031)**

最小限の価値提供機能:
- AIが関連するSkillノードを自動生成
- skillPath自動解決
- 基本的なバリデーション

**理由**: User Story 1だけで80%の価値を提供。US2(エラー表示)とUS3(手動選択)は段階的に追加可能。

### Incremental Delivery

1. **Week 1**: Phase 1-2完了(基盤機能)
2. **Week 2**: Phase 3完了(US1, MVP完成)
3. **Week 3**: Phase 4完了(US2)
4. **Week 4**: Phase 5完了(US3, オプション)
5. **Week 5**: Phase 6完了(Polish)

### 並列実装機会

**Phase 2内**:
- T006-T007 (Skillスキャン検証) と T008-T010 (Keyword matching) は並列実装可能
- T011-T013 (フィルタリング) はT008-T010完了後に開始

**Phase 3内**:
- 3.1 Prompt拡張 と 3.3 バリデーション拡張 は並列実装可能
- 3.2 SkillPath解決 はprompt拡張完了後に開始

**Phase 4 vs Phase 5**:
- US2とUS3は独立しているため、Phase 3完了後に並列実装可能

---

## タスクサマリー

**総タスク数**: 58タスク

**User Story別タスク数**:
- Setup (Phase 1): 5タスク
- Foundational (Phase 2): 8タスク
- User Story 1 [P1] (Phase 3): 18タスク
- User Story 2 [P2] (Phase 4): 5タスク
- User Story 3 [P3] (Phase 5): 12タスク
- Polish (Phase 6): 10タスク

**並列実行可能タスク**: 7タスク ([P]マーカー付き)

**MVP スコープ**: T001-T031 (31タスク) でコア機能完成

**推奨実装順序**: Phase 1 → Phase 2 → Phase 3 (MVP) → Phase 4 → Phase 5 (optional) → Phase 6

---

## 成功基準チェックリスト

### User Story 1 [P1]
- [ ] AI correctly identifies and includes relevant Skills in 80%+ of workflows (手動テストで複数シナリオ実施)
- [ ] Generated workflows with Skill nodes pass validation on first attempt 90%+ of time (手動テストで複数回実施)
- [ ] AI generation completes within 90 seconds even with 100+ Skills (手動でログ確認)
- [ ] Skill path resolution succeeds automatically for 95%+ of generated Skill nodes (手動テストで複数Skill確認)

### User Story 2 [P2]
- [ ] Users can identify validation errors on Skill nodes within 5 seconds (ビジュアル表示を目視確認)
- [ ] Clear error messages displayed in Property panel with actionable guidance (手動確認)

### User Story 3 [P3]
- [ ] Skill selection UI functional and accessible (手動操作確認)
- [ ] Only selected Skills included in AI prompt (生成結果を手動確認)

### Cross-Cutting
- [ ] No new library dependencies added (user constraint) (package.jsonで確認)
- [ ] Linter warnings zero (`npm run lint`で確認)
- [ ] Documentation updated (CLAUDE.md, README.md) (目視確認)

---

## 参考リンク

- **仕様書**: [spec.md](spec.md)
- **実装計画**: [plan.md](plan.md)
- **データモデル**: [data-model.md](data-model.md)
- **APIコントラクト**: [contracts/skill-scanning-api.md](contracts/skill-scanning-api.md)
- **開発ガイド**: [quickstart.md](quickstart.md)
