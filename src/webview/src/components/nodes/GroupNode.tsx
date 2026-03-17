/**
 * GroupNode Component
 *
 * Visual grouping container for organizing nodes on the canvas.
 * Does not affect execution flow - purely a layout/label mechanism.
 */

import React from 'react';
import { type NodeProps, NodeResizer } from 'reactflow';
import { DeleteButton } from './DeleteButton';

export interface GroupNodeData {
  label: string;
}

export const GroupNodeComponent: React.FC<NodeProps<GroupNodeData>> = React.memo(
  ({ id, data, selected }) => {
    const label = data.label || 'Group';

    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '8px',
          border: `2px dashed ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
          backgroundColor: selected
            ? 'rgba(var(--vscode-focusBorder-rgb, 0, 120, 212), 0.05)'
            : 'rgba(128, 128, 128, 0.03)',
          padding: 0,
          position: 'relative',
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
            borderBottom: `1px dashed ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-panel-border)'}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>{label}</span>
          <DeleteButton nodeId={id} selected={selected} />
        </div>
      </div>
    );
  }
);

GroupNodeComponent.displayName = 'GroupNodeComponent';

export default GroupNodeComponent;
