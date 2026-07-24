/**
 * Node Search Panel (canvas find widget)
 *
 * Opened with Ctrl/Cmd+F or the toolbar Search button. Matches nodes by
 * their display name (label / name / question / tool), free-text content
 * (prompt, description) and node type; the current match is selected on
 * the canvas and the viewport centers on it. Enter / ↓ cycles forward,
 * Shift+Enter / ↑ backward, Esc closes.
 *
 * Selection state is excluded from undo history and canvas-revision
 * tracking (see workflow-store partialize), so searching never dirties
 * the workflow.
 */

import { ChevronDown, ChevronUp, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { type Node, useReactFlow } from 'reactflow';
import { useTranslation } from '../i18n/i18n-context';
import { useWorkflowStore } from '../stores/workflow-store';

interface NodeSearchPanelProps {
  /** Re-focus the input when this changes (Ctrl/Cmd+F while already open) */
  focusNonce: number;
  onClose: () => void;
}

/** Mirror of the node headers' display-name resolution, in priority order */
function nodeDisplayName(node: Node): string {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const str = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  return (
    str(data.label) ??
    str(data.name) ??
    str(data.questionText) ??
    str(data.toolName) ??
    str(data.description) ??
    node.type ??
    node.id
  );
}

/** Free-text fields worth searching beyond the display name */
const CONTENT_FIELDS = [
  'label',
  'name',
  'questionText',
  'toolName',
  'description',
  'prompt',
  'executionPrompt',
] as const;

function nodeSearchText(node: Node): string {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const parts: string[] = [node.type ?? ''];
  for (const field of CONTENT_FIELDS) {
    const value = data[field];
    if (typeof value === 'string') parts.push(value);
  }
  return parts.join('\n').toLowerCase();
}

const ICON_BUTTON_STYLE: React.CSSProperties = {
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
};

export const NodeSearchPanel: React.FC<NodeSearchPanelProps> = ({ focusNonce, onClose }) => {
  const { t } = useTranslation();
  const reactFlow = useReactFlow();
  const nodes = useWorkflowStore((s) => s.nodes);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus (and select) the input on open and on repeated Ctrl/Cmd+F
  // biome-ignore lint/correctness/useExhaustiveDependencies: focusNonce is the re-focus trigger, not read inside
  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, [focusNonce]);

  const matches = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (trimmed.length === 0) return [];
    return nodes.filter((node) => nodeSearchText(node).includes(trimmed));
  }, [nodes, query]);

  // Nodes can change while the panel is open (e.g. undo) — keep index valid
  const safeIndex = matches.length === 0 ? 0 : Math.min(activeIndex, matches.length - 1);

  /** Select the match on the canvas and center the viewport on it */
  const jumpTo = (nodeId: string) => {
    const { nodes: currentNodes, setNodes, syncSelectedNodeId } = useWorkflowStore.getState();
    setNodes(currentNodes.map((n) => ({ ...n, selected: n.id === nodeId })));
    syncSelectedNodeId(nodeId);
    // getNode returns the internal node: positionAbsolute resolves group
    // children, width/height are the measured dimensions
    const internal = reactFlow.getNode(nodeId);
    if (!internal) return;
    const x = (internal.positionAbsolute?.x ?? internal.position.x) + (internal.width ?? 200) / 2;
    const y = (internal.positionAbsolute?.y ?? internal.position.y) + (internal.height ?? 80) / 2;
    reactFlow.setCenter(x, y, { zoom: Math.max(reactFlow.getZoom(), 0.8), duration: 300 });
  };

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setActiveIndex(0);
    const trimmed = value.trim().toLowerCase();
    if (trimmed.length === 0) return;
    const first = nodes.find((node) => nodeSearchText(node).includes(trimmed));
    if (first) jumpTo(first.id);
  };

  const step = (delta: number) => {
    if (matches.length === 0) return;
    const next = (safeIndex + delta + matches.length) % matches.length;
    setActiveIndex(next);
    jumpTo(matches[next].id);
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === 'Enter' || event.key === 'ArrowDown') {
      event.preventDefault();
      step(event.key === 'Enter' && event.shiftKey ? -1 : 1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      step(-1);
      return;
    }
    // Ctrl/Cmd+F while the input is focused: keep our widget, skip the
    // browser's find (the global shortcut handler ignores editable targets)
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'f') {
      event.preventDefault();
      inputRef.current?.select();
    }
  };

  const showList = query.trim().length > 0 && matches.length > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: '260px',
        maxWidth: '320px',
        backgroundColor: 'var(--vscode-editor-background)',
        border: '1px solid var(--vscode-panel-border)',
        borderRadius: '6px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
        padding: '4px',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          placeholder={t('canvasSearch.placeholder')}
          aria-label={t('canvasSearch.tooltip')}
          style={{
            flex: 1,
            minWidth: 0,
            height: '24px',
            padding: '0 6px',
            backgroundColor: 'var(--vscode-input-background)',
            color: 'var(--vscode-input-foreground)',
            border: '1px solid var(--vscode-input-border, transparent)',
            borderRadius: '4px',
            outline: 'none',
            fontSize: '12px',
            boxSizing: 'border-box',
          }}
        />
        <span
          aria-live="polite"
          style={{
            fontSize: '11px',
            color: 'var(--vscode-descriptionForeground)',
            whiteSpace: 'nowrap',
            padding: '0 2px',
          }}
        >
          {query.trim().length === 0
            ? ''
            : matches.length === 0
              ? t('canvasSearch.noResults')
              : `${safeIndex + 1} / ${matches.length}`}
        </span>
        <button
          type="button"
          onClick={() => step(-1)}
          disabled={matches.length === 0}
          aria-label={t('canvasSearch.previous')}
          title={t('canvasSearch.previous')}
          style={{ ...ICON_BUTTON_STYLE, opacity: matches.length === 0 ? 0.4 : 1 }}
        >
          <ChevronUp size={14} />
        </button>
        <button
          type="button"
          onClick={() => step(1)}
          disabled={matches.length === 0}
          aria-label={t('canvasSearch.next')}
          title={t('canvasSearch.next')}
          style={{ ...ICON_BUTTON_STYLE, opacity: matches.length === 0 ? 0.4 : 1 }}
        >
          <ChevronDown size={14} />
        </button>
        <button
          type="button"
          onClick={onClose}
          aria-label={t('canvasSearch.close')}
          title={t('canvasSearch.close')}
          style={ICON_BUTTON_STYLE}
        >
          <X size={14} />
        </button>
      </div>
      {showList && (
        <div
          style={{
            marginTop: '4px',
            maxHeight: '192px',
            overflowY: 'auto',
            borderTop: '1px solid var(--vscode-panel-border)',
            paddingTop: '4px',
          }}
        >
          {matches.map((node, index) => {
            const isActive = index === safeIndex;
            return (
              <div
                key={node.id}
                role="button"
                tabIndex={0}
                onClick={() => {
                  setActiveIndex(index);
                  jumpTo(node.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveIndex(index);
                    jumpTo(node.id);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  padding: '3px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  backgroundColor: isActive
                    ? 'var(--vscode-list-activeSelectionBackground)'
                    : 'transparent',
                  color: isActive
                    ? 'var(--vscode-list-activeSelectionForeground)'
                    : 'var(--vscode-foreground)',
                }}
              >
                <span
                  style={{
                    fontSize: '12px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {nodeDisplayName(node)}
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    opacity: 0.7,
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--vscode-editor-font-family, monospace)',
                  }}
                >
                  {node.type}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
