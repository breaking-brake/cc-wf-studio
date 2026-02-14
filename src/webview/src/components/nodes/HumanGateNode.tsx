/**
 * AutoExplainer - Human Gate Node Component
 *
 * Displays human review gate nodes that pause the pipeline
 * for manual approval.
 */

import type { HumanGateNodeData } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { DeleteButton } from './DeleteButton';

export const HumanGateNodeComponent: React.FC<NodeProps<HumanGateNodeData>> = React.memo(
  ({ id, data, selected }) => {
    return (
      <div
        className={`human-gate-node ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-charts-yellow)'}`,
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
            color: 'var(--vscode-charts-yellow)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Human Gate
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
        <span
          style={{
            fontSize: '10px',
            padding: '2px 6px',
            borderRadius: '3px',
            border: '1px solid var(--vscode-charts-yellow)',
            color: 'var(--vscode-charts-yellow)',
            fontWeight: 600,
          }}
        >
          {data.gateType.replace('_', ' ')}
        </span>
        {data.reviewInstructions && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '6px',
              lineHeight: '1.4',
            }}
          >
            {data.reviewInstructions}
          </div>
        )}
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

HumanGateNodeComponent.displayName = 'HumanGateNode';
