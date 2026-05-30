# Research Report: CC Workflow Studio

**Date**: 2025-11-01
**Branch**: 001-cc-wf-studio
**Status**: Phase 0 Complete

## Overview

このドキュメントは、Technical Contextセクションで「NEEDS CLARIFICATION」とマークされた項目の調査結果をまとめています。各調査項目について、選定した技術、その理由、代替案の比較を記録します。

## 1. 状態管理ライブラリの選定

### Decision: **Zustand**

### Rationale:
- **React Flow との統合**: React Flow は内部的に Zustand を使用しており、シームレスな統合が可能。同じ状態管理パターンを採用することで互換性の問題を回避できる。
- **最小限のボイラープレート**: バンドルサイズ約3KB、Provider ラッパー不要。VSCode Webview 環境でのバンドルサイズとスタートアップパフォーマンスが重要。
- **VSCode Webview との互換性**: 軽量な設計により制約のある Webview 環境で問題なく動作。VSCode の `acquireVsCodeApi().setState()` と組み合わせた永続化も容易。
- **TypeScript サポート**: 型安全なストアとフックを提供。React 18 との組み合わせで優れた開発者体験。

### Alternatives Considered:

| ライブラリ | 長所 | 短所 | 推奨シーン |
|---------|------|------|------------|
| **Redux Toolkit** | 成熟、広範なミドルウェア、エンタープライズグレード | ~14KB、大量のボイラープレート、Provider必須、MVP には過剰 | 大規模チーム、厳密なパターンが必要、包括的なロギング/デバッグツールが必要な場合 |
| **Jotai** | 細粒度のパフォーマンス、アトミックステートモデル、~4KB | atom 構成の学習曲線、フラットなステート構造（ワークフローノード/エッジ）には複雑 | 複雑な相互依存ステートを持つパフォーマンス重視アプリ、再レンダリング最適化が重要な場合 |
| **Context API** | 組み込み、依存関係ゼロ | メモ化なし、不要な再レンダリングが発生しやすい、複雑なステート管理に冗長 | 単一のグローバルステート値、または非常にシンプルなアプリケーション（ワークフローステートには非推奨） |

### Implementation Example:

```typescript
import { create } from 'zustand';

interface WorkflowState {
  nodes: Node[];
  edges: Edge[];
  selectedNodeId: string | null;
  // Actions
  setNodes: (nodes: Node[]) => void;
  setEdges: (edges: Edge[]) => void;
  setSelectedNode: (id: string | null) => void;
}

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
  selectedNodeId: null,
  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setSelectedNode: (selectedNodeId) => set({ selectedNodeId }),
}));
```

---

## 2. VSCode Extension テストフレームワーク

### 2.1 Extension ユニットテスト

#### Decision: **@vscode/test-cli + Mocha (Jest Mocks for VSCode API)**

#### Rationale:
- **公式推奨**: VSCode 公式ドキュメントが `@vscode/test-cli` と `@vscode/test-electron` を推奨
- **VSCode API モック**: Jest Manual Mocks で vscode モジュールをモックするパターンが確立されている
- **内部実装**: Mocha を使用するが、任意のテストフレームワークに置き換え可能
- **セットアップの簡易性**: 低（3-5分）、`.vscode-test.js` 設定ファイルを作成するだけ

#### Vitest が非推奨な理由:
1. vscode 仮想モジュールのモッキングが困難（GitHub Issue #993 で報告）
2. Extension Host でのテスト実行に適切でない
3. vscode API は Node.js 環境でのみ利用可能（ブラウザ環境ではない）
4. Webview（React）テスト用には優秀だが、Extension Host 用には不適切

#### Setup Example:

```javascript
// .vscode-test.js
const { defineConfig } = require('@vscode/test-cli');

module.exports = defineConfig({
  files: 'out/test/**/*.test.js',
  workspaceFolder: './test-fixtures',
  mocha: {
    timeout: 10000,
    require: ['ts-node/register'],
    spec: ['out/test/**/*.test.js']
  }
});
```

