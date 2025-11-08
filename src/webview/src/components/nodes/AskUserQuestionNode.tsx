/**
 * Claude Code Workflow Studio - AskUserQuestion Node Component
 *
 * Custom React Flow node for AskUserQuestion with dynamic 2-4 output ports
 * Based on: /specs/001-cc-wf-studio/research.md section 3.3
 */

import type { AskUserQuestionData } from '@shared/types/workflow-definition';
import React, { useEffect } from 'react';
import { Handle, type NodeProps, Position, useUpdateNodeInternals } from 'reactflow';
import { DeleteButton } from './DeleteButton';

/**
 * AskUserQuestionNode Component
 */
export const AskUserQuestionNodeComponent: React.FC<NodeProps<AskUserQuestionData>> = React.memo(
  ({ id, data, selected }) => {
    const updateNodeInternals = useUpdateNodeInternals();

    // Update React Flow's internal calculations when port count changes
    useEffect(() => {
      updateNodeInternals(id);
    }, [id, updateNodeInternals]);

    return (
      <div
        className={`ask-user-question-node ${selected ? 'selected' : ''}`}
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
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '8px',
          }}
        >
          <div
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--vscode-descriptionForeground)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Ask User Question
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            {data.useAiSuggestions && (
              <div
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  backgroundColor: 'var(--vscode-badge-background)',
                  color: 'var(--vscode-badge-foreground)',
                  borderRadius: '3px',
                  fontWeight: 600,
                }}
              >
                AI
              </div>
            )}
            {data.multiSelect && (
              <div
                style={{
                  fontSize: '9px',
                  padding: '2px 6px',
                  backgroundColor: 'var(--vscode-badge-background)',
                  color: 'var(--vscode-badge-foreground)',
                  borderRadius: '3px',
                  fontWeight: 600,
                }}
              >
                MULTI
              </div>
            )}
          </div>
        </div>

        {/* Question Text */}
        <div
          style={{
            fontSize: '13px',
            color: 'var(--vscode-foreground)',
            marginBottom: '12px',
            fontWeight: 500,
          }}
        >
          {data.questionText || 'Untitled Question'}
        </div>

        {/* Options List - only show when not using AI suggestions */}
        {!data.useAiSuggestions && data.options && data.options.length > 0 && (
          <div style={{ marginBottom: '8px' }}>
            {data.options.map((option) => (
              <div
                key={option.label}
                style={{
                  fontSize: '11px',
                  color: 'var(--vscode-descriptionForeground)',
                  backgroundColor: 'var(--vscode-badge-background)',
                  padding: '4px 8px',
                  borderRadius: '3px',
                  marginBottom: '4px',
                }}
              >
                {option.label}
              </div>
            ))}
          </div>
        )}

        {/* AI Suggestions Indicator */}
        {data.useAiSuggestions && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--vscode-descriptionForeground)',
              fontStyle: 'italic',
              marginBottom: '8px',
            }}
          >
            Options will be suggested by AI
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
        {data.useAiSuggestions || data.multiSelect ? (
          /* AI suggestions or multi-select: single output handle */
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
        ) : (
          /* Single select with user-defined options: multiple output handles (2-4 branches) */
          data.options.map((option, i) => (
            <Handle
              key={`branch-${option.label}`}
              type="source"
              position={Position.Right}
              id={`branch-${i}`}
              style={{
                width: '12px',
                height: '12px',
                backgroundColor: 'var(--vscode-button-background)',
                border: '2px solid var(--vscode-button-foreground)',
                top: `${((i + 1) / (data.options.length + 1)) * 100}%`,
              }}
            />
          ))
        )}
      </div>
    );
  }
);

AskUserQuestionNodeComponent.displayName = 'AskUserQuestionNode';
