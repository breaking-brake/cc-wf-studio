/**
 * AutoExplainer - Asset Batch Node Component
 *
 * Displays batch asset operation nodes (image gen, Whisk, audio).
 */

import type { AssetBatchNodeData } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { DeleteButton } from './DeleteButton';

const BATCH_COLORS: Record<string, string> = {
  image_gen: 'var(--vscode-charts-green)',
  whisk_animation: 'var(--vscode-charts-orange)',
  audio_gen: 'var(--vscode-charts-purple)',
};

export const AssetBatchNodeComponent: React.FC<NodeProps<AssetBatchNodeData>> = React.memo(
  ({ id, data, selected }) => {
    const batchColor = BATCH_COLORS[data.batchType] || 'var(--vscode-foreground)';

    return (
      <div
        className={`asset-batch-node ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : batchColor}`,
          backgroundColor: 'var(--vscode-editor-background)',
          minWidth: '180px',
          maxWidth: '280px',
        }}
      >
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: '10px',
            height: '10px',
            background: 'var(--vscode-button-background)',
            border: '2px solid var(--vscode-editor-background)',
          }}
        />
        <DeleteButton nodeId={id} selected={selected} />
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: batchColor,
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Asset Batch
        </div>
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '6px',
          }}
        >
          {data.label}
        </div>
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '3px',
              border: `1px solid ${batchColor}`,
              color: batchColor,
              fontWeight: 600,
            }}
          >
            {data.batchType.replace('_', ' ')}
          </span>
          {data.maxConcurrent && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid var(--vscode-descriptionForeground)',
                color: 'var(--vscode-descriptionForeground)',
                fontWeight: 600,
              }}
            >
              max {data.maxConcurrent}
            </span>
          )}
        </div>
        <Handle
          type="source"
          position={Position.Right}
          style={{
            width: '10px',
            height: '10px',
            background: 'var(--vscode-button-background)',
            border: '2px solid var(--vscode-editor-background)',
          }}
        />
      </div>
    );
  }
);

AssetBatchNodeComponent.displayName = 'AssetBatchNode';