---

### 2.2 E2E テスト

#### Decision: **WebdriverIO + wdio-vscode-service**

#### Rationale:
- **Webview 対応**: React Webview のテストに対応（プロジェクトの重要要件）
- **複雑な UI 操作**: ドラッグ&ドロップ、複数ノードの操作をサポート
- **Extension Host API アクセス**: UI 自動化と API 呼び出しの両方が可能
- **クロスプラットフォーム**: Linux/macOS/Windows をネイティブサポート
- **セットアップの複雑さ**: 中程度（15-30分）

#### Alternatives Considered:

| フレームワーク | Webview対応 | API利用 | セットアップ | 推奨度 |
|---|---|---|---|---|
| **WebdriverIO** | ✅ | ✅ | 中 | ⭐⭐⭐⭐⭐ |
| @vscode/test-electron | ❌ | ✅ | 低 | ⭐⭐ |
| Playwright | ✅ | ⚠️ | 低 | ⭐⭐ |
| vscode-extension-tester | ✅ | ✅ | 高 | ⭐⭐⭐ |

**Playwright が非推奨な理由**: VSCode 拡張用の公式サポートなし、Webview 統合が限定的
**vscode-extension-tester が次点の理由**: セットアップが複雑、保守性がやや低い

#### Setup Example:

```typescript
// wdio.conf.ts
import { wdioVscode } from 'wdio-vscode-service';

exports.config = {
  runner: 'local',
  port: 4444,
  specs: ['./e2e/**/*.test.ts'],
  services: [wdioVscode],
  framework: 'mocha',
  mochaOpts: {
    timeout: 30000
  }
};
```

---

### 2.3 推奨テストアーキテクチャ（テストピラミッド）

```
         ┌─────────────────────────────────┐
         │  E2E テスト                      │
         │  (WebdriverIO + React)          │
         │  - Webview UI操作               │
         │  - ユーザーフロー全体           │
         │  テスト数: 少数                 │
         ├─────────────────────────────────┤
         │  統合テスト                      │
         │  (@vscode/test-cli + Mocha)    │
         │  - Extension Host機能           │
         │  - VS Code API統合              │
         │  テスト数: 中程度               │
         ├─────────────────────────────────┤
         │  ユニットテスト                  │
         │  (Vitest + React Testing Lib)  │
         │  - React Webviewコンポーネント │
         │  - ビジネスロジック関数         │
         │  テスト数: 多数                 │
         └─────────────────────────────────┘
```

**Test Scripts (package.json)**:

```json
{
  "scripts": {
    "test": "npm run test:unit && npm run test:integration && npm run test:e2e",
    "test:unit": "vitest --run",
    "test:integration": "vscode-test",
    "test:e2e": "wdio run wdio.conf.ts",
    "test:watch": "vitest watch"
  }
}
```

---

## 3. React Flow ベストプラクティス

### 3.1 パフォーマンス最適化（50ノード目標）

#### 優先度順の重要テクニック:

| テクニック | FPS 影響 | 実装難易度 | 説明 |
|-----------|---------|-----------|------|
| **Memoization** | 10→60 FPS | 低 | `React.memo` でカスタムノード/エッジをラップ、`useCallback` で関数をメモ化 |
| **State 分離** | 30→50 FPS | 低 | `selectedNodeIds` を別フィールドで管理、全 `nodes` 配列への不要なアクセスを回避 |
| **Props オブジェクト** | 45→55 FPS | 低 | `useMemo` で `defaultEdgeOptions`, `snapGrid` をメモ化 |
| **Grid Snapping** | 50→55 FPS | 低 | `snapToGrid` 有効化でドラッグ中の更新頻度を削減 |
| **CSS 簡素化** | 55→60 FPS | 中 | アニメーション、影、グラデーションを削減 |
| **Progressive Disclosure** | 55→60 FPS | 高 | `hidden` プロパティで動的に非表示、初期表示ノード数を削減 |

#### 重要実装パターン:

