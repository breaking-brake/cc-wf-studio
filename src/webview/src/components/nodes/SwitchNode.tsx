/**
 * Claude Code Workflow Studio - Switch Node Component
 *
 * Custom React Flow node for multi-way conditional branching (Switch/Case)
 * Variable 2-N way branching for multiple conditional paths
 */

import type { SwitchNodeData } from '@shared/types/workflow-definition';
import React, { useEffect } from 'react';
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from 'reactflow';

/**
 * SwitchNode Component
 */
export const SwitchNodeComponent: React.FC<NodeProps<SwitchNodeData>> = React.memo(
  ({ id, data, selected }) => {
    const updateNodeInternals = useUpdateNodeInternals();

    // Update React Flow's internal calculations when port count changes
    useEffect(() => {
      updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    return (
      <div
        className={`switch-node ${selected ? 'selected' : ''}`}
        style={{
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
          backgroundColor: 'var(--vscode-editor-background)',
          minWidth: '200px',
          maxWidth: '300px',
        }}
      >
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
          Switch
        </div>

        {/* Branch Type Badge */}
        <div
          style={{
            fontSize: '10px',
            color: 'var(--vscode-badge-foreground)',
            backgroundColor: 'var(--vscode-badge-background)',
            padding: '2px 6px',
            borderRadius: '3px',
            marginBottom: '12px',
            display: 'inline-block',
          }}
        >
          Multi-way Branch ({data.branches.length} branches)
        </div>

        {/* Branches List */}
        {data.branches && data.branches.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            {data.branches.map((branch, index) => (
              <div
                key={branch.id || `branch-${index}`}
                style={{
                  fontSize: '11px',
                  marginBottom: '8px',
                  padding: '6px 8px',
                  backgroundColor: 'var(--vscode-textBlockQuote-background)',
                  borderLeft: '3px solid var(--vscode-textLink-foreground)',
                  borderRadius: '3px',
                }}
              >
                <div
                  style={{
                    fontWeight: 600,
                    color: 'var(--vscode-foreground)',
                    marginBottom: '4px',
                  }}
                >
                  {branch.label}
                </div>
                <div
                  style={{
                    fontSize: '10px',
                    color: 'var(--vscode-descriptionForeground)',
                    fontStyle: 'italic',
                  }}
                >
                  {branch.condition || '(条件未設定)'}
                </div>
              </div>
            ))}
          </div>
        )}

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

        {/* Dynamic Output Handles */}
        {data.branches.map((branch, i) => (
          <Handle
            key={branch.id || `branch-${i}`}
            type="source"
            position={Position.Right}
            id={`branch-${i}`}
            style={{
              width: '12px',
              height: '12px',
              backgroundColor: 'var(--vscode-button-background)',
              border: '2px solid var(--vscode-button-foreground)',
              top: `${((i + 1) / (data.branches.length + 1)) * 100}%`,
            }}
          />
        ))}
      </div>
    );
  }
);

SwitchNodeComponent.displayName = 'SwitchNode';
