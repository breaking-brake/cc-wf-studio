# Implementation Plan: AI-Assisted Workflow Generation

**Branch**: `001-ai-workflow-generation` | **Date**: 2025-11-06 | **Spec**: [spec.md](spec.md)
**Input**: Feature specification from `/specs/001-ai-workflow-generation/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

This feature enables users to generate complete workflow definitions from natural language descriptions using AI assistance. The system provides a workflow schema documentation file that serves as context for Claude Code CLI, which generates valid workflow JSON when invoked with user descriptions. Users interact through a dialog UI where they enter workflow descriptions, and the system validates and adds the generated workflow to the canvas.

## Technical Context

**Language/Version**: TypeScript 5.3 (Extension Host & Webview shared types), React 18.2 (Webview UI)
**Primary Dependencies**:
- Extension: VSCode Extension API, Node.js child_process (for CLI execution)
- Webview: React, ReactFlow, Zustand (state management)
- Testing: Vitest (Webview unit tests), @vscode/test-electron (extension integration tests)

**Storage**: File system (workflow schema JSON in resources/, generated workflows in canvas state)
**Testing**: Vitest (Webview component tests), @vscode/test-electron (extension E2E tests)
**Target Platform**: VSCode Extension (runs on Windows, macOS, Linux where VSCode is supported)
**Project Type**: VSCode Extension with Webview UI (dual environment: Node.js Extension Host + Browser-like Webview)
**Performance Goals**:
- AI generation completes within 60 seconds (primarily dependent on Claude Code CLI)
- Schema file loads in <100ms
- UI remains responsive during generation (non-blocking)

**Constraints**:
- CLI execution timeout: 30 seconds
- Schema documentation size: <10KB (to fit in AI context window)
- Generated workflow validation: must complete in <500ms
- User description length: 2000 characters max

**Scale/Scope**:
- Single workflow schema documentation file
- 7 node types to document (Start, End, Prompt, SubAgent, AskUserQuestion, IfElse, Switch)
- ~50 validation rules to encode
- 3+ example workflows in documentation

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - スキーマドキュメントはJSONSchemaまたは類似の標準形式で記述
  - 各ノードタイプには明確なドキュメントコメントを付与
  - CLI実行ロジックは専用のServiceクラスに分離
- [x] 命名規則が明確に定義されているか
  - `AiGenerationDialog`, `WorkflowSchemaLoader`, `ClaudeCodeService` など目的明確な命名
- [x] コードの複雑度が妥当な範囲に収まっているか
  - UI、CLI実行、バリデーションの責務を分離し、各モジュールは単一責任

### II. テスト駆動開発
- [x] テストファースト開発プロセスが計画されているか
  - 各機能要件に対応するテストケースを先に定義
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - **契約テスト**: スキーマドキュメントの形式検証、Claude Code CLI I/O検証
  - **統合テスト**: Extension ↔ Webview メッセージング、CLI実行 → 結果パース → バリデーション
  - **ユニットテスト**: ワークフローバリデーションロジック、スキーマローダー、プロンプト生成
- [x] テストカバレッジ目標（80%以上）が設定されているか
  - 新規コードは80%以上、重要なバリデーションロジックは100%目標

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - 既存のダイアログパターン（Save/Export）と同様のモーダルUI
  - 既存のErrorNotificationコンポーネントを再利用
- [x] エラーメッセージの明確性が確保されているか
  - FR-014: 各エラータイプ（サービス不可、パースエラー、バリデーションエラー、タイムアウト）に対応する明確なメッセージ
- [x] アクセシビリティが考慮されているか
  - ダイアログはキーボード操作可能（Enter=送信、Esc=キャンセル）
  - ローディング状態はaria-liveで通知

### IV. パフォーマンス基準
- [x] API応答時間目標（p95 < 200ms）が検討されているか
  - Extension側のCLI実行は非同期で実行し、Webview UIをブロックしない
  - スキーマファイル読み込みは起動時に一度だけ実行（キャッシュ）
- [x] データベース最適化が計画されているか
  - N/A（データベース不使用）
- [x] フロントエンドロード時間目標が設定されているか（該当する場合）
  - スキーマファイル読み込み<100ms、UI描画は既存コンポーネント再利用により高速化

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - Extension: ClaudeCodeService（CLI実行）、SchemaLoaderService（スキーマ読み込み）
  - Webview: AiGenerationDialog（UI）、aiGenerationService（通信）
  - Shared: AiGenerationRequest/Response型定義
- [x] 設定管理の方針が明確か
  - スキーマファイルパスは `resources/workflow-schema.json` に固定（設定不要）
  - タイムアウト値は定数として定義（将来的に設定可能にする余地あり）
- [x] バージョニング戦略が定義されているか
  - スキーマドキュメントには `schemaVersion` フィールドを含め、将来の拡張に対応

**違反の正当化**: 違反なし。すべての原則に準拠。

## Project Structure

### Documentation (this feature)

```text
specs/001-ai-workflow-generation/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   └── ai-generation-messages.md  # Extension ↔ Webview message contracts
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# VSCode Extension with Webview UI structure (existing)
src/
├── extension/           # Extension Host (Node.js environment)
│   ├── commands/
│   │   └── ai-generation.ts          # NEW: Handle AI generation requests
│   ├── services/
│   │   ├── claude-code-service.ts    # NEW: Execute Claude Code CLI
│   │   └── schema-loader-service.ts  # NEW: Load workflow schema JSON
│   └── extension.ts     # Register AI generation command
│
├── webview/             # Webview UI (Browser-like environment)
│   └── src/
│       ├── components/
│       │   ├── dialogs/
│       │   │   └── AiGenerationDialog.tsx  # NEW: AI generation UI dialog
│       │   └── Toolbar.tsx                # UPDATE: Add "Generate with AI" button
│       ├── services/
│       │   └── ai-generation-service.ts   # NEW: Webview ↔ Extension bridge for AI
│       └── stores/
│           └── workflow-store.ts          # UPDATE: Add AI-generated workflows to canvas
│
└── shared/              # Shared types between Extension & Webview
    └── types/
        ├── workflow-definition.ts   # EXISTING: Workflow types (reused for validation)
        └── messages.ts              # UPDATE: Add AI generation message types

resources/               # Static resources bundled with extension
└── workflow-schema.json # NEW: Workflow schema documentation for AI context

tests/
├── extension/           # Extension integration tests
│   └── ai-generation.test.ts         # NEW: Test CLI execution & validation
└── webview/             # Webview component tests
    └── components/
        └── AiGenerationDialog.test.tsx  # NEW: Test UI interactions
```

**Structure Decision**: This is a VSCode Extension project with a dual-environment architecture:
- **Extension Host** (Node.js): Handles file I/O, CLI execution, and VSCode API interactions
- **Webview** (Browser-like): Provides React-based UI with ReactFlow canvas
- **Shared**: TypeScript types shared between both environments

The AI generation feature integrates into this existing structure by:
1. Adding new services in Extension Host for CLI execution and schema loading
2. Adding a new dialog component in Webview for user input
3. Extending the existing message-passing infrastructure for Extension ↔ Webview communication
4. Creating a static JSON schema file in resources/ that gets bundled with the extension

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

**No violations recorded.** All Constitution principles are satisfied.