```typescript
// ❌ Bad: nodeTypes を毎レンダリングで再作成
<ReactFlow nodeTypes={{ subAgent: SubAgentNode }} />

// ✅ Good: コンポーネント外で定義
const nodeTypes: NodeTypes = {
  subAgent: SubAgentNode,
  askUserQuestion: AskUserQuestionNode
};

<ReactFlow nodeTypes={nodeTypes} />

// ❌ Bad: インライン関数
<ReactFlow onConnect={(connection) => addEdge(connection)} />

// ✅ Good: useCallback でメモ化
const onConnect = useCallback((connection) => addEdge(connection), []);
<ReactFlow onConnect={onConnect} />
```

**目標**: すべてのテクニックを組み合わせることで、50ノードで滑らかな 60 FPS を達成可能。

---

### 3.2 カスタムノード実装パターン

#### TypeScript 型定義:

```typescript
import { Node, NodeProps } from 'reactflow';

type SubAgentData = {
  description: string;  // Sub-Agentの目的説明
  prompt: string;       // システムプロンプト
  tools?: string;       // カンマ区切りツールリスト
  model?: 'sonnet' | 'opus' | 'haiku';  // 実行モデル
  outputPorts: number;  // 1 (通常は単一出力)
};

type AskUserQuestionData = {
  questionText: string;
  variableOptions: string[];
  outputPorts: number; // 2-4 branches
};

type SubAgentNode = Node<SubAgentData, 'subAgent'>;
type AskUserQuestionNode = Node<AskUserQuestionData, 'askUserQuestion'>;
type WorkflowNode = SubAgentNode | AskUserQuestionNode;
```

#### Component 実装:

```typescript
export const SubAgentNode: React.FC<NodeProps<SubAgentNode>> = ({
  data,
  id,
  selected
}) => {
  return (
    <div className={`node ${selected ? 'selected' : ''}`}>
      <div className="node-header">Sub-Agent</div>
      <div className="node-description">{data.description}</div>
      <Handle type="target" position={Position.Top} id="input" />
      <Handle type="source" position={Position.Bottom} id="output" />
    </div>
  );
};
```

#### ベストプラクティス:

1. **ドラッグ競合の防止**: インタラクティブ要素に `nodrag` クラスを追加
   ```jsx
   <input className="nodrag" onChange={handleChange} />
   ```

2. **Handle による接続**: 接続ポイントに Handle を使用
   ```jsx
   <Handle type="target" position={Position.Top} id="input" />
   <Handle type="source" position={Position.Bottom} id="output-0" />
   ```

3. **ノードタイプ登録**:
   ```typescript
   const nodeTypes: NodeTypes = {
     subAgent: SubAgentNode,
     askUserQuestion: AskUserQuestionNode
   };
   ```

---

### 3.3 動的ポート処理（可変 2-4 分岐）

#### `useUpdateNodeInternals` を使用した実装:

```typescript
import { useUpdateNodeInternals } from 'reactflow';

export const BranchingNode: React.FC<NodeProps<WorkflowNode>> = ({
  data,
  id
}) => {
  const [portCount, setPortCount] = useState(data.outputPorts || 2);
  const updateNodeInternals = useUpdateNodeInternals();

  // ポート数変更時に React Flow の内部計算を更新
  useEffect(() => {
    updateNodeInternals(id);
  }, [portCount, id, updateNodeInternals]);

  const addPort = () => {
    if (portCount < 4) setPortCount(prev => prev + 1);
  };

  const removePort = () => {
    if (portCount > 2) setPortCount(prev => prev - 1);
  };

  return (
    <div className="branching-node">
      <div className="node-header">{data.questionText}</div>

      {/* 動的な出力ハンドルの描画 */}
      <div className="output-ports">
        {Array.from({ length: portCount }).map((_, i) => (
          <Handle
            key={`port-${i}`}
            id={`branch-${i}`}
            type="source"
            position={Position.Right}
            style={{ top: `${30 + i * 40}px` }}
          />
        ))}
      </div>

      <div className="port-controls">
        <button onClick={addPort} disabled={portCount >= 4}>+</button>
        <button onClick={removePort} disabled={portCount <= 2}>-</button>
      </div>

      <Handle type="target" position={Position.Top} id="input" />
    </div>
  );
};
```

