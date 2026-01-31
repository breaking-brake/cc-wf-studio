/**
 * Claude Code Workflow Studio - Codex Node Component
 *
 * Feature: 518-codex-agent-node
 * Purpose: Display Codex agent nodes on the React Flow canvas
 *
 * Phase 1: UI/data model only (CLI execution is out of scope)
 */

import type { CodexNodeData } from '@shared/types/workflow-definition';
import React from 'react';
import { Handle, type NodeProps, Position } from 'reactflow';
import { useTranslation } from '../../i18n/i18n-context';
import { DeleteButton } from './DeleteButton';

/**
 * Truncate text with ellipsis
 */
function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}

/**
 * Get badge color for model
 */
function getModelBadgeColor(model: string): string {
  switch (model) {
    case 'gpt-5.2-codex':
      return 'var(--vscode-charts-blue)';
    case 'gpt-5.2':
      return 'var(--vscode-charts-purple)';
    case 'gpt-5.1-codex-max':
      return 'var(--vscode-charts-orange)';
    case 'gpt-5.1-codex-mini':
      return 'var(--vscode-charts-green)';
    default:
      return 'var(--vscode-foreground)';
  }
}

/**
 * Get badge color for reasoning effort
 */
function getReasoningEffortBadgeColor(effort: string): string {
  switch (effort) {
    case 'high':
      return 'var(--vscode-charts-red)';
    case 'medium':
      return 'var(--vscode-charts-yellow)';
    case 'low':
      return 'var(--vscode-charts-green)';
    default:
      return 'var(--vscode-foreground)';
  }
}

/**
 * Get badge color for sandbox mode
 */
function getSandboxBadgeColor(sandbox: string): string {
  switch (sandbox) {
    case 'danger-full-access':
      return 'var(--vscode-charts-red)';
    case 'workspace-write':
      return 'var(--vscode-charts-yellow)';
    case 'read-only':
      return 'var(--vscode-charts-green)';
    default:
      return 'var(--vscode-foreground)';
  }
}

/**
 * Get display label for sandbox mode
 */
function getSandboxLabel(sandbox: string): string {
  switch (sandbox) {
    case 'danger-full-access':
      return 'Full Access';
    case 'workspace-write':
      return 'Workspace Write';
    case 'read-only':
      return 'Read Only';
    default:
      return sandbox;
  }
}

/**
 * CodexNode Component
 */
export const CodexNodeComponent: React.FC<NodeProps<CodexNodeData>> = React.memo(
  ({ id, data, selected }) => {
    const { t } = useTranslation();

    return (
      <div
        className={`codex-node ${selected ? 'selected' : ''}`}
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
          }}
        >
          {t('node.codex.title')}
        </div>

        {/* Node Name */}
        <div
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--vscode-foreground)',
            marginBottom: '8px',
          }}
        >
          {data.label || t('node.codex.untitled')}
        </div>

        {/* Badges Row */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px',
            marginBottom: '8px',
          }}
        >
          {/* Prompt Mode Badge - only show for AI-generated */}
          {data.promptMode === 'ai-generated' && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                border: '1px solid var(--vscode-charts-purple)',
                backgroundColor: 'transparent',
                color: 'var(--vscode-charts-purple)',
                fontWeight: 600,
              }}
            >
              {t('node.codex.aiGenerated')}
            </span>
          )}

          {/* Model Badge - theme-aware (similar to Codex CLI) */}
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '3px',
              border: `1px solid ${getModelBadgeColor(data.model)}`,
              backgroundColor: 'transparent',
              color: getModelBadgeColor(data.model),
              fontWeight: 600,
            }}
          >
            {data.model}
          </span>

          {/* Reasoning Effort Badge - theme-aware */}
          <span
            style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '3px',
              border: `1px solid ${getReasoningEffortBadgeColor(data.reasoningEffort)}`,
              backgroundColor: 'transparent',
              color: getReasoningEffortBadgeColor(data.reasoningEffort),
              fontWeight: 600,
            }}
          >
            {data.reasoningEffort}
          </span>

          {/* Sandbox Badge - theme-aware (only show when sandbox is specified) */}
          {data.sandbox && (
            <span
              style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '3px',
                border: `1px solid ${getSandboxBadgeColor(data.sandbox)}`,
                backgroundColor: 'transparent',
                color: getSandboxBadgeColor(data.sandbox),
                fontWeight: 600,
              }}
            >
              {getSandboxLabel(data.sandbox)}
            </span>
          )}
        </div>

        {/* Prompt Preview (truncated, 2 lines) */}
        {data.prompt && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              lineHeight: '1.4',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}
          >
            {truncateText(data.prompt, 100)}
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

CodexNodeComponent.displayName = 'CodexNode';
