/**
 * Claude Code Workflow Studio - SubAgentFlow Node Component
 *
 * Feature: 089-subworkflow
 * Purpose: Display and edit SubAgentFlow nodes on the React Flow canvas
 *
 * SubAgentFlow nodes reference and execute sub-agent flows defined in the same workflow file.
 * At runtime, sub-agent flows are executed as Sub-Agents.
 */

import type { SubAgentFlowNodeData } from '@shared/types/workflow-definition';
import { GitBranch } from 'lucide-react';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { useTranslation } from '../../i18n/i18n-context';
import { useWorkflowStore } from '../../stores/workflow-store';
import { DeleteButton } from './DeleteButton';

/**
 * SubAgentFlowNode Component
 *
 * Displays a reference to a sub-agent flow that will be executed when this node is reached.
 */
export const SubAgentFlowNodeComponent: React.FC<NodeProps<SubAgentFlowNodeData>> = React.memo(
  ({ id, data, selected }) => {
    const { t } = useTranslation();
    const { subAgentFlows } = useWorkflowStore();

    // Find the referenced sub-agent flow to show its details
    const referencedSubAgentFlow = subAgentFlows.find((sf) => sf.id === data.subAgentFlowId);
    const isLinked = !!referencedSubAgentFlow;
    const nodeCount = referencedSubAgentFlow?.nodes?.length ?? 0;

    return (
      <div
        className={`subagentflow-ref-node ${selected ? 'selected' : ''}`}
        style={{
          position: 'relative',
          padding: '12px',
          borderRadius: '8px',
          border: `2px solid ${selected ? 'var(--vscode-focusBorder)' : 'var(--vscode-charts-purple)'}`,
          backgroundColor: 'var(--vscode-editor-background)',
          minWidth: '180px',
          maxWidth: '280px',
        }}
      >
        {/* Delete Button */}
        <DeleteButton nodeId={id} selected={selected} />

        {/* Node Header */}
        <div
          style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--vscode-charts-purple)',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <GitBranch size={12} />
          <span>{t('node.subAgentFlow.title')}</span>
          {/* Warning indicator for unlinked state */}
          {!isLinked && (
            <span
              style={{
                fontSize: '12px',
                color: 'var(--vscode-editorWarning-foreground)',
                fontWeight: 'bold',
              }}
              title={t('node.subAgentFlow.notLinked')}
            >
              ⚠
            </span>
          )}
        </div>

        {/* Sub-Agent Flow Name */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
            fontWeight: 500,
          }}
        >
          {data.label || t('node.subAgentFlow.untitled')}
        </div>

        {/* Description */}
        {data.description && (
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
            {data.description}
          </div>
        )}

        {/* Sub-Agent Flow Info Badge */}
        {isLinked && (
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
            {nodeCount} nodes
          </div>
        )}

        {/* Not linked warning */}
        {!isLinked && data.subAgentFlowId && (
          <div
            style={{
              fontSize: '10px',
              color: 'var(--vscode-editorWarning-foreground)',
              marginTop: '4px',
            }}
          >
            {t('node.subAgentFlow.subAgentFlowNotFound')}
          </div>
        )}

        {/* Not configured message */}
        {!data.subAgentFlowId && (
          <div
            style={{
              fontSize: '10px',
              color: 'var(--vscode-descriptionForeground)',
              fontStyle: 'italic',
            }}
          >
            {t('node.subAgentFlow.selectSubAgentFlow')}
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
            backgroundColor: 'var(--vscode-charts-purple)',
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
            backgroundColor: 'var(--vscode-charts-purple)',
            border: '2px solid var(--vscode-button-foreground)',
          }}
        />
      </div>
    );
  }
);

SubAgentFlowNodeComponent.displayName = 'SubAgentFlowNode';
