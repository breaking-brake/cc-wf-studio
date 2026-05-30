# Implementation Plan: ノードタイプ拡張

**Branch**: `001-node-types-extension` | **Date**: 2025-11-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-node-types-extension/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

ワークフローエディタに3つの新しいノードタイプ(Start, End, Prompt)を追加する。これにより、ワークフローの開始点・終了点を明示的に定義し、AIエージェント用のプロンプトを直感的に構築できるようになる。既存のReactFlowベースのアーキテクチャを活用し、下位互換性を維持しながら実装する。

## Technical Context

**Language/Version**: TypeScript 5.3 (VSCode Extension Host), React 18.2 (Webview UI)
**Primary Dependencies**:
- VSCode Extension API (^1.80.0)
- React 18.2 + React DOM
- ReactFlow 11.10 (ノードベースUI)
- Zustand 4.4 (状態管理)
- Vite 5.0 (Webviewビルド)
- Vitest 1.0 (テスト)

**Storage**: ローカルファイルシステム (`.vscode/workflows/*.json`)
**Testing**: Vitest (ユニット・統合), VSCode Test (E2E)
**Target Platform**: VSCode Extension (デスクトップ: Windows, macOS, Linux)
**Project Type**: VSCode Extension (Extension Host + Webview UI)
**Performance Goals**:
- エディタ起動時間: 500ms以内
- ノード追加レスポンス: 100ms以内
- ワークフローファイル保存: 200ms以内

**Constraints**:
- VSCode Webview APIの制約内で動作
- 既存ワークフローファイルとの100%下位互換性
- ReactFlowの既存アーキテクチャを維持

**Scale/Scope**:
- 想定ノード数: 1ワークフローあたり50ノード程度
- 新規ノードタイプ: 3種類 (Start, End, Prompt)
- 影響範囲: Webview UIコンポーネント、型定義、ストアロジック

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**参照**: `.specify/memory/constitution.md` の5つの原則に基づいて以下を確認する

### I. コード品質原則
- [x] 可読性とドキュメント化の要件が満たされているか
  - 新規ノードコンポーネントには適切なTSDocコメントを付与
  - 型定義は明確で自己文書化されている
- [x] 命名規則が明確に定義されているか
  - ノードタイプ: `StartNode`, `EndNode`, `PromptNode`
  - コンポーネント: `NodeType + Component` (例: `StartNodeComponent`)
- [x] コードの複雑度が妥当な範囲に収まっているか
  - 各ノードコンポーネントは単一責任原則に従う
  - ReactFlowの既存パターンを踏襲し、複雑度を最小化

### II. テスト駆動開発
- [x] テストファースト開発プロセスが計画されているか
  - ユニットテスト: 各ノードコンポーネントの描画とプロップ
  - 統合テスト: ノード追加・削除・接続の動作
  - 契約テスト: ワークフローファイルの保存・読み込み形式
- [x] 契約テスト・統合テスト・ユニットテストの計画があるか
  - Vitest: ユニット・統合テスト
  - VSCode Test: E2Eシナリオ
- [x] テストカバレッジ目標(80%以上)が設定されているか
  - 新規コードのカバレッジ目標: 85%以上

### III. UX一貫性
- [x] 一貫したUIパターンが定義されているか
  - 既存ノードのデザインパターンを踏襲
  - ReactFlowの標準UIコンポーネントを使用
- [x] エラーメッセージの明確性が確保されているか
  - Promptノードの空プロンプト検証
  - 接続制約違反時の明確なメッセージ
- [x] アクセシビリティが考慮されているか
  - ノードはキーボード操作可能
  - ARIAラベルで各ノードタイプを識別

### IV. パフォーマンス基準
- [x] API応答時間目標(p95 < 200ms)が検討されているか
  - ファイル保存: 200ms以内
  - ノード追加: 100ms以内
- [x] データベース最適化が計画されているか
  - N/A (ローカルファイルシステムのみ使用)
- [x] フロントエンドロード時間目標が設定されているか(該当する場合)
  - エディタ起動時間: 500ms以内
  - 新ノードタイプ追加による遅延なし

### V. 保守性と拡張性
- [x] モジュール化・疎結合設計が採用されているか
  - 各ノードタイプは独立したコンポーネント
  - 型定義は共通インターフェースを継承
- [x] 設定管理の方針が明確か
  - ワークフローファイル形式はJSON (既存と同じ)
  - 設定は各ノードのdataプロパティに格納
- [x] バージョニング戦略が定義されているか
  - ワークフローファイルにschemaVersionフィールドを追加
  - 下位互換性を維持しながら段階的に拡張

**違反の正当化**: 違反なし - すべての原則に準拠

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
src/
├── extension/                  # VSCode Extension Host
│   └── extension.ts           # 主要なエクステンションエントリポイント
├── webview/                   # React Webview UI
│   ├── src/
│   │   ├── components/
│   │   │   └── nodes/        # 新規ノードコンポーネント追加先
│   │   │       ├── StartNode.tsx      # ← 新規
│   │   │       ├── EndNode.tsx        # ← 新規
│   │   │       └── PromptNode.tsx     # ← 新規
│   │   ├── stores/
│   │   │   └── workflow-store.ts     # ノード管理ロジック (既存)
│   │   ├── services/
│   │   │   ├── workflow-service.ts    # ワークフローファイルI/O (既存)
│   │   │   └── vscode-bridge.ts       # VSCode通信 (既存)
│   │   └── types/            # TypeScript型定義
│   │       └── node-types.ts          # ← 新規/更新
│   └── tests/
│       ├── unit/
│       │   └── nodes/        # ノードコンポーネントテスト
│       │       ├── StartNode.test.tsx  # ← 新規
│       │       ├── EndNode.test.tsx    # ← 新規
│       │       └── PromptNode.test.tsx # ← 新規
│       └── integration/
│           └── workflow.test.ts        # ワークフロー統合テスト
└── shared/                    # Extension ⇔ Webview共通型定義
    └── types.ts               # メッセージ型など

tests/                         # E2Eテスト (VSCode Test)
└── e2e/
    └── node-types.test.ts     # ← 新規
```

**Structure Decision**: VSCode Extension形式 (Extension Host + Webview UI)を採用。既存のReactFlow + Zustandアーキテクチャを維持し、`src/webview/src/components/nodes/`配下に新規ノードコンポーネントを追加する。

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |
