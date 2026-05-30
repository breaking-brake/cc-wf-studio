# Implementation Plan: MCP Node Natural Language Mode

**Branch**: `001-mcp-natural-language-mode` | **Date**: 2025-11-16 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-mcp-natural-language-mode/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Extend the existing MCP node implementation to support three configuration modes (Detailed, Natural Language Parameter, Full Natural Language) that adapt to different user skill levels. The feature allows users to configure MCP tool nodes using natural language descriptions instead of explicit parameter values, while maintaining backwards compatibility with the current detailed configuration mode. Export functionality will be enhanced to include mode metadata, parameter schemas, and available tools list to enable Claude Code to interpret user intent during slash command execution.

## Technical Context

**Language/Version**: TypeScript 5.3.0 (VSCode Extension Host), TypeScript/React 18.2 (Webview UI)
**Primary Dependencies**: VSCode Extension API 1.80.0+, React 18.2, React Flow (visual canvas), Zustand (state management), existing MCP SDK client services
**Storage**: Workflow JSON files in `.vscode/workflows/` directory (extends existing McpNodeData structure)
**Testing**: Vitest (Webview unit tests), VSCode Test CLI (extension integration tests)
**Target Platform**: VSCode Extension (cross-platform: Windows, macOS, Linux)
**Project Type**: VSCode Extension (dual architecture: Extension Host + Webview)
**Performance Goals**: Mode selection UI renders in <200ms, natural language field validation <100ms, export with mode metadata <1s
**Constraints**: <200ms UI responsiveness, backwards compatibility with existing MCP nodes (Detailed Mode), natural language description storage <10KB per node
**Scale/Scope**: Support all existing MCP server/tool combinations, 3 configuration modes, 50+ MCP nodes per workflow across different modes

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - TypeScript型定義による自己文書化（McpNodeMode, NaturalLanguageConfig等）
  - 各モジュールに明確な責務定義（mode-selector.tsx, export-service.ts拡張）
  - JSDoc形式のドキュメントコメント必須
- [x] 命名規則が明確に定義されているか
  - 型定義: McpNodeMode ('detailed' | 'naturalLanguageParam' | 'fullNaturalLanguage')
  - インターフェース: NaturalLanguageParamConfig, FullNaturalLanguageConfig, ModeExportMetadata
  - コンポーネント: ModeSelectionStep, NaturalLanguageInputField, ModeIndicatorBadge
- [x] コードの複雑度が妥当な範囲に収まっているか
  - 既存McpNodeEditDialogの段階的拡張（モード選択ステップ追加のみ）
  - エクスポートサービスの責務分離（モード別フォーマッター関数）

### II. テスト駆動開発
- [x] テストファースト開発プロセスが計画されているか
  - Red-Green-Refactorサイクル採用
  - 各ユーザーストーリー（P1-P3 + Export）に対応するテストケースを先行作成
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - **契約テスト**: エクスポートフォーマット（モード別メタデータ構造）、ワークフローJSON schema拡張
  - **統合テスト**: モード切り替え時のデータ保存、エクスポート→再読み込みの完全性
  - **ユニットテスト**: 自然言語バリデーション、モード別エクスポート関数、UI component rendering
- [x] テストカバレッジ目標（80%以上）が設定されているか
  - 目標: 全体80%、重要ロジック（モード切り替え、自然言語検証、エクスポートメタデータ生成）100%

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - 既存MCP node dialogs pattern踏襲（多段階wizard形式）
  - 既存VSCode標準配色・アイコン使用
  - Material Design-inspired card layoutでモード選択表示
- [x] エラーメッセージの明確性が確保されているか
  - エラーコード体系拡張: MCP_NL_DESC_TOO_SHORT, MCP_MODE_SWITCH_DATA_LOSS_WARNING
  - 3要素メッセージ: 何が起きたか・なぜ起きたか・どうすれば解決できるか
  - 例: "Natural language description is too short (5 characters). Please provide at least 10 characters to help Claude Code understand your intent."
- [x] アクセシビリティが考慮されているか
  - キーボードナビゲーション対応（Tab, Enter, Escape）
  - ARIA属性設定（role="radiogroup" for mode selection, aria-describedby for help text）
  - フォーカス管理とスクリーンリーダー対応

### IV. パフォーマンス基準
- [x] API応答時間目標（p95 < 200ms）が検討されているか
  - Mode selection rendering: <200ms
  - Natural language validation: <100ms（クライアントサイド、debounce 300ms）
  - Export with metadata: <1s
- [x] データベース最適化が計画されているか
  - N/A（ファイルベースストレージのみ）
- [x] フロントエンドロード時間目標が設定されているか（該当する場合）
  - Dialog open: 既存MCP node dialogと同等（<500ms）
  - Mode-specific UI rendering: <200ms

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - Mode selection: 独立したReactコンポーネント（ModeSelectionStep.tsx）
  - Export formatters: モード別に分離された関数（formatDetailedMode, formatNaturalLanguageParamMode, formatFullNaturalLanguageMode）
  - 型定義: 共通データモデル（mcp-node.ts拡張）
