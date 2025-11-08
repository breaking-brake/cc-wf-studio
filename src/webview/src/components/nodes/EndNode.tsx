/**
 * EndNode Component
 *
 * ワークフローの終了点を表すノードコンポーネント
 *
 * 特徴:
 * - 入力接続のみ持つ（出力接続は持たない）
 * - ワークフローの終了点を視覚的に明示
 * - カスタムラベルをサポート
 *
 * Based on: /specs/001-node-types-extension/quickstart.md
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { EndNodeData } from '../../types/node-types';
import { DeleteButton } from './DeleteButton';

/**
 * EndNodeコンポーネント
 *
 * @param data - ノードデータ（label: カスタムラベル）
 * @param selected - ノードが選択されているかどうか
 */
export const EndNode: React.FC<NodeProps<EndNodeData>> = React.memo(({ id, data, selected }) => {
  // ラベルのデフォルト値
  const label = data.label || 'End';

  return (
    <div
      style={{
        position: 'relative',
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : '#ef4444'}`,
        backgroundColor: 'var(--vscode-editor-background)',
        minWidth: '120px',
      }}
    >
      {/* Delete Button */}
      <DeleteButton nodeId={id} selected={selected} />

      {/* Node Header */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#ef4444',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span aria-hidden="true">■</span>
        <span>{label}</span>
      </div>

      {/* Input handle only - 入力接続ポイントのみ */}
      <Handle
        type="target"
        position={Position.Left}
        id="in"
        style={{
          width: '12px',
          height: '12px',
          backgroundColor: 'var(--vscode-button-background)',
          border: '2px solid var(--vscode-button-foreground)',
        }}
      />
    </div>
  );
});

EndNode.displayName = 'EndNode';

export default EndNode;
