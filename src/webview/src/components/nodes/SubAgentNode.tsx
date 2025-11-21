/**
 * Claude Code Workflow Studio - SubAgent Node Component
 *
 * Custom React Flow node for Sub-Agent
 * Based on: /specs/001-cc-wf-studio/research.md section 3.2
 */

import type { SubAgentData } from '@shared/types/workflow-definition';
import { SUB_AGENT_COLORS } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { DeleteButton } from './DeleteButton';

/**
 * SubAgentNode Component
 */
export const SubAgentNodeComponent: React.FC<NodeProps<SubAgentData>> = React.memo(
  ({ id, data, selected }) => {
    return (
      <div
        className={`sub-agent-node ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
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
          Sub-Agent
        </div>

        {/* Node Description */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
            fontWeight: 500,
          }}
        >
          {data.description || 'Untitled Sub-Agent'}
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
            {data.prompt}
          </div>
        )}

        {/* Badges */}
        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
          {/* Model Badge */}
          {data.model && (
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
              {data.model}
            </div>
          )}

          {/* Color Badge */}
          {data.color && (
            <div
              style={{
                fontSize: '10px',
                color: '#ffffff',
                backgroundColor: SUB_AGENT_COLORS[data.color],
                padding: '2px 6px',
                borderRadius: '3px',
                display: 'inline-block',
                textTransform: 'capitalize',
              }}
            >
              {data.color}
            </div>
          )}
        </div>

        {/* Input Handle */}
        <Handle
          type="target"
          position={Position.Left}
          id="input"
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
          id="output"
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

SubAgentNodeComponent.displayName = 'SubAgentNode';
