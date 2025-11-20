/**
 * PromptNode Component
 *
 * プロンプトテンプレートを保持するノードコンポーネント
 *
 * 特徴:
 * - 入力・出力の両方の接続を持つ
 * - Mustacheスタイルの変数置換をサポート（{{variableName}}）
 * - プロンプトテンプレートのプレビュー表示
 *
 * Based on: /specs/001-node-types-extension/quickstart.md
 */

import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import type { PromptNodeData } from '../../types/node-types';
import { extractVariables } from '../../utils/template-utils';
import { DeleteButton } from './DeleteButton';

/**
 * PromptNodeコンポーネント
 *
 * @param data - ノードデータ（label, prompt, variables）
 * @param selected - ノードが選択されているかどうか
 */
export const PromptNode: React.FC<NodeProps<PromptNodeData>> = React.memo(
  ({ id, data, selected }) => {
    // ラベルのデフォルト値
    const label = data.label || 'Prompt';

    // プロンプトから変数を抽出
    const variables = extractVariables(data.prompt);

    // プロンプトのプレビュー（最初の100文字）
    const previewText =
      data.prompt.length > 100 ? `${data.prompt.substring(0, 100)}...` : data.prompt;

    return (
      <div
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : '#3b82f6'}`,
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
          }}
        >
          Prompt
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

        {/* Prompt Preview */}
        {data.prompt && (
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

        {/* Variables Badge */}
        {variables.length > 0 && (
          <div
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              backgroundColor: 'var(--vscode-badge-background)',
              padding: '2px 6px',
              borderRadius: '3px',
              display: 'inline-block',
            }}
          >
            {variables.length} variable{variables.length !== 1 ? 's' : ''}
          </div>
        )}

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

PromptNode.displayName = 'PromptNode';

export default PromptNode;
