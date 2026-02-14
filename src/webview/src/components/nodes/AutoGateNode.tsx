/**
 * AutoExplainer - Auto Gate Node Component
 *
 * Displays automated quality gate nodes that run checks
 * without human intervention.
 */

import type { AutoGateNodeData } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { DeleteButton } from './DeleteButton';

export const AutoGateNodeComponent: React.FC<NodeProps<AutoGateNodeData>> = React.memo(
  ({ id, data, selected }) => {
    return (
      <div
        className={`auto-gate-node ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-charts-green)'}`,
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
            color: 'var(--vscode-charts-green)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Auto Gate
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
              border: '1px solid var(--vscode-charts-green)',
              color: 'var(--vscode-charts-green)',
              fontWeight: 600,
            }}
          >
            {data.gateType.replace('_', ' ')}
          </span>
          {data.blocking && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid var(--vscode-charts-red)',
                color: 'var(--vscode-charts-red)',
                fontWeight: 600,
              }}
            >
              blocking
            </span>
          )}
          {data.threshold !== undefined && (
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
              {data.threshold}%
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

AutoGateNodeComponent.displayName = 'AutoGateNode';