#### 条件分岐の重要パターン:

1. **複数のソースハンドル**: 各分岐/出力ポートに1つのハンドル
2. **ハンドル ID によるデータ分離**:
   ```typescript
   {
     id: 'node-1',
     data: {
       values: {
         'branch-0': dataForPath1,
         'branch-1': dataForPath2,
         'branch-2': null, // 未使用分岐は null
         'branch-3': null
       }
     }
   }
   ```
3. **Null を停止信号として使用**: null/undefined を受信した下流ノードは処理を行わない
4. **ユニークなハンドル ID**: 各ハンドルは一意な ID を持つ（`branch-0`, `branch-1` など）

---

### 3.4 Zustand との状態管理統合

#### Store アーキテクチャ:

```typescript
import { create } from 'zustand';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge
} from 'reactflow';

type WorkflowStore = {
  // State
  nodes: WorkflowNode[];
  edges: Edge[];

  // Change handlers
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Setters
  setNodes: (nodes: WorkflowNode[]) => void;
  setEdges: (edges: Edge[]) => void;

  // Custom domain actions
  updateNodeData: (nodeId: string, data: Partial<any>) => void;
  updateNodePorts: (nodeId: string, portCount: number) => void;
};

export const useWorkflowStore = create<WorkflowStore>((set, get) => ({
  nodes: [],
  edges: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set({ nodes: applyNodeChanges(changes, get().nodes) }),

  onEdgesChange: (changes) =>
    set({ edges: applyEdgeChanges(changes, get().edges) }),

  onConnect: (connection) =>
    set({ edges: addEdge(connection, get().edges) }),

  updateNodeData: (nodeId: string, data: Partial<any>) => {
    set({
      nodes: get().nodes.map((node) =>
        node.id === nodeId
          ? { ...node, data: { ...node.data, ...data } }
          : node
      )
    });
  },

  updateNodePorts: (nodeId: string, portCount: number) => {
    get().updateNodeData(nodeId, { outputPorts: portCount });
  }
}));
```

#### Component での使用:

```typescript
// メイン ReactFlow コンポーネント
export const WorkflowEditor = () => {
  const { nodes, edges, onNodesChange, onEdgesChange, onConnect } =
    useWorkflowStore();

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onConnect={onConnect}
      nodeTypes={nodeTypes}
    />
  );
};

// カスタムノード内
export const SubAgentNode: React.FC<NodeProps<SubAgentNode>> = (props) => {
  const updateNodeData = useWorkflowStore(s => s.updateNodeData);

  const handleDescriptionChange = (newDescription: string) => {
    updateNodeData(props.id, { description: newDescription });
  };

  return <div>{/* Node content */}</div>;
};
```

---

## 4. コードフォーマット・リンター

### Decision: **Biome**

### Rationale:
- **統合ツール**: ESLint + Prettier の機能を1つのツールで実現（設定ファイルの簡素化）
- **高速パフォーマンス**: Rustで実装され、ESLint + Prettierの組み合わせより約35倍高速
- **ゼロコンフィグ**: デフォルト設定で即座に使用可能、追加設定は `biome.json` 1ファイル
- **VSCode統合**: 公式VSCode拡張機能でシームレスな統合
- **TypeScript対応**: ネイティブTypeScriptサポート、追加プラグイン不要

### Alternatives Considered:

| ツール | 長所 | 短所 |
|---------|------|------|
| **ESLint + Prettier** | 成熟、豊富なプラグイン、コミュニティサポート | 2つのツールの設定・管理、遅い、設定の複雑さ |
| **dprint** | 高速（Rust製）、複数言語対応 | ESLintのようなリンティング機能なし、コミュニティ小さい |
| **Rome (archived)** | 高速、統合ツール | プロジェクト終了（Biomeに移行） |

