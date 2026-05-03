/**
 * Renders the per-node Markdown produced by `generateOverviewMarkdown` (the
 * human-friendly Overview formatter). Each node section heading
 * (`## {nodeId}({title})` — also h3/h4 for forward-compat) gets an
 * `id="overview-section-{sanitizedNodeId}"` so the parent can scroll to it.
 *
 * Exposes an imperative `scrollToNode(nodeId)` via `forwardRef`.
 */

import { generateOverviewMarkdown } from '@shared/services/workflow-overview-formatter';
import { sanitizeNodeId } from '@shared/services/workflow-prompt-generator';
import type { Workflow } from '@shared/types/messages';
import type React from 'react';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const SECTION_ANCHOR_PREFIX = '#overview-section-';

export interface InstructionsPanelHandle {
  scrollToNode: (nodeId: string) => void;
}

interface InstructionsPanelProps {
  workflow: Workflow;
  /**
   * Called when the section currently nearest the top of the panel changes.
   * Emits the *sanitized* node id (matching the section heading anchor),
   * or null when the user has scrolled above the first section.
   */
  onActiveSectionChange?: (sanitizedNodeId: string | null) => void;
}

/** Extract sanitized node ID from heading text like "node-1(Sub-Agent: name)". */
function extractNodeIdFromHeading(text: string): string | null {
  const m = text.match(/^([a-zA-Z0-9_-]+)\(/);
  return m ? m[1] : null;
}

export const InstructionsPanel = forwardRef<InstructionsPanelHandle, InstructionsPanelProps>(
  ({ workflow, onActiveSectionChange }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [highlightedSanitizedId, setHighlightedSanitizedId] = useState<string | null>(null);
    const highlightTimerRef = useRef<number | null>(null);

    const markdown = useMemo(() => generateOverviewMarkdown(workflow), [workflow]);

    // Track which section is currently at/just-above the top of the viewport
    // and notify the parent. The "active" section is the last heading whose
    // top has scrolled past a fixed offset from the top of the panel.
    // `markdown` is in the dep list so the effect re-runs after ReactMarkdown
    // emits a new heading set (and the initial active id is reported for the
    // new content even without scrolling).
    const lastActiveSanitizedRef = useRef<string | null>(null);
    // biome-ignore lint/correctness/useExhaustiveDependencies: markdown drives DOM rebuild
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;
      if (!onActiveSectionChange) return;

      const ACTIVATION_OFFSET = 80; // px from top of panel; matches header padding visually

      const computeActive = () => {
        const headings = container.querySelectorAll<HTMLElement>('.overview-section-heading');
        const containerTop = container.getBoundingClientRect().top;
        let active: string | null = null;
        for (const h of headings) {
          const rel = h.getBoundingClientRect().top - containerTop;
          if (rel <= ACTIVATION_OFFSET) {
            const id = h.id?.replace(/^overview-section-/, '') || null;
            if (id) active = id;
          } else {
            break; // headings appear in document order
          }
        }
        if (active !== lastActiveSanitizedRef.current) {
          lastActiveSanitizedRef.current = active;
          onActiveSectionChange(active);
        }
      };

      computeActive();
      container.addEventListener('scroll', computeActive, { passive: true });
      return () => container.removeEventListener('scroll', computeActive);
    }, [markdown, onActiveSectionChange]);

    /**
     * Build the renderer for a heading level: extracts the node id from the
     * `nodeId(title)` pattern and applies `id`/`data-highlight`. Used for
     * h2/h3/h4 so any of them can act as a scroll anchor.
     */
    const buildHeadingRenderer = (
      level: 2 | 3 | 4,
      defaultStyle: React.CSSProperties
    ): React.FC<{ children?: React.ReactNode }> => {
      const Tag = `h${level}` as 'h2' | 'h3' | 'h4';
      return ({ children }) => {
        const text = (Array.isArray(children) ? children : [children])
          .map((c) => (typeof c === 'string' ? c : ''))
          .join('');
        const sanitized = extractNodeIdFromHeading(text);
        const id = sanitized ? `overview-section-${sanitized}` : undefined;
        const isHighlighted = sanitized === highlightedSanitizedId;
        return (
          <Tag
            id={id}
            data-highlight={isHighlighted ? 'true' : undefined}
            tabIndex={sanitized ? 0 : undefined}
            className={sanitized ? 'overview-section-heading' : undefined}
            style={{
              scrollMarginTop: '16px',
              ...defaultStyle,
            }}
          >
            {children}
          </Tag>
        );
      };
    };

    /** Shared scroll-and-highlight implementation used by both the imperative
     *  ref API and the inline-link click handler. */
    const scrollToSanitized = useCallback((sanitized: string) => {
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
    }, []);

    useImperativeHandle(ref, () => ({
      scrollToNode: (nodeId: string) => scrollToSanitized(sanitizeNodeId(nodeId)),
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
            h2: buildHeadingRenderer(2, {
              fontSize: '18px',
              fontWeight: 600,
              margin: '32px 0 12px',
              color: 'var(--vscode-foreground)',
            }),
            h3: buildHeadingRenderer(3, {
              fontSize: '15px',
              fontWeight: 600,
              margin: '20px 0 8px',
              color: 'var(--vscode-foreground)',
            }),
            h4: buildHeadingRenderer(4, {
              fontSize: '14px',
              fontWeight: 600,
              margin: '24px 0 8px',
              color: 'var(--vscode-foreground)',
            }),
            h1: ({ children }) => (
              <h1
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  margin: '0 0 8px',
                  color: 'var(--vscode-foreground)',
                }}
              >
                {children}
              </h1>
            ),
            blockquote: ({ children }) => (
              <blockquote
                style={{
                  margin: '8px 0',
                  padding: '4px 12px',
                  borderLeft: '3px solid var(--vscode-panel-border)',
                  color: 'var(--vscode-descriptionForeground)',
                }}
              >
                {children}
              </blockquote>
            ),
            hr: () => (
              <hr
                style={{
                  border: 'none',
                  borderTop: '1px solid var(--vscode-panel-border)',
                  margin: '20px 0',
                }}
              />
            ),
            a: ({ href, children }) => {
              // Inline `→ Next: nodeId(title)` references are emitted as
              // anchors to `#overview-section-{sanitized}`; intercept them so
              // the click triggers the same smooth-scroll + highlight UX as
              // a Mermaid node click.
              if (href?.startsWith(SECTION_ANCHOR_PREFIX)) {
                const sanitized = href.slice(SECTION_ANCHOR_PREFIX.length);
                return (
                  <a
                    href={href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToSanitized(sanitized);
                    }}
                    style={{
                      color: 'var(--vscode-textLink-foreground)',
                      textDecoration: 'none',
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'underline';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLAnchorElement).style.textDecoration = 'none';
                    }}
                  >
                    {children}
                  </a>
                );
              }
              return (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--vscode-textLink-foreground)' }}
                >
                  {children}
                </a>
              );
            },
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
