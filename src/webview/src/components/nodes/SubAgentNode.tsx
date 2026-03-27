/**
 * Claude Code Workflow Studio - SubAgent Node Component
 *
 * Custom React Flow node for Sub-Agent
 * Based on: /specs/001-cc-wf-studio/research.md section 3.2
 */

import { BUILT_IN_SUB_AGENTS } from '@shared/constants/built-in-sub-agents';
import type { SubAgentData } from '@shared/types/workflow-definition';
import { SUB_AGENT_COLORS } from '@shared/types/workflow-definition';
import { Bot } from 'lucide-react';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { AIProviderBadge } from '../common/AIProviderBadge';
import { DeleteButton } from './DeleteButton';

/**
 * SubAgentNode Component
 */
export const SubAgentNodeComponent: React.FC<NodeProps<SubAgentData>> = React.memo(
  ({ id, data, selected }) => {
    const builtInPreset = data.builtInType
      ? BUILT_IN_SUB_AGENTS.find((p) => p.type === data.builtInType)
      : undefined;
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
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <Bot size={18} />
          Sub-Agent
        </div>

        {/* Agent Name */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
            fontWeight: 500,
          }}
        >
          {builtInPreset
            ? builtInPreset.displayName
            : data.pluginName
              ? `${data.pluginName}:${data.description || 'Untitled Sub-Agent'}`
              : data.description || 'Untitled Sub-Agent'}
        </div>

        {/* Prompt Preview (task instructions) */}
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
          {/* Built-in Badge */}
          {data.builtInType && (
            <div
              style={{
                fontSize: '10px',
                color: '#ffffff',
                backgroundColor: 'var(--vscode-terminal-ansiGreen)',
                padding: '2px 6px',
                borderRadius: '3px',
                display: 'inline-block',
                fontWeight: 600,
              }}
            >
              Built-in
            </div>
          )}

          {/* Plugin Badge */}
          {data.pluginName && <AIProviderBadge provider="claude" size="small" />}

          {/* Model Badge (hidden for built-in) */}
          {!data.builtInType && data.model && (
            <div
              style={{
                fontSize: '10px',
                color: 'var(--vscode-badge-foreground)',
                backgroundColor: 'var(--vscode-badge-background)',
                padding: '2px 6px',
                borderRadius: '3px',
                display: 'inline-block',
              }}
            >
              {data.model}
            </div>
          )}

          {/* Memory Badge */}
          {data.memory && (
            <div
              style={{
                fontSize: '10px',
                color: 'var(--vscode-badge-foreground)',
                backgroundColor: 'var(--vscode-badge-background)',
                padding: '2px 6px',
                borderRadius: '3px',
                display: 'inline-block',
                fontWeight: 600,
              }}
            >
              memory: {data.memory}
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
