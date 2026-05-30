# Quickstart: ノードタイプ拡張の実装

**Feature**: 001-node-types-extension
**Date**: 2025-11-01

## Overview

このドキュメントでは、Start/End/Promptノードタイプを追加する実装の手順を示します。実装は以下の順序で進めます:

1. 型定義の追加
2. ノードコンポーネントの実装
3. ノードパレットへの追加
4. 接続制約の実装
5. テストの作成

推定作業時間: 8-12時間

---

## Phase 1: 型定義の追加 (1時間)

### 1.1. ノードタイプの定義

**File**: `src/webview/src/types/node-types.ts`

```typescript
import { Node } from 'reactflow';

// ============================================================================
// Start Node
// ============================================================================

export interface StartNodeData {
  label?: string;
}

export type StartNode = Node<StartNodeData, 'start'>;

// ============================================================================
// End Node
// ============================================================================

export interface EndNodeData {
  label?: string;
}

export type EndNode = Node<EndNodeData, 'end'>;

// ============================================================================
// Prompt Node
// ============================================================================

export interface PromptNodeData {
  label?: string;
  prompt: string;
  variables?: Record<string, string>;
}

export type PromptNode = Node<PromptNodeData, 'prompt'>;

// ============================================================================
// Union Type
// ============================================================================

export type WorkflowNode =
  | StartNode
  | EndNode
  | PromptNode
  // ...既存のノードタイプ
```

### 1.2. ワークフローファイル型の更新

**File**: `src/shared/types.ts`

```typescript
export interface WorkflowFile {
  schemaVersion?: string; // "1.0.0" | "1.1.0"
  nodes: Node[];
  edges: Edge[];
}
```

---

## Phase 2: ノードコンポーネントの実装 (3-4時間)

### 2.1. StartNodeコンポーネント

**File**: `src/webview/src/components/nodes/StartNode.tsx`

```tsx
/**
 * StartNode Component
 *
 * Represents the entry point of a workflow.
 */

import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { PlayCircle } from 'lucide-react';
import type { StartNodeData } from '../../types/node-types';

export function StartNode({ data, selected }: NodeProps<StartNodeData>) {
  const label = data.label || 'Start';

  return (
    <div
      className={`start-node ${selected ? 'selected' : ''}`}
      role="button"
      aria-label={`Start node: ${label}`}
      tabIndex={0}
    >
      <div className="node-header">
        <PlayCircle size={16} />
        <span>{label}</span>
      </div>

      {/* Output handle only */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        aria-label="Output connection"
      />
    </div>
  );
}

export default StartNode;
```

**CSS**: `src/webview/src/styles/nodes.css`

```css
.start-node {
  padding: 12px 16px;
  border: 2px solid #10b981;
  border-radius: 8px;
  background: #ecfdf5;
  min-width: 120px;
}

.start-node.selected {
  box-shadow: 0 0 0 3px #10b98150;
}

.start-node .node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #047857;
}
```

### 2.2. EndNodeコンポーネント

**File**: `src/webview/src/components/nodes/EndNode.tsx`

```tsx
/**
 * EndNode Component
 *
 * Represents the exit point of a workflow.
 */

import React from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { CheckCircle } from 'lucide-react';
import type { EndNodeData } from '../../types/node-types';

export function EndNode({ data, selected }: NodeProps<EndNodeData>) {
  const label = data.label || 'End';

  return (
    <div
      className={`end-node ${selected ? 'selected' : ''}`}
      role="button"
      aria-label={`End node: ${label}`}
      tabIndex={0}
    >
      {/* Input handle only */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        aria-label="Input connection"
      />

      <div className="node-header">
        <CheckCircle size={16} />
        <span>{label}</span>
      </div>
    </div>
  );
}

export default EndNode;
```

**CSS**:

```css
.end-node {
  padding: 12px 16px;
  border: 2px solid #ef4444;
  border-radius: 8px;
  background: #fef2f2;
  min-width: 120px;
}

.end-node.selected {
  box-shadow: 0 0 0 3px #ef444450;
}

.end-node .node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #b91c1c;
}
```

