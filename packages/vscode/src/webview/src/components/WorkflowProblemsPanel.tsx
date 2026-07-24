/**
 * Workflow Problems Panel
 *
 * Lists every validation issue in the current workflow — found by the same
 * core validator the MCP server and `ccwf validate` use — and lets the user
 * click a node-scoped issue to jump straight to the offending node. Opens
 * automatically when a save/export fails validation, or manually from the
 * canvas toolbar Problems button. The issue list is computed live in
 * WorkflowEditor (one validation pass shared with the on-canvas node
 * markers), so issues disappear as they are fixed.
 */

import { CheckCircle2, X, XCircle } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { useReactFlow } from 'reactflow';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';
import { jumpToNode, nodeDisplayName } from '../utils/canvas-navigation';
import type { WorkflowIssue } from '../utils/workflow-issues';

interface WorkflowProblemsPanelProps {
  issues: WorkflowIssue[];
  onClose: () => void;
}

export const WorkflowProblemsPanel: React.FC<WorkflowProblemsPanelProps> = ({
  issues,
  onClose,
}) => {
  const { t } = useTranslation();
  const reactFlow = useReactFlow();
  const nodes = useWorkflowStore((s) => s.nodes);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: '320px',
        maxWidth: '420px',
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        padding: '4px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '2px 4px',
        }}
      >
        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--vscode-foreground)' }}>
          {t('problemsPanel.title')}
        </span>
        {issues.length > 0 && (
          <span
            aria-live="polite"
            style={{
              fontSize: '11px',
              lineHeight: 1,
              padding: '3px 6px',
              borderRadius: '8px',
              backgroundColor: 'var(--vscode-badge-background)',
              color: 'var(--vscode-badge-foreground)',
            }}
          >
            {issues.length}
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button
          type="button"
          onClick={onClose}
          aria-label={t('problemsPanel.close')}
          title={t('problemsPanel.close')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '22px',
            height: '22px',
            padding: 0,
            border: 'none',
            borderRadius: '4px',
            backgroundColor: 'transparent',
            color: 'var(--vscode-foreground)',
            cursor: 'pointer',
          }}
        >
          <X size={14} />
        </button>
      </div>
      <div
        style={{
          marginTop: '2px',
          maxHeight: '220px',
          overflowY: 'auto',
          borderTop: '1px solid var(--vscode-panel-border)',
          paddingTop: '4px',
        }}
      >
        {issues.length === 0 ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '4px 6px',
              fontSize: '12px',
              color: 'var(--vscode-descriptionForeground)',
            }}
          >
            <CheckCircle2
              size={14}
              style={{ flexShrink: 0, color: 'var(--vscode-charts-green)' }}
            />
            <span>{t('problemsPanel.noProblems')}</span>
          </div>
        ) : (
          issues.map((issue) => {
            const node = issue.nodeId ? nodeById.get(issue.nodeId) : undefined;
            const clickable = node !== undefined;
            const jump = () => {
              if (issue.nodeId) jumpToNode(reactFlow, issue.nodeId);
            };
            return (
              <div
                key={issue.key}
                role={clickable ? 'button' : undefined}
                tabIndex={clickable ? 0 : undefined}
                onClick={clickable ? jump : undefined}
                onKeyDown={
                  clickable
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          jump();
                        }
                      }
                    : undefined
                }
                title={clickable ? t('problemsPanel.jumpTooltip') : undefined}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '6px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  cursor: clickable ? 'pointer' : 'default',
                  color: 'var(--vscode-foreground)',
                }}
                onMouseEnter={
                  clickable
                    ? (e) => {
                        e.currentTarget.style.backgroundColor =
                          'var(--vscode-list-hoverBackground)';
                      }
                    : undefined
                }
                onMouseLeave={
                  clickable
                    ? (e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    : undefined
                }
              >
                <XCircle
                  size={13}
                  style={{
                    flexShrink: 0,
                    marginTop: '2px',
                    color: 'var(--vscode-charts-red)',
                  }}
                />
                <span style={{ flex: 1, fontSize: '12px', lineHeight: 1.4 }}>{issue.message}</span>
                <span
                  style={{
                    flexShrink: 0,
                    fontSize: '10px',
                    opacity: 0.7,
                    whiteSpace: 'nowrap',
                    marginTop: '2px',
                    maxWidth: '110px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    fontFamily: 'var(--vscode-editor-font-family, monospace)',
                  }}
                >
                  {node ? nodeDisplayName(node) : t('problemsPanel.workflowScope')}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
