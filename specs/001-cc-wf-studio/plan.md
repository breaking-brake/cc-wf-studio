# Implementation Plan: CC Workflow Studio

**Branch**: `001-cc-wf-studio` | **Date**: 2025-11-01 | **Spec**: [spec.md](/Users/se_nishikawa/chore/cc-wf-studio/specs/001-cc-wf-studio/spec.md)
**Input**: Feature specification from `/specs/001-cc-wf-studio/spec.md` and user requirement: "webviewはReact with typescript で作成してviteでビルドする形で実装したい"

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

VSCode拡張機能として、Claude CodeのSlashCommandsとSub-Agentを組み合わせたワークフローをビジュアルエディタで設計・管理するツールを開発する。ユーザーはAWS Step FunctionsのようなUIでノードをドラッグ&ドロップし、実行可能な`.claude`設定ファイル（Sub-Agent設定ファイル、SlashCommand）としてエクスポートできる。

**技術的アプローチ**: VSCode拡張機能のWebviewをReact + TypeScript + Viteで実装し、ビジュアルエディタの描画にはReact Flowを採用。ワークフロー定義はJSON形式で`.vscode/workflows/`に保存し、エクスポート時に`.claude/agents/`と`.claude/commands/`へMarkdown形式で出力する。

## Technical Context

**Language/Version**: TypeScript 5.x (VSCode Extension Host), React 18.x (Webview UI)
**Primary Dependencies**:
- Extension: VSCode Extension API 1.80+, Node.js 18+
- Webview: React 18, Vite 5, React Flow (ビジュアルエディタ), **Zustand** (状態管理、React Flow内部でも使用)
**Storage**: ローカルファイルシステム (`.vscode/workflows/*.json`, `.claude/agents/*.md`, `.claude/commands/*.md`)
**Code Quality**:
- Formatter & Linter: **Biome** (ESLint + Prettier代替、Rust製高速ツール)
**Testing**:
- Extension: **@vscode/test-cli + Mocha** (Jest Mocks for VSCode API)
- Webview: Vitest + React Testing Library
- E2E: **WebdriverIO + wdio-vscode-service**
**Target Platform**: VSCode 1.80+ (Windows/Mac/Linux)
**Project Type**: VSCode拡張機能 (Extension Host + Webview構成)
**Performance Goals**:
- UI操作レスポンス < 500ms (NFR-007)
- 50ノードまで滑らかに動作 (NFR-001)
- ワークフロー定義読み込み < 1秒 (10KB以下、NFR-002)
**Constraints**:
- VSCode Extension APIの制約に従う
- Webviewとの通信はpostMessageベース
- ローカル環境のみサポート（NFR-003）
**Scale/Scope**:
- 1ワークフローあたり最大50ノード
- 複数ワークフローの同時管理
- 2種類のノードタイプ（Sub-Agent、AskUserQuestion）

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - TypeScript型定義による自己文書化
  - パブリック関数・クラスにJSDoc/TSDocコメント必須
  - React Componentは単一責任原則に従う
- [x] 命名規則が明確に定義されているか
  - TypeScript: PascalCase (型・Component), camelCase (関数・変数)
  - ファイル名: kebab-case (例: workflow-editor.tsx)
  - 定数: UPPER_SNAKE_CASE
- [x] コードの複雑度が妥当な範囲に収まっているか
  - Cyclomatic complexity < 10 (ESLint complexity rule)
  - Component props は最大5個まで (それ以上はオブジェクト化)

### II. テスト駆動開発
- [x] テストファースト開発プロセスが計画されているか
  - ユーザーストーリー → テストケース → 実装の順序
  - TDD Red-Green-Refactorサイクルを採用
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - **契約テスト**: VSCode Extension API呼び出しのモック検証
  - **統合テスト**: Extension ↔ Webview通信、ファイルI/O
  - **ユニットテスト**: ビジネスロジック (ワークフロー変換、バリデーション)
- [x] テストカバレッジ目標（80%以上）が設定されているか
  - 最低80%、重要ロジック（エクスポート、ファイル生成）は100%

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - VSCode Webview UI Toolkit (Microsoft公式コンポーネント)
  - AWS Step Functions風のビジュアルデザイン
  - ドラッグ&ドロップ、プロパティパネルの標準的配置
