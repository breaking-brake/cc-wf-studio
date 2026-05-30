# Research: ノードタイプ拡張

**Feature**: 001-node-types-extension
**Date**: 2025-11-01
**Status**: Complete

## Overview

このドキュメントは、Start/End/Promptの3つの新しいノードタイプを追加するための技術調査結果をまとめたものです。既存のReactFlow + Zustandアーキテクチャを活用し、最小限の変更で実装します。

## 1. ReactFlowカスタムノードパターン

### Decision

ReactFlowの`nodeTypes`プロップを使用してカスタムノードコンポーネントを登録する標準パターンを採用。

### Rationale

- **標準的な拡張方法**: ReactFlowの公式ドキュメントで推奨されているアプローチ
- **型安全性**: TypeScriptの型推論が効く
- **再利用性**: 各ノードタイプは独立したコンポーネントとして実装可能
- **保守性**: 既存のノードと同じパターンで実装できる

### Implementation Pattern

```typescript
import { NodeTypes } from 'reactflow';
import StartNode from './components/nodes/StartNode';
import EndNode from './components/nodes/EndNode';
import PromptNode from './components/nodes/PromptNode';

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  // ...既存のノードタイプ
};

<ReactFlow nodeTypes={nodeTypes} ... />
```

### Alternatives Considered

1. **単一のジェネリックノード + 条件分岐**: 却下理由 - 複雑度が高く、型安全性が低下
2. **Higher-Order Componentパターン**: 却下理由 - オーバーエンジニアリング、この規模では不要

## 2. ノードデータ構造

### Decision

ReactFlowの`Node<T>`型を活用し、各ノードタイプごとに専用の`data`型を定義。

### Rationale

- **型安全性**: 各ノードタイプのdataプロパティが厳密に型付けされる
- **拡張性**: 将来的なプロパティ追加が容易
- **既存コードとの整合性**: 既存のノード構造と一貫性を保つ

### Type Definitions

```typescript
// src/webview/src/types/node-types.ts

export interface StartNodeData {
  label?: string;
}

export interface EndNodeData {
  label?: string;
}

export interface PromptNodeData {
  label?: string;
  prompt: string;
  variables?: Record<string, string>;
}

export type WorkflowNode =
  | Node<StartNodeData, 'start'>
  | Node<EndNodeData, 'end'>
  | Node<PromptNodeData, 'prompt'>
  // ...既存のノードタイプ
```

### Alternatives Considered

1. **単一の汎用Dataインターフェース**: 却下理由 - 型安全性の喪失、プロパティの意図が不明確
2. **classベースの継承**: 却下理由 - Reactの関数コンポーネントと相性が悪い

## 3. 接続制約の実装

### Decision

ReactFlowの`isValidConnection`コールバックを使用して、Start/Endノードの接続制約を実装。

### Rationale

- **宣言的**: コールバック内でロジックを集約できる
- **パフォーマンス**: 接続試行時のみ検証が実行される
- **ユーザビリティ**: 無効な接続を事前に防げる

### Implementation Pattern

```typescript
const isValidConnection = (connection: Connection) => {
  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);

  // Startノードは入力接続を持てない
  if (targetNode?.type === 'start') {
    return false;
  }

  // Endノードは出力接続を持てない
  if (sourceNode?.type === 'end') {
    return false;
  }

  return true;
};

<ReactFlow isValidConnection={isValidConnection} ... />
```

### Alternatives Considered

1. **カスタムHandleコンポーネント**: 却下理由 - 実装が複雑、接続ルールの集約が困難
2. **後処理での接続削除**: 却下理由 - ユーザー体験が悪い(接続後に削除される)

## 4. Promptノードのプレースホルダー変数

### Decision

Mustache形式 (`{{variableName}}`) の変数構文を採用し、正規表現で抽出・置換。

### Rationale

- **シンプル**: 実装が容易で、外部ライブラリ不要
- **直感的**: 多くのテンプレートエンジンで採用されている標準形式
- **拡張性**: 将来的により高度な変数処理を追加可能

### Implementation Pattern

```typescript
const VARIABLE_PATTERN = /\{\{(\w+)\}\}/g;

function extractVariables(promptText: string): string[] {
  const matches = promptText.matchAll(VARIABLE_PATTERN);
  return Array.from(matches, m => m[1]);
}

function substituteVariables(
  promptText: string,
  values: Record<string, string>
): string {
  return promptText.replace(VARIABLE_PATTERN, (match, varName) => {
    return values[varName] ?? match; // 値がない場合はプレースホルダーをそのまま残す
  });
}
```

### Alternatives Considered

1. **Handlebars/Mustache.jsライブラリ**: 却下理由 - 依存関係の追加、シンプルな用途にはオーバースペック
2. **独自の`$varName`構文**: 却下理由 - 標準的ではなく、学習コストが高い

