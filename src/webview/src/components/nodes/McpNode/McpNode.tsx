/**
 * Claude Code Workflow Studio - MCP Node Component
 *
 * Feature: 001-mcp-node
 * Purpose: Display and edit MCP nodes on the React Flow canvas
 *
 * Based on: specs/001-mcp-node/plan.md Section 6.3
 * Task: T027
 */

import type { McpNodeData } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { useTranslation } from '../../../i18n/i18n-context';
import { ModeIndicatorBadge } from '../../mode-selection/ModeIndicatorBadge';
import { DeleteButton } from '../DeleteButton';

/**
 * Get validation status icon
 */
function getValidationIcon(status: 'valid' | 'missing' | 'invalid'): string {
  switch (status) {
    case 'valid':
      return '✓';
    case 'missing':
      return '⚠';
    case 'invalid':
      return '✗';
  }
}

/**
 * Get validation status color
 */
function getValidationColor(status: 'valid' | 'missing' | 'invalid'): string {
  switch (status) {
    case 'valid':
      return 'var(--vscode-testing-iconPassed)';
    case 'missing':
      return 'var(--vscode-editorWarning-foreground)';
    case 'invalid':
      return 'var(--vscode-errorForeground)';
  }
}

/**
 * McpNode Component
 */
export const McpNodeComponent: React.FC<NodeProps<McpNodeData>> = React.memo(
  ({ id, data, selected }) => {
    const { t } = useTranslation();

    // Get current mode (default to 'manualParameterConfig' for backwards compatibility)
    const currentMode = data.mode || 'manualParameterConfig';

    // Get tooltip message based on validation status
    const getTooltipMessage = (status: 'valid' | 'missing' | 'invalid'): string => {
      switch (status) {
        case 'valid':
          return t('property.validationStatus.valid.tooltip');
        case 'missing':
          return 'MCP server not found or not connected';
        case 'invalid':
          return 'MCP tool configuration is invalid';
      }
    };

    return (
      <div
        className={`mcp-node ${selected ? 'selected' : ''}`}
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
        {/* Input Handle */}
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
          <span>MCP Tool</span>
          {/* Validation Status Icon */}
          <span
            style={{
              fontSize: '12px',
              color: getValidationColor(data.validationStatus),
              fontWeight: 'bold',
            }}
            title={getTooltipMessage(data.validationStatus)}
          >
            {getValidationIcon(data.validationStatus)}
          </span>
        </div>

        {/* Server Name : Tool Name */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-foreground)',
            marginBottom: '4px',
          }}
        >
          <span style={{ fontWeight: 600 }}>{data.serverId}</span>
          <span style={{ fontWeight: 400 }}>
            :{' '}
            {currentMode === 'aiToolSelection'
              ? 'Auto selected Tool'
              : data.toolName || 'Untitled Tool'}
          </span>
        </div>

        {/* Mode Badge */}
        <div style={{ marginBottom: '8px' }}>
          <ModeIndicatorBadge mode={currentMode} />
        </div>

        {/* Description */}
        {data.toolDescription && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '8px',
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {data.toolDescription}
          </div>
        )}

        {/* Parameter Count */}
        {data.parameters && data.parameters.length > 0 && (
          <div
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              marginTop: '8px',
              fontStyle: 'italic',
            }}
          >
            {data.parameters.length} parameter{data.parameters.length !== 1 ? 's' : ''}
          </div>
        )}

        {/* Output Handle */}
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

McpNodeComponent.displayName = 'McpNode';