- [x] 設定管理の方針が明確か
  - モード設定: McpNodeDataに追加フィールド（mode, naturalLanguageConfig）
  - 既存設定との後方互換性維持（mode未指定時はdefault: 'detailed'）
- [x] バージョニング戦略が定義されているか
  - Semantic versioning準拠（現在2.4.0 → 2.5.0で自然言語モード追加）
  - ワークフロースキーマバージョン: 1.2.0 → 1.3.0（McpNodeData拡張）

**違反の正当化**: なし（すべての原則に準拠）

## Project Structure

### Documentation (this feature)

```text
specs/001-mcp-natural-language-mode/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── mcp-node-extended.schema.json  # Extended McpNodeData with mode fields
│   └── export-metadata.schema.json    # Mode-specific export metadata format
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── shared/
│   └── types/
│       ├── mcp-node.ts              # [EXTEND] Add mode-related types
│       └── messages.ts              # [EXTEND] Add mode-related messages
├── extension/                       # Extension Host (Node.js)
│   ├── services/
│   │   ├── export-service.ts        # [EXTEND] Add mode-specific export formatters
│   │   └── mcp-cache-service.ts     # [EXTEND] Cache available tools for Full NL Mode
│   └── utils/
│       └── validate-workflow.ts     # [EXTEND] Add mode validation rules
└── webview/                         # Webview UI (React)
    └── src/
        ├── components/
        │   ├── dialogs/
        │   │   └── McpNodeEditDialog.tsx       # [EXTEND] Add mode selection step
        │   ├── mode-selection/
        │   │   ├── ModeSelectionStep.tsx       # [NEW] Mode selection cards
        │   │   ├── NaturalLanguageInputField.tsx # [NEW] NL description input
        │   │   └── ModeIndicatorBadge.tsx      # [NEW] Canvas mode indicator
        │   └── nodes/
        │       └── McpNodeComponent.tsx        # [EXTEND] Show mode indicator
        ├── services/
        │   └── validation/
        │       └── natural-language-validator.ts # [NEW] Validate NL descriptions
        └── stores/
            └── workflow-store.ts               # [EXTEND] Handle mode data

tests/
├── extension/
│   ├── unit/
│   │   ├── export-service-modes.test.ts       # [NEW] Mode export formatters
│   │   └── mode-validation.test.ts            # [NEW] Mode validation logic
│   └── integration/
│       └── mode-switching.test.ts             # [NEW] Mode switch integration
└── webview/
    └── src/
        └── components/
            ├── ModeSelectionStep.test.tsx     # [NEW] Mode selection UI
            └── NaturalLanguageInputField.test.tsx # [NEW] NL input validation
```

**Structure Decision**: VSCode Extension dual architecture (Extension Host + Webview). This feature extends the existing MCP node implementation (specs/001-mcp-node) with minimal new files. Most changes are extensions to existing components (McpNodeEditDialog, export-service, type definitions) with a few new UI components for mode selection and natural language input.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| N/A | No violations | All design decisions comply with constitution principles |

---

## Post-Design Constitution Re-evaluation

**Date**: 2025-11-16
**Phase**: 1 Design Complete

After completing Phase 1 (research, data model, contracts, quickstart), the design has been re-evaluated against the constitution:

### I. コード品質原則
✅ **PASS**: Data model and contracts use clear TypeScript discriminated unions with explicit type definitions. JSDoc comments planned for all public interfaces. Component naming follows React conventions (ModeSelectionStep, NaturalLanguageInputField).

### II. テスト駆動開発
✅ **PASS**: Test strategy defined in research.md. Contract tests for export metadata schemas, integration tests for mode switching, unit tests for validation logic. Coverage targets maintained (80% overall, 100% critical paths).

### III. UX一貫性
✅ **PASS**: Design maintains consistency with existing MCP node patterns. Mode selection wizard follows multi-step pattern. Error messages use 3-element format (what/why/how). Accessibility considerations documented (ARIA attributes, keyboard navigation).

### IV. パフォーマンス基準
✅ **PASS**: Performance goals maintained from initial Constitution Check. Mode selection <200ms, validation <100ms with debouncing, export <1s. No performance regressions identified in design.

### V. 保守性と拡張性
✅ **PASS**: Data model extends existing McpNodeData with optional fields (backwards compatible). Mode-specific logic isolated in separate formatter functions. Contracts defined as JSON schemas for validation. Design supports future mode additions without breaking changes.

**Overall Assessment**: ✅ **ALL PRINCIPLES SATISFIED**

**Key Design Strengths**:
1. Backwards compatibility achieved through optional fields with defaults
2. Type-safe mode handling via discriminated unions
3. Clear separation of concerns (mode selection, validation, export formatting)
4. Comprehensive test coverage strategy
5. User-centered design with progressive disclosure (mode selection first)

**Next Phase**: Proceed to Phase 2 (/speckit.tasks) for task breakdown and implementation planning.
