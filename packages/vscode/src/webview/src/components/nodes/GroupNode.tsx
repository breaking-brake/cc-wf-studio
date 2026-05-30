/**
 * GroupNode Component
 *
 * Visual grouping container for organizing nodes on the canvas.
 * Does not affect execution flow - purely a layout/label mechanism.
 * Supports highlight state for MCP execution tracking.
 */

import type React from 'react';
import { type NodeProps, NodeResizer } from 'reactflow';
import { useWorkflowStore } from '../../stores/workflow-store';
import { DeleteButton } from './DeleteButton';

export interface GroupNodeData {
  label: string;
}

export const GroupNodeComponent: React.FC<NodeProps<GroupNodeData>> = ({ id, data, selected }) => {
  const label = data.label || 'Group';
  const highlightedGroupNodeId = useWorkflowStore((s) => s.highlightedGroupNodeId);
  const isHighlighted = highlightedGroupNodeId === id;

  const borderColor = isHighlighted
    ? 'var(--vscode-focusBorder)'
    : selected
      ? 'var(--vscode-focusBorder)'
      : 'var(--vscode-panel-border)';

  const backgroundColor = isHighlighted
    ? 'rgba(79, 195, 247, 0.08)'
    : selected
      ? 'rgba(var(--vscode-focusBorder-rgb, 0, 120, 212), 0.05)'
      : 'rgba(128, 128, 128, 0.03)';

  return (
    <>
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          border: `2px ${isHighlighted ? 'solid' : 'dashed'} ${borderColor}`,
          backgroundColor,
          padding: 0,
          position: 'relative',
          boxShadow: isHighlighted
            ? '0 0 12px rgba(79, 195, 247, 0.4), 0 0 4px rgba(79, 195, 247, 0.2)'
            : 'none',
          animation:
            isHighlighted && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'highlightPulse 1.5s ease-in-out infinite'
              : 'none',
        }}
      >
        <NodeResizer
          isVisible={selected}
          minWidth={200}
          minHeight={150}
          lineStyle={{
            borderColor: 'var(--vscode-focusBorder)',
            borderWidth: 1,
          }}
          handleStyle={{
            width: 8,
            height: 8,
            backgroundColor: 'var(--vscode-focusBorder)',
            borderRadius: 2,
          }}
        />

        {/* Header with label */}
        <div
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            fontWeight: 600,
            color: 'var(--vscode-descriptionForeground)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: `1px dashed ${isHighlighted ? 'var(--vscode-focusBorder)' : selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{label}</span>
          <DeleteButton nodeId={id} selected={selected} />
        </div>
      </div>
      <style>
        {`
            @keyframes highlightPulse {
              0%, 100% {
                box-shadow: 0 0 12px rgba(79, 195, 247, 0.4), 0 0 4px rgba(79, 195, 247, 0.2);
              }
              50% {
                box-shadow: 0 0 20px rgba(79, 195, 247, 0.6), 0 0 8px rgba(79, 195, 247, 0.3);
              }
            }
          `}
      </style>
    </>
  );
};

export default GroupNodeComponent;
