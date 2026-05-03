/**
 * Mermaid flowchart renderer for Overview mode.
 *
 * - Loads `mermaid` lazily so it does not bloat the edit-mode bundle.
 * - Generates the flowchart source via `generateMermaidFlowchart` from shared services.
 * - After rendering, attaches click handlers directly to SVG nodes (avoids the
 *   `click ... call ...` Mermaid syntax so we can keep `securityLevel: 'strict'`).
 */

import {
  generateMermaidFlowchart,
  sanitizeNodeId,
} from '@shared/services/workflow-prompt-generator';
import type { Workflow } from '@shared/types/messages';
import type React from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface MermaidDiagramProps {
  workflow: Workflow;
  onNodeClick: (nodeId: string) => void;
}

const MERMAID_THEME_DARK = {
  theme: 'dark' as const,
  themeVariables: {
    background: 'transparent',
    primaryColor: '#1e1e1e',
    primaryTextColor: '#cccccc',
    primaryBorderColor: '#666666',
    lineColor: '#888888',
    secondaryColor: '#252526',
    tertiaryColor: '#2d2d30',
  },
};

const MERMAID_THEME_LIGHT = {
  theme: 'default' as const,
  themeVariables: {
    background: 'transparent',
    primaryColor: '#ffffff',
    primaryTextColor: '#1e1e1e',
    primaryBorderColor: '#999999',
    lineColor: '#666666',
    secondaryColor: '#f3f3f3',
    tertiaryColor: '#eaeaea',
  },
};

function detectVscodeTheme(): 'dark' | 'light' {
  // VS Code injects body classes: vscode-dark, vscode-light, vscode-high-contrast
  if (typeof document === 'undefined') return 'dark';
  const cls = document.body.className;
  if (cls.includes('vscode-light')) return 'light';
  return 'dark';
}

/** Strip surrounding ```mermaid ``` fences if present. */
function stripFences(source: string): string {
  return source
    .replace(/^\s*```mermaid\s*\n/, '')
    .replace(/\n```\s*$/, '')
    .trim();
}

/**
 * Build a sanitized→original ID lookup so clicks on the SVG (which uses
 * sanitized IDs) can route back to the workflow node IDs the parent expects.
 */
function buildIdLookup(workflow: Workflow): Map<string, string> {
  const lookup = new Map<string, string>();
  for (const node of workflow.nodes) {
    lookup.set(sanitizeNodeId(node.id), node.id);
  }
  return lookup;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({ workflow, onNodeClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);

  const source = useMemo(() => {
    const raw = generateMermaidFlowchart({
      nodes: workflow.nodes,
      connections: workflow.connections.map((c) => ({
        from: c.from,
        to: c.to,
        fromPort: c.fromPort,
      })),
    });
    return stripFences(raw);
  }, [workflow.nodes, workflow.connections]);

  const idLookup = useMemo(() => buildIdLookup(workflow), [workflow]);

  useEffect(() => {
    let cancelled = false;
    const container = containerRef.current;
    if (!container) return;

    const render = async () => {
      try {
        const mermaidModule = await import('mermaid');
        if (cancelled) return;
        const mermaid = mermaidModule.default;

        const theme = detectVscodeTheme();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          ...(theme === 'dark' ? MERMAID_THEME_DARK : MERMAID_THEME_LIGHT),
          flowchart: { useMaxWidth: true, htmlLabels: true, curve: 'basis' },
        });

        const renderId = `overview-mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(renderId, source);
        if (cancelled) return;

        container.innerHTML = svg;
        setRenderError(null);

        // Attach click handlers to each rendered node.
        // Mermaid emits node group ids as `flowchart-{sanitizedId}-N`.
        const svgEl = container.querySelector('svg');
        if (!svgEl) return;
        // Make SVG fill the container so it scales naturally.
        svgEl.style.maxWidth = '100%';
        svgEl.style.height = 'auto';

        const nodeEls = svgEl.querySelectorAll<SVGElement>('g.node');
        nodeEls.forEach((nodeEl) => {
          const match = nodeEl.id.match(/^flowchart-(.+)-\d+$/);
          if (!match) return;
          const sanitized = match[1];
          const original = idLookup.get(sanitized);
          if (!original) return;
          nodeEl.style.cursor = 'pointer';
          nodeEl.setAttribute('data-overview-node-id', original);
          nodeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            onNodeClick(original);
          });
        });
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        setRenderError(msg);
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [source, idLookup, onNodeClick]);

  if (renderError) {
    return (
      <div
        style={{
          padding: '16px',
          fontSize: '12px',
          color: 'var(--vscode-errorForeground)',
        }}
      >
        Failed to render flowchart: {renderError}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="overview-mermaid-container"
      style={{
        width: '100%',
        padding: '16px',
        boxSizing: 'border-box',
      }}
    />
  );
};