### Setup:

```bash
# インストール
npm install --save-dev --save-exact @biomejs/biome

# 初期化
npx @biomejs/biome init
```

### Configuration (`biome.json`):

```json
{
  "$schema": "https://biomejs.dev/schemas/1.4.1/schema.json",
  "organizeImports": {
    "enabled": true
  },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "complexity": {
        "noExtraBooleanCast": "error",
        "noMultipleSpacesInRegularExpressionLiterals": "error",
        "noUselessCatch": "error",
        "noUselessConstructor": "error",
        "noUselessLoneBlockStatements": "error",
        "noUselessRename": "error",
        "noWith": "error"
      },
      "correctness": {
        "noUnusedVariables": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "formatWithErrors": false,
    "indentStyle": "space",
    "indentWidth": 2,
    "lineWidth": 100
  },
  "javascript": {
    "formatter": {
      "quoteStyle": "single",
      "trailingComma": "es5",
      "semicolons": "always"
    }
  }
}
```

### VSCode Integration:

`.vscode/settings.json`:
```json
{
  "[typescript]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "quickfix.biome": "explicit",
      "source.organizeImports.biome": "explicit"
    }
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "biomejs.biome",
    "editor.formatOnSave": true,
    "editor.codeActionsOnSave": {
      "quickfix.biome": "explicit",
      "source.organizeImports.biome": "explicit"
    }
  }
}
```

### NPM Scripts:

```json
{
  "scripts": {
    "lint": "biome lint .",
    "format": "biome format --write .",
    "check": "biome check --apply ."
  }
}
```

---

## 5. 主要な参考リソース

### VSCode Extension Testing:
- 公式 VSCode API: https://code.visualstudio.com/api/working-with-extensions/testing-extension
- @vscode/test-cli: https://github.com/microsoft/vscode-test
- WebdriverIO VSCode Service: https://webdriver.io/docs/wdio-vscode-service/

### React Flow:
- 公式ドキュメント: https://reactflow.dev/
- カスタムノード: https://reactflow.dev/learn/customization/custom-nodes
- パフォーマンス最適化: https://reactflow.dev/learn/advanced-use/performance

### Zustand:
- 公式ドキュメント: https://zustand-demo.pmnd.rs/
- TypeScript ガイド: https://docs.pmnd.rs/zustand/guides/typescript

### VSCode Webview:
- Webview API: https://code.visualstudio.com/api/extension-guides/webview
- Webview UI Toolkit: https://microsoft.github.io/vscode-webview-ui-toolkit/

### Biome:
- 公式ドキュメント: https://biomejs.dev/
- VSCode拡張機能: https://marketplace.visualstudio.com/items?itemName=biomejs.biome
- 設定リファレンス: https://biomejs.dev/reference/configuration/

---

## 6. 実装チェックリスト

### Phase 0 完了項目:
- [x] 状態管理ライブラリ選定（Zustand）
- [x] Extension テストフレームワーク選定（@vscode/test-cli + Mocha）
- [x] E2E テストフレームワーク選定（WebdriverIO）
- [x] コードフォーマット・リンター選定（Biome）
- [x] React Flow パフォーマンス最適化手法の調査
- [x] 動的ポート実装パターンの調査

### 次のステップ (Phase 1):
- [ ] data-model.md の作成（エンティティ定義）
- [ ] contracts/ の作成（API 契約定義）
- [ ] quickstart.md の作成（開発環境セットアップ手順）
- [ ] agent-specific context の更新

---

## 6. Technical Context の更新

以下の「NEEDS CLARIFICATION」項目が解決されました:

| 項目 | 決定内容 |
|------|---------|
| 状態管理ライブラリ | **Zustand** |
| Extension テスト | **@vscode/test-cli + Mocha** (Jest Mocks for VSCode API) |
| E2E テスト | **WebdriverIO + wdio-vscode-service** |

これらの調査結果は plan.md の Technical Context セクションに反映されます。
