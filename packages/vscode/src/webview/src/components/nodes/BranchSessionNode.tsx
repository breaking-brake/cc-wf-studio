/**
 * BranchSessionNode Component
 *
 * ブランチセッション・チェックポイントを表すノードコンポーネント (Claude Code 限定)
 *
 * 特徴:
 * - 入力・出力の両方の接続を持つ
 * - ワークフローを一時停止し、ユーザーが /branch で AI と共同作業する
 * - 作業内容 (workDescription) のプレビュー表示
 */

import { GitBranchPlus } from 'lucide-react';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { BranchSessionNodeData } from '../../types/node-types';
import { DeleteButton } from './DeleteButton';

/**
 * BranchSessionNodeコンポーネント
 *
 * @param data - ノードデータ（label, workDescription）
 * @param selected - ノードが選択されているかどうか
 */
export const BranchSessionNode: React.FC<NodeProps<BranchSessionNodeData>> = React.memo(
  ({ id, data, selected }) => {
    // ラベルのデフォルト値
    const label = data.label || 'Branch Session';

    // 作業内容のプレビュー（最初の100文字）
    const workDescription = data.workDescription || '';
    const previewText =
      workDescription.length > 100 ? `${workDescription.substring(0, 100)}...` : workDescription;

    return (
      <div
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : '#14b8a6'}`,
          backgroundColor: 'var(--vscode-editor-background)',
          minWidth: '200px',
          maxWidth: '300px',
        }}
      >
        {/* Delete Button */}
        <DeleteButton nodeId={id} selected={selected} />
        {/* Node Header */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <GitBranchPlus size={18} />
          Branch Session
        </div>

        {/* Label */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
            fontWeight: 500,
          }}
        >
          {label}
        </div>

        {/* Work Description Preview */}
        {workDescription && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginBottom: '8px',
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {previewText}
          </div>
        )}

        {/* Claude Code Only Badge */}
        <div
          style={{
            fontSize: '10px',
            color: 'var(--vscode-badge-foreground)',
            backgroundColor: 'var(--vscode-badge-background)',
            padding: '2px 6px',
            borderRadius: '3px',
            display: 'inline-block',
          }}
        >
          Claude Code only
        </div>

        {/* Input Handle */}
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

        {/* Output Handle */}
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
  }
);

BranchSessionNode.displayName = 'BranchSessionNode';

export default BranchSessionNode;
