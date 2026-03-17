/**
 * StartNode Component
 *
 * ワークフローの開始点を表すノードコンポーネント
 *
 * 特徴:
 * - 出力接続のみ持つ（入力接続は持たない）
 * - ワークフローの開始点を視覚的に明示
 * - カスタムラベルをサポート
 *
 * Based on: /specs/001-node-types-extension/quickstart.md
 */

import { Play } from 'lucide-react';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { StartNodeData } from '../../types/node-types';

/**
 * StartNodeコンポーネント
 *
 * @param data - ノードデータ（label: カスタムラベル）
 * @param selected - ノードが選択されているかどうか
 */
export const StartNode: React.FC<NodeProps<StartNodeData>> = React.memo(({ data, selected }) => {
  // ラベルのデフォルト値
  const label = data.label || 'Start';

  return (
    <div
      style={{
        padding: '12px',
        borderRadius: '8px',
        border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : '#10b981'}`,
        backgroundColor: 'var(--vscode-editor-background)',
        minWidth: '120px',
      }}
    >
      {/* Node Header */}
      <div
        style={{
          fontSize: '13px',
          fontWeight: 600,
          color: '#10b981',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <Play size={18} />
        <span>{label}</span>
      </div>

      {/* Output handle only - 出力接続ポイントのみ */}
      <Handle
        type="source"
        position={Position.Right}
        id="out"
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

StartNode.displayName = 'StartNode';

export default StartNode;
