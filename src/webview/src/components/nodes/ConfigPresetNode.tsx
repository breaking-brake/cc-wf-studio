/**
 * AutoExplainer - Config Preset Node Component
 *
 * Displays config loading nodes (style, voice, pipeline config).
 */

import type { ConfigPresetNodeData } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { DeleteButton } from './DeleteButton';

export const ConfigPresetNodeComponent: React.FC<NodeProps<ConfigPresetNodeData>> = React.memo(
  ({ id, data, selected }) => {
    return (
      <div
        className={`config-preset-node ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-charts-cyan)'}`,
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
            color: 'var(--vscode-charts-cyan)',
            marginBottom: '6px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
          }}
        >
          Config Preset
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
              border: '1px solid var(--vscode-charts-cyan)',
              color: 'var(--vscode-charts-cyan)',
              fontWeight: 600,
            }}
          >
            {data.presetType}
          </span>
        </div>
        {data.configPath && (
          <div
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '6px',
              fontFamily: 'var(--vscode-editor-font-family)',
            }}
          >
            {data.configPath}
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

ConfigPresetNodeComponent.displayName = 'ConfigPresetNode';