### 2.3. PromptNodeコンポーネント

**File**: `src/webview/src/components/nodes/PromptNode.tsx`

```tsx
/**
 * PromptNode Component
 *
 * Allows users to define AI agent prompts with variable placeholders.
 */

import React, { useState } from 'react';
import { Handle, NodeProps, Position } from 'reactflow';
import { MessageSquare } from 'lucide-react';
import type { PromptNodeData } from '../../types/node-types';

export function PromptNode({ data, selected }: NodeProps<PromptNodeData>) {
  const label = data.label || 'Prompt';
  const [isEditing, setIsEditing] = useState(false);

  const handlePromptChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    // Update node data via store
    // useWorkflowStore.getState().updateNodeData(id, { prompt: e.target.value });
  };

  return (
    <div
      className={`prompt-node ${selected ? 'selected' : ''}`}
      role="button"
      aria-label={`Prompt node: ${label}`}
      tabIndex={0}
    >
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        aria-label="Input connection"
      />

      <div className="node-header">
        <MessageSquare size={16} />
        <span>{label}</span>
      </div>

      <div className="node-body">
        {isEditing ? (
          <textarea
            value={data.prompt}
            onChange={handlePromptChange}
            placeholder="Enter prompt..."
            rows={4}
            aria-label="Prompt text"
          />
        ) : (
          <div className="prompt-preview">
            {data.prompt || 'No prompt defined'}
          </div>
        )}
      </div>

      <Handle
        type="source"
        position={Position.Right}
        id="out"
        aria-label="Output connection"
      />
    </div>
  );
}

export default PromptNode;
```

**CSS**:

```css
.prompt-node {
  padding: 12px;
  border: 2px solid #3b82f6;
  border-radius: 8px;
  background: #eff6ff;
  min-width: 200px;
  max-width: 300px;
}

.prompt-node.selected {
  box-shadow: 0 0 0 3px #3b82f650;
}

.prompt-node .node-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  color: #1e40af;
  margin-bottom: 8px;
}

.prompt-node .node-body textarea {
  width: 100%;
  padding: 8px;
  border: 1px solid #cbd5e1;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
}

.prompt-node .prompt-preview {
  padding: 8px;
  background: white;
  border-radius: 4px;
  font-size: 12px;
  max-height: 100px;
  overflow-y: auto;
}
```

---

## Phase 3: ReactFlowへの登録 (30分)

### 3.1. ノードタイプの登録

**File**: `src/webview/src/App.tsx` (または該当するReactFlowコンポーネント)

```tsx
import ReactFlow, { NodeTypes } from 'reactflow';
import StartNode from './components/nodes/StartNode';
import EndNode from './components/nodes/EndNode';
import PromptNode from './components/nodes/PromptNode';

const nodeTypes: NodeTypes = {
  start: StartNode,
  end: EndNode,
  prompt: PromptNode,
  // ...既存のノードタイプ
};

function App() {
  return (
    <ReactFlow
      nodeTypes={nodeTypes}
      // ...その他のプロップ
    />
  );
}
```

---

## Phase 4: ノードパレットへの追加 (1時間)

**File**: `src/webview/src/components/NodePalette.tsx`

```tsx
import { PlayCircle, CheckCircle, MessageSquare } from 'lucide-react';

const nodeTemplates = [
  {
    type: 'start',
    label: 'Start',
    icon: PlayCircle,
    data: { label: 'Start' }
  },
  {
    type: 'end',
    label: 'End',
    icon: CheckCircle,
    data: { label: 'End' }
  },
  {
    type: 'prompt',
    label: 'Prompt',
    icon: MessageSquare,
    data: { label: 'Prompt', prompt: '' }
  },
  // ...既存のノードテンプレート
];

export function NodePalette() {
  const handleNodeAdd = (template) => {
    const newNode = {
      id: nanoid(),
      type: template.type,
      position: { x: 100, y: 100 },
      data: template.data
    };

    useWorkflowStore.getState().addNode(newNode);
  };

  return (
    <div className="node-palette">
      {nodeTemplates.map((template) => (
        <button
          key={template.type}
          onClick={() => handleNodeAdd(template)}
          aria-label={`Add ${template.label} node`}
        >
          <template.icon size={20} />
          <span>{template.label}</span>
        </button>
      ))}
    </div>
  );
}
```

