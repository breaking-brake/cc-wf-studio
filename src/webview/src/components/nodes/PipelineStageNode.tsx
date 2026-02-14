/**
 * AutoExplainer - Pipeline Stage Node Component
 *
 * Displays pipeline stage nodes (research, script, storyboard, etc.)
 * on the React Flow canvas.
 */

import type { PipelineStageNodeData } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { DeleteButton } from './DeleteButton';

const STAGE_COLORS: Record<string, string> = {
  research: 'var(--vscode-charts-blue)',
  script_draft: 'var(--vscode-charts-purple)',
  script_critique: 'var(--vscode-charts-purple)',
  script_revision: 'var(--vscode-charts-purple)',
  storyboard: 'var(--vscode-charts-orange)',
  image_gen: 'var(--vscode-charts-green)',
  audio_gen: 'var(--vscode-charts-yellow)',
  render: 'var(--vscode-charts-red)',
  publish: 'var(--vscode-charts-blue)',
};

export const PipelineStageNodeComponent: React.FC<NodeProps<PipelineStageNodeData>> = React.memo(
  ({ id, data, selected }) => {
    const stageColor = STAGE_COLORS[data.stage] || 'var(--vscode-foreground)';

    return (
      <div
        className={`pipeline-stage-node ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : stageColor}`,
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
            color: 'var(--vscode-descriptionForeground)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Pipeline Stage
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
            border: `1px solid ${stageColor}`,
            color: stageColor,
            fontWeight: 600,
          }}
        >
          {data.stage}
        </span>
        {data.description && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '6px',
              lineHeight: '1.4',
            }}
          >
            {data.description}
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

PipelineStageNodeComponent.displayName = 'PipelineStageNode';
