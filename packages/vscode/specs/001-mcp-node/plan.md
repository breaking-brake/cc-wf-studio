# Implementation Plan: MCP Node Integration

**Branch**: `001-mcp-node` | **Date**: 2025-11-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-mcp-node/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement MCP (Model Context Protocol) Node integration for the workflow editor, allowing users to browse available MCP servers and tools from Claude Code configuration, select tools to add to the canvas, configure tool parameters through a visual property panel, and integrate MCP nodes into workflows alongside existing node types. This feature follows the established Skill node implementation pattern, utilizing Claude Code CLI for MCP server discovery and tool enumeration.

## Technical Context

**Language/Version**: TypeScript 5.3.0 (VSCode Extension Host), TypeScript/React 18.2 (Webview UI)
**Primary Dependencies**: VSCode Extension API 1.80.0+, React 18.2, React Flow (visual canvas), Zustand (state management), child_process (Claude Code CLI execution)
**Storage**: Workflow JSON files in `.vscode/workflows/` directory, Claude Code MCP configuration (user/project/enterprise scopes)
**Testing**: Vitest (Webview unit tests), VSCode Test CLI (extension integration tests)
**Target Platform**: VSCode Extension (cross-platform: Windows, macOS, Linux)
**Project Type**: VSCode Extension (dual architecture: Extension Host + Webview)
**Performance Goals**: MCP browser dialog opens in <500ms, parameter panel renders in <200ms, workflow save/load with MCP nodes <1s
**Constraints**: <200ms UI responsiveness, Claude Code CLI availability required, MCP server connection timeout <5s, workflow file size <1MB
**Scale/Scope**: Support 10+ MCP servers, 100+ tools per server, 50+ MCP nodes per workflow, parameter schemas up to 50 fields

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - TypeScript型定義による自己文書化
  - 各モジュール（mcp-service.ts, mcp-browser-dialog.tsx, mcp-node-component.tsx）に明確な責務定義
  - JSDoc形式のドキュメントコメント必須
- [x] 命名規則が明確に定義されているか
  - インターフェース: McpNodeData, McpServerReference, McpToolReference
  - サービス: browseMcpServers(), getMcpTools(), validateMcpNode()
  - コンポーネント: McpBrowserDialog, McpNodeComponent, McpPropertyPanel
- [x] コードの複雑度が妥当な範囲に収まっているか
  - Skill nodeパターンの再利用により新規複雑性を最小化
  - サービス層とUI層の明確な分離

### II. テスト駆動開発
- [x] テストファースト開発プロセスが計画されているか
  - Red-Green-Refactorサイクル採用
  - 各ユーザーストーリーに対応するテストケースを先行作成
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - **契約テスト**: MCP CLI出力フォーマット、ワークフローJSON schema
  - **統合テスト**: Extension Host ⇔ Webview メッセージング、MCP CLI実行フロー
  - **ユニットテスト**: mcp-service.ts関数、React component rendering、parameter validation
- [x] テストカバレッジ目標（80%以上）が設定されているか
  - 目標: 全体80%、重要ビジネスロジック（MCP server scanning, parameter validation）100%

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - Skill nodeと同一のブラウザダイアログパターン
  - 既存プロパティパネルと統一されたレイアウト
  - VSCode標準配色・アイコン使用
- [x] エラーメッセージの明確性が確保されているか
  - エラーコード体系: MCP_SERVER_UNAVAILABLE, MCP_TOOL_NOT_FOUND, MCP_INVALID_PARAMETERS
  - 3要素メッセージ: 何が起きたか・なぜ起きたか・どうすれば解決できるか
  - 例: "MCP server 'aws-knowledge' is unavailable (connection timeout). Check if the server is running with 'claude mcp list'."
- [x] アクセシビリティが考慮されているか
  - キーボードナビゲーション対応（Tab, Enter, Escape）
  - ARIA属性設定（role, aria-label, aria-describedby）
  - フォーカス管理とスクリーンリーダー対応

### IV. パフォーマンス基準
- [x] API応答時間目標（p95 < 200ms）が検討されているか
  - Claude Code CLI実行: タイムアウト5秒、エラー時即座にフォールバック
  - Parameter panel rendering: <200ms
  - MCP browser dialog open: <500ms
- [x] データベース最適化が計画されているか
  - N/A（ファイルベースストレージのみ）
- [x] フロントエンドロード時間目標が設定されているか（該当する場合）
  - Webview初期ロード: 既存ワークフローエディタと同等（<3秒）
  - MCP node rendering: React Flow最適化により60fps維持

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - サービス層（mcp-service.ts）: CLI実行・データ取得のみ
  - UI層（dialogs/, components/）: 表示・ユーザー入力のみ
  - 型定義（workflow-definition.ts）: 共通データモデル
- [x] 設定管理の方針が明確か
  - MCP設定: Claude Code CLIに委譲（ユーザー/プロジェクト/エンタープライズスコープ）
  - ワークフロー設定: 既存の`.vscode/workflows/*.json`形式を踏襲
- [x] バージョニング戦略が定義されているか
  - Semantic versioning準拠（現在2.1.0 → 2.2.0でMCP node追加）
  - スキーマバージョン: workflow schemaVersion 1.1.0 → 1.2.0

**違反の正当化**: なし（すべての原則に準拠）

## Project Structure

### Documentation (this feature)

```text
specs/001-mcp-node/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── mcp-cli.schema.json        # Claude Code CLI output format
│   └── workflow-mcp-node.schema.json  # MCP node JSON schema
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── shared/
│   └── types/
│       ├── workflow-definition.ts  # [EXTEND] Add McpNode type
│       └── messages.ts             # [EXTEND] Add MCP-related messages
├── extension/                      # Extension Host (Node.js)
│   ├── services/
│   │   ├── mcp-service.ts          # [NEW] MCP server/tool scanning via CLI
│   │   └── claude-code-service.ts  # [EXTEND] Add MCP CLI commands
│   ├── commands/
│   │   └── message-handler.ts      # [EXTEND] Handle MCP-related messages
│   └── utils/
│       └── validate-workflow.ts    # [EXTEND] Add MCP node validation
└── webview/                        # Webview UI (React)
    └── src/
        ├── components/
        │   ├── dialogs/
        │   │   └── McpBrowserDialog.tsx    # [NEW] MCP tool browser
        │   ├── nodes/
        │   │   └── McpNodeComponent.tsx    # [NEW] MCP node canvas component
        │   └── properties/
        │       └── McpPropertyPanel.tsx    # [NEW] MCP parameter editor
        ├── services/
        │   └── mcp-browser-service.ts      # [NEW] Webview-Extension messaging
        └── stores/
            └── workflow-store.ts           # [EXTEND] Handle MCP nodes

tests/
├── extension/
│   ├── unit/
│   │   └── mcp-service.test.ts             # [NEW] Unit tests for MCP service
│   └── integration/
│       └── mcp-workflow-integration.test.ts # [NEW] Integration tests
└── webview/
    └── src/
        └── components/
            ├── McpBrowserDialog.test.tsx   # [NEW] Component tests
            └── McpNodeComponent.test.tsx   # [NEW] Component tests
```

**Structure Decision**: This project follows the VSCode Extension dual-architecture pattern (Option 2 variant). The codebase is split into:
- **Extension Host** (`src/extension/`): Node.js environment with access to file system and child_process for CLI execution
- **Webview** (`src/webview/`): Sandboxed React environment for UI rendering
- **Shared** (`src/shared/`): Common TypeScript types and message contracts

This structure is already established in the project. MCP node implementation will extend existing services and add new components following the Skill node pattern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