---

## Phase 5: 接続制約の実装 (1時間)

**File**: `src/webview/src/App.tsx`

```tsx
import { Connection, Edge, Node } from 'reactflow';

function App() {
  const nodes = useWorkflowStore((state) => state.nodes);

  const isValidConnection = (connection: Connection): boolean => {
    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    // Startノードは入力接続を持てない
    if (targetNode?.type === 'start') {
      console.warn('Cannot connect to Start node');
      return false;
    }

    // Endノードは出力接続を持てない
    if (sourceNode?.type === 'end') {
      console.warn('Cannot connect from End node');
      return false;
    }

    return true;
  };

  return (
    <ReactFlow
      isValidConnection={isValidConnection}
      // ...その他のプロップ
    />
  );
}
```

---

## Phase 6: テストの作成 (2-3時間)

### 6.1. ユニットテスト

**File**: `src/webview/tests/unit/nodes/StartNode.test.tsx`

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ReactFlowProvider } from 'reactflow';
import StartNode from '../../../src/components/nodes/StartNode';

describe('StartNode', () => {
  it('renders with default label', () => {
    const props = {
      id: 'start-1',
      data: {},
      selected: false,
      // ...その他の必須プロップ
    };

    render(
      <ReactFlowProvider>
        <StartNode {...props} />
      </ReactFlowProvider>
    );

    expect(screen.getByText('Start')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    const props = {
      id: 'start-1',
      data: { label: 'Begin' },
      selected: false,
    };

    render(
      <ReactFlowProvider>
        <StartNode {...props} />
      </ReactFlowProvider>
    );

    expect(screen.getByText('Begin')).toBeInTheDocument();
  });
});
```

同様に`EndNode.test.tsx`と`PromptNode.test.tsx`を作成。

### 6.2. 統合テスト

**File**: `src/webview/tests/integration/workflow.test.ts`

```tsx
import { describe, it, expect } from 'vitest';
import { useWorkflowStore } from '../../src/stores/workflow-store';

describe('Workflow with new node types', () => {
  it('can add Start node', () => {
    const store = useWorkflowStore.getState();

    const startNode = {
      id: 'start-1',
      type: 'start',
      position: { x: 0, y: 0 },
      data: { label: 'Start' }
    };

    store.addNode(startNode);

    expect(store.nodes).toHaveLength(1);
    expect(store.nodes[0].type).toBe('start');
  });

  it('prevents invalid connections', () => {
    // テスト: Start→他, 他→Endの接続制約
  });
});
```

---

## Phase 7: ドキュメントの更新 (30分)

### 7.1. README更新

プロジェクトのREADMEに新規ノードタイプの説明を追加。

### 7.2. CHANGELOG更新

```markdown
## [Unreleased]

### Added
- Start node: ワークフローの開始点を明示的に定義
- End node: ワークフローの終了点を明示的に定義
- Prompt node: AIエージェント用のプロンプトテキストを定義
- ワークフローファイルschemaVersion 1.1.0をサポート
```

---

## Testing Checklist

実装完了前に以下を確認:

- [ ] 各ノードコンポーネントが正しくレンダリングされる
- [ ] ノードパレットから新規ノードを追加できる
- [ ] Start/Endノードの接続制約が機能する
- [ ] Promptノードのプロンプトテキストを編集できる
- [ ] ワークフローファイルに新規ノードタイプが保存される
- [ ] 保存したワークフローを再度開いても新規ノードが維持される
- [ ] 既存のv1.0.0形式のワークフローファイルが正常に読み込める
- [ ] テストカバレッジが85%以上

---

## Next Steps

実装完了後、`/speckit.tasks`コマンドで詳細なタスクリストを生成し、実装フェーズに進みます。