- [x] エラーメッセージの明確性が確保されているか
  - FR-014: JSON/YAMLパースエラー時の詳細メッセージ
  - VSCode通知API (`vscode.window.showErrorMessage`)使用
  - 「何が起きたか・どうすれば解決できるか」を明示
- [x] アクセシビリティが考慮されているか
  - キーボード操作: Tab/Enter/Arrowキーでノード選択・接続
  - ARIA属性: ノード・接続に適切なrole/label付与
  - スクリーンリーダー: React Flowのa11y機能活用

### IV. パフォーマンス基準
- [x] API応答時間目標（p95 < 200ms）が検討されているか
  - ローカルファイルI/Oのため該当せず（N/A）
  - ただしUI操作レスポンス < 500ms (NFR-007)
- [x] データベース最適化が計画されているか
  - 該当なし (ファイルベースストレージ)
- [x] フロントエンドロード時間目標が設定されているか（該当する場合）
  - Webview初期化 < 3秒
  - ワークフロー読み込み < 1秒 (10KB以下、NFR-002)
  - React Flow仮想化による50ノードのスムーズ描画

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - Extension Host: コマンド登録、ファイル操作
  - Webview: UI表示、ユーザー操作
  - Domain Logic: ワークフロー定義変換、バリデーション（独立モジュール）
- [x] 設定管理の方針が明確か
  - VSCode Workspace設定で保存先ディレクトリ指定可能
  - ハードコードを避け、定数ファイル (`constants.ts`) に集約
- [x] バージョニング戦略が定義されているか
  - Semantic Versioning (MAJOR.MINOR.PATCH)
  - VSCode拡張機能のpackage.jsonでバージョン管理

**違反の正当化**: なし（すべての原則を満たす設計）

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# VSCode Extension + Webview構成
src/
├── extension/                   # Extension Host側コード
│   ├── extension.ts             # エントリーポイント
│   ├── commands/                # VSCodeコマンド登録
│   │   ├── open-editor.ts
│   │   ├── export-workflow.ts
│   │   └── save-workflow.ts
│   ├── services/                # ビジネスロジック
│   │   ├── workflow-service.ts  # ワークフロー定義の保存・読み込み
│   │   ├── export-service.ts    # .claude形式へのエクスポート
│   │   └── file-service.ts      # ファイルI/O
│   └── models/                  # 型定義
│       ├── workflow.ts          # Workflow, Node, Connection型
│       └── claude-config.ts     # Sub-Agent設定、SlashCommand型
│
├── webview/                     # Webview UI側コード (React + Vite)
│   ├── src/
│   │   ├── main.tsx             # エントリーポイント
│   │   ├── components/          # Reactコンポーネント
│   │   │   ├── WorkflowEditor.tsx
│   │   │   ├── NodePalette.tsx
│   │   │   ├── PropertyPanel.tsx
│   │   │   ├── nodes/
│   │   │   │   ├── SubAgentNode.tsx
│   │   │   │   └── AskUserQuestionNode.tsx
│   │   │   └── canvas/
│   │   │       └── ReactFlowCanvas.tsx
│   │   ├── services/            # Webview側サービス
│   │   │   └── vscode-bridge.ts # Extension ↔ Webview通信
│   │   └── types/               # Webview型定義
│   │       └── workflow.ts
│   ├── vite.config.ts
│   └── package.json
│
├── shared/                      # Extension/Webview共通コード
│   └── types/
│       └── workflow-definition.ts
│
tests/
├── extension/
│   ├── unit/                    # Extension側ユニットテスト
│   ├── integration/             # Extension ↔ ファイルシステム
│   └── contract/                # VSCode API契約テスト
│
└── webview/
    ├── unit/                    # Webview Componentテスト
    └── integration/             # React Flow統合テスト
```

**Structure Decision**: VSCode拡張機能の標準構成に従い、Extension HostとWebviewを分離。WebviewはViteで独立ビルドし、Extension Hostから読み込む構成。共通型定義は`shared/`で管理し、両側で参照する。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
