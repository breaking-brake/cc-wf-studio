/**
 * Renders the per-node execution instructions Markdown produced by
 * `generateExecutionInstructions`. Each node section heading (`#### {nodeId}(...)`)
 * gets an `id="overview-section-{sanitizedNodeId}"` so the parent can scroll to it.
 *
 * Exposes an imperative `scrollToNode(nodeId)` via `forwardRef`.
 */

import {
  generateExecutionInstructions,
  sanitizeNodeId,
} from '@shared/services/workflow-prompt-generator';
import type { Workflow } from '@shared/types/messages';
import { forwardRef, useImperativeHandle, useMemo, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export interface InstructionsPanelHandle {
  scrollToNode: (nodeId: string) => void;
}

interface InstructionsPanelProps {
  workflow: Workflow;
}

/** Extract sanitized node ID from heading text like "node-1(Sub-Agent: name)". */
function extractNodeIdFromHeading(text: string): string | null {
  const m = text.match(/^([a-zA-Z0-9_-]+)\(/);
  return m ? m[1] : null;
}

export const InstructionsPanel = forwardRef<InstructionsPanelHandle, InstructionsPanelProps>(
  ({ workflow }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [highlightedSanitizedId, setHighlightedSanitizedId] = useState<string | null>(null);
    const highlightTimerRef = useRef<number | null>(null);

    const markdown = useMemo(
      () =>
        generateExecutionInstructions(workflow, {
          provider: 'claude-code',
          subAgentFlows: workflow.subAgentFlows,
          parentWorkflowName: workflow.name,
          highlightEnabled: false,
        }),
      [workflow]
    );

    useImperativeHandle(ref, () => ({
      scrollToNode: (nodeId: string) => {
        const sanitized = sanitizeNodeId(nodeId);
        const target = document.getElementById(`overview-section-${sanitized}`);
        if (!target) return;
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setHighlightedSanitizedId(sanitized);
        if (highlightTimerRef.current !== null) {
          window.clearTimeout(highlightTimerRef.current);
        }
        highlightTimerRef.current = window.setTimeout(() => {
          setHighlightedSanitizedId(null);
          highlightTimerRef.current = null;
        }, 1200);
      },
    }));

    return (
      <div
        ref={containerRef}
        className="overview-instructions-panel"
        style={{
          width: '100%',
          height: '100%',
          overflowY: 'auto',
          padding: '16px 24px',
          boxSizing: 'border-box',
          fontSize: '13px',
          lineHeight: 1.6,
          color: 'var(--vscode-foreground)',
        }}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h4: ({ children }) => {
              const text = (Array.isArray(children) ? children : [children])
                .map((c) => (typeof c === 'string' ? c : ''))
                .join('');
              const sanitized = extractNodeIdFromHeading(text);
              const id = sanitized ? `overview-section-${sanitized}` : undefined;
              const isHighlighted = sanitized === highlightedSanitizedId;
              return (
                <h4
                  id={id}
                  data-highlight={isHighlighted ? 'true' : undefined}
                  tabIndex={sanitized ? 0 : undefined}
                  className="overview-section-heading"
                  style={{
                    scrollMarginTop: '16px',
                    margin: '24px 0 8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: 'var(--vscode-foreground)',
                  }}
                >
                  {children}
                </h4>
              );
            },
            h2: ({ children }) => (
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: '0 0 12px' }}>{children}</h2>
            ),
            h3: ({ children }) => (
              <h3 style={{ fontSize: '15px', fontWeight: 600, margin: '20px 0 8px' }}>
                {children}
              </h3>
            ),
            code: ({ children, ...props }) => {
              // Inline code (no language prop)
              return (
                <code
                  {...props}
                  style={{
                    backgroundColor: 'var(--vscode-textCodeBlock-background)',
                    padding: '1px 4px',
                    borderRadius: '3px',
                    fontFamily: 'var(--vscode-editor-font-family)',
                    fontSize: '12px',
                  }}
                >
                  {children}
                </code>
              );
            },
            pre: ({ children }) => (
              <pre
                style={{
                  backgroundColor: 'var(--vscode-textCodeBlock-background)',
                  padding: '12px',
                  borderRadius: '4px',
                  overflowX: 'auto',
                  fontSize: '12px',
                  fontFamily: 'var(--vscode-editor-font-family)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                }}
              >
                {children}
              </pre>
            ),
            table: ({ children }) => (
              <table style={{ borderCollapse: 'collapse', margin: '8px 0', fontSize: '12px' }}>
                {children}
              </table>
            ),
            th: ({ children }) => (
              <th
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--vscode-panel-border)',
                  textAlign: 'left',
                  backgroundColor: 'var(--vscode-editor-background)',
                }}
              >
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td
                style={{
                  padding: '4px 8px',
                  border: '1px solid var(--vscode-panel-border)',
                }}
              >
                {children}
              </td>
            ),
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>
    );
  }
);

InstructionsPanel.displayName = 'InstructionsPanel';