## 5. ワークフローファイルの下位互換性

### Decision

ワークフローファイルにオプショナルな`schemaVersion`フィールドを追加し、バージョンごとの読み込みロジックで対応。

### Rationale

- **段階的移行**: 既存ファイルを即座に変換する必要がない
- **明示的なバージョン管理**: ファイル形式の変更を追跡可能
- **将来の拡張**: 破壊的変更があっても対応可能

### Implementation Pattern

```typescript
interface WorkflowFile {
  schemaVersion?: string; // "1.0.0" | "1.1.0" など
  nodes: WorkflowNode[];
  edges: Edge[];
}

function loadWorkflow(file: WorkflowFile): WorkflowFile {
  const version = file.schemaVersion ?? "1.0.0"; // デフォルトは初期バージョン

  if (version === "1.0.0") {
    // 既存形式: 新規ノードタイプはサポートしないが、読み込み自体は可能
    return file;
  }

  if (version === "1.1.0") {
    // 新形式: Start/End/Promptノードをサポート
    return file;
  }

  throw new Error(`Unsupported schema version: ${version}`);
}
```

### Alternatives Considered

1. **ファイル形式の一括移行**: 却下理由 - 既存ユーザーのワークフローが即座に使えなくなるリスク
2. **バージョンフィールドなし、ノードタイプで判定**: 却下理由 - 将来的な拡張時に判定ロジックが複雑化

## 6. ノードパレットへの追加

### Decision

既存のノードパレットコンポーネントに新規ノードタイプのボタンを追加。ドラッグ&ドロップまたはクリックで配置可能にする。

### Rationale

- **一貫したUX**: 既存のノード追加フローと同じパターン
- **発見可能性**: パレットから視覚的に新ノードを選択できる
- **実装コスト**: 既存のパレットロジックを再利用

### Implementation Note

- アイコン: Lucide React (既存で使用中のアイコンライブラリ) から適切なアイコンを選択
  - Start: `PlayCircle` または `Target`
  - End: `CheckCircle` または `Flag`
  - Prompt: `MessageSquare` または `Sparkles`

### Alternatives Considered

1. **コマンドパレット経由**: 却下理由 - ノード追加の主要UIはビジュアルパレットであるべき
2. **ショートカットキーのみ**: 却下理由 - 発見可能性が低い

## 7. アクセシビリティ

### Decision

各ノードに適切な`aria-label`と`role`属性を付与し、キーボード操作をサポート。

### Rationale

- **Constitutional Requirement**: UX一貫性原則に準拠
- **包括的な設計**: スクリーンリーダーユーザーも使用可能
- **既存パターンの踏襲**: ReactFlowは基本的なa11yをサポート済み

### Implementation Pattern

```typescript
<div
  role="button"
  aria-label={`${type} node: ${data.label || 'Unnamed'}`}
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      // ノード選択処理
    }
  }}
>
  {/* ノードコンテンツ */}
</div>
```

## 8. テスト戦略

### Decision

3層のテストピラミッド構造を採用:

1. **ユニットテスト** (Vitest): 各ノードコンポーネントの描画とプロパティ
2. **統合テスト** (Vitest): ストアとサービスの連携
3. **E2Eテスト** (VSCode Test): エンドツーエンドのワークフロー操作

### Rationale

- **Constitutional Requirement**: テスト駆動開発原則に準拠
- **バランスの取れたカバレッジ**: 迅速なフィードバック + 包括的な検証
- **既存テストインフラの活用**: 新規ツール導入不要

### Test Cases

**ユニットテスト**:
- StartNodeが正しくレンダリングされる
- PromptNodeのプロンプトテキストがdataプロパティに反映される
- EndNodeのスタイルが適用される

**統合テスト**:
- 新規ノードをストアに追加できる
- 接続制約が正しく機能する (Start→他, 他→End)
- ワークフローファイルの保存・読み込みで新ノードタイプが保持される

**E2Eテスト**:
- ノードパレットから新ノードをドラッグ&ドロップできる
- Promptノードのプロンプトを編集できる
- ワークフローを保存して再度開いても新ノードが維持される

## Summary

すべての技術選択は既存のReactFlow + Zustand + TypeScriptアーキテクチャの範囲内で完結します。新規ライブラリの追加は不要であり、実装リスクは最小限です。

**主要な決定事項**:
- ReactFlowの標準カスタムノードパターン
- TypeScriptの型定義による厳密な型安全性
- `isValidConnection`による宣言的な接続制約
- Mustache形式のプレースホルダー変数
- `schemaVersion`による段階的な下位互換性管理
- 3層のテストピラミッド構造
