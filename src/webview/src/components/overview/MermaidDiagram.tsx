/**
 * Mermaid flowchart renderer for Overview mode.
 *
 * - Loads `mermaid` lazily so it does not bloat the edit-mode bundle.
 * - Generates the flowchart source via `generateMermaidFlowchart` from shared services.
 * - After rendering, attaches click handlers directly to SVG nodes (avoids the
 *   `click ... call ...` Mermaid syntax so we can keep `securityLevel: 'strict'`).
 * - Renders the SVG at its natural size and provides custom pan + zoom so the
 *   diagram is readable even when it is much larger than the panel.
 */

import {
  generateMermaidFlowchart,
  sanitizeNodeId,
} from '@shared/services/workflow-prompt-generator';
import type { Workflow } from '@shared/types/messages';
import {
  Locate,
  LocateOff,
  Maximize2,
  Minus,
  MoveHorizontal,
  MoveVertical,
  Plus,
} from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface MermaidDiagramProps {
  workflow: Workflow;
  onNodeClick: (nodeId: string) => void;
  /**
   * Sanitized node id of the section currently in view in the right pane.
   * The matching SVG node group gets the `overview-active` class so the user
   * can see "you're reading this node".
   */
  activeSanitizedNodeId?: string | null;
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

const MIN_SCALE = 0.2;
const MAX_SCALE = 4;
const FIT_PADDING = 24;
const DIRECTION_STORAGE_KEY = 'cc-wf-studio.overviewMermaidDirection';
type FlowDirection = 'TD' | 'LR';
function loadStoredDirection(): FlowDirection {
  // Default is LR (left-to-right). Only an explicit stored 'TD' opts back in.
  try {
    const v = localStorage.getItem(DIRECTION_STORAGE_KEY);
    return v === 'TD' ? 'TD' : 'LR';
  } catch {
    return 'LR';
  }
}

function detectVscodeTheme(): 'dark' | 'light' {
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

/** Escape a string for safe use in a CSS attribute selector. */
function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') {
    return CSS.escape(value);
  }
  // Sanitized node ids only contain [A-Za-z0-9_-]; nothing to escape in that
  // alphabet, so a no-op fallback is safe enough.
  return value.replace(/"/g, '\\"');
}

interface Transform {
  scale: number;
  x: number;
  y: number;
}

export const MermaidDiagram: React.FC<MermaidDiagramProps> = ({
  workflow,
  onNodeClick,
  activeSanitizedNodeId,
}) => {
  // The viewport is the visible area; the stage holds the rendered SVG and is
  // translated/scaled by the transform state.
  const viewportRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [renderError, setRenderError] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>({ scale: 1, x: 0, y: 0 });
  // We mirror the transform in a ref so wheel/drag handlers can read the
  // current value without taking it as a dependency (which would re-bind the
  // listener on every state change).
  const transformRef = useRef(transform);
  useEffect(() => {
    transformRef.current = transform;
  }, [transform]);

  // Flowchart layout direction (TD = top-down, LR = left-to-right). Persisted
  // in localStorage so the user's preference survives reloads.
  const [direction, setDirection] = useState<FlowDirection>(() => loadStoredDirection());
  useEffect(() => {
    try {
      localStorage.setItem(DIRECTION_STORAGE_KEY, direction);
    } catch {
      // ignore quota errors
    }
  }, [direction]);

  const source = useMemo(() => {
    const raw = generateMermaidFlowchart({
      nodes: workflow.nodes,
      connections: workflow.connections.map((c) => ({
        from: c.from,
        to: c.to,
        fromPort: c.fromPort,
      })),
      // Overview shows the full prompt in the right-hand instructions panel,
      // so the diagram only needs the node type + title.
      labelMode: 'concise',
      direction,
    });
    return stripFences(raw);
  }, [workflow.nodes, workflow.connections, direction]);

  const idLookup = useMemo(() => buildIdLookup(workflow), [workflow]);

  // Mirror activeSanitizedNodeId in a ref so the render effect (which doesn't
  // depend on this prop) can re-apply the highlight without re-running.
  const activeSanitizedRef = useRef<string | null>(activeSanitizedNodeId ?? null);
  useEffect(() => {
    activeSanitizedRef.current = activeSanitizedNodeId ?? null;
  }, [activeSanitizedNodeId]);

  /** Toggle the `overview-active` class so the SVG node currently being
   *  read in the right pane stands out. Idempotent: clears any previous
   *  highlight first. */
  const applyActiveHighlight = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    stage.querySelectorAll<SVGElement>('g.node.overview-active').forEach((el) => {
      el.classList.remove('overview-active');
    });
    const id = activeSanitizedRef.current;
    if (!id) return;
    const target = stage.querySelector<SVGElement>(
      `g.node[data-overview-sanitized="${cssEscape(id)}"]`
    );
    target?.classList.add('overview-active');
  }, []);

  // Re-apply highlight whenever the prop changes (independent of re-render).
  // The effect uses `activeSanitizedRef` internally; the prop is only here to
  // trigger the re-run.
  // biome-ignore lint/correctness/useExhaustiveDependencies: see comment above
  useEffect(() => {
    applyActiveHighlight();
  }, [activeSanitizedNodeId, applyActiveHighlight]);

  // ---- Follow mode -------------------------------------------------------
  // When ON, programmatically pan the stage so the active node stays visible
  // in the viewport. Default: ON (the natural reading flow expectation).
  const [followActive, setFollowActive] = useState(true);
  /** Pan the stage so the highlighted node lies inside the viewport (with
   * margin). No-op if the node is already comfortably visible. */
  const ensureNodeVisible = useCallback((sanitized: string) => {
    const stage = stageRef.current;
    const viewport = viewportRef.current;
    if (!stage || !viewport) return;
    const nodeEl = stage.querySelector<SVGElement>(
      `g.node[data-overview-sanitized="${cssEscape(sanitized)}"]`
    );
    if (!nodeEl) return;
    const nodeRect = nodeEl.getBoundingClientRect();
    const vpRect = viewport.getBoundingClientRect();
    const MARGIN = 32;
    const visible =
      nodeRect.left >= vpRect.left + MARGIN &&
      nodeRect.right <= vpRect.right - MARGIN &&
      nodeRect.top >= vpRect.top + MARGIN &&
      nodeRect.bottom <= vpRect.bottom - MARGIN;
    if (visible) return;
    // Move the node centre to the viewport centre.
    const dx = (vpRect.left + vpRect.right) / 2 - (nodeRect.left + nodeRect.right) / 2;
    const dy = (vpRect.top + vpRect.bottom) / 2 - (nodeRect.top + nodeRect.bottom) / 2;
    const cur = transformRef.current;
    // Mark the stage as "animating" so the CSS transition kicks in for this
    // pan only; user-driven drag/wheel never touches this attribute.
    stage.setAttribute('data-follow-animating', 'true');
    setTransform({ scale: cur.scale, x: cur.x + dx, y: cur.y + dy });
    window.setTimeout(() => stage.removeAttribute('data-follow-animating'), 400);
  }, []);
  // Whenever the active node changes (and follow mode is on), re-centre.
  useEffect(() => {
    if (!followActive) return;
    if (!activeSanitizedNodeId) return;
    // Defer one frame so the highlight class has been applied first.
    const id = activeSanitizedNodeId;
    requestAnimationFrame(() => ensureNodeVisible(id));
  }, [activeSanitizedNodeId, followActive, ensureNodeVisible]);

  /** Scale the SVG so it fully fits the viewport, then centre it. */
  const fitToViewport = useCallback(() => {
    const viewport = viewportRef.current;
    const stage = stageRef.current;
    if (!viewport || !stage) return;
    const svg = stage.querySelector('svg');
    if (!svg) return;
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    const sw = svg.getBoundingClientRect().width / transformRef.current.scale;
    const sh = svg.getBoundingClientRect().height / transformRef.current.scale;
    if (!sw || !sh) return;
    const scale = Math.min((vw - FIT_PADDING) / sw, (vh - FIT_PADDING) / sh, 1);
    const safeScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scale));
    const x = (vw - sw * safeScale) / 2;
    const y = (vh - sh * safeScale) / 2;
    setTransform({ scale: safeScale, x, y });
  }, []);

  // Render the SVG when source or theme changes.
  // `applyActiveHighlight` is intentionally not in the dep list: it is a
  // stable useCallback and including it would not change when the render
  // should re-run.
  // biome-ignore lint/correctness/useExhaustiveDependencies: applyActiveHighlight is stable
  useEffect(() => {
    let cancelled = false;
    const stage = stageRef.current;
    if (!stage) return;

    const render = async () => {
      try {
        const mermaidModule = (await import('mermaid')) as unknown;
        if (cancelled) return;
        if (!mermaidModule || typeof mermaidModule !== 'object') {
          throw new Error(
            `mermaid dynamic import resolved with ${
              mermaidModule === undefined ? 'undefined' : String(mermaidModule)
            } — likely a CSP or chunk-load failure. Check DevTools network/console.`
          );
        }
        type MermaidLike = {
          initialize: (config: unknown) => void;
          render: (id: string, source: string) => Promise<{ svg: string }>;
        };
        const candidate = mermaidModule as { default?: MermaidLike } & Partial<MermaidLike>;
        const mermaid: MermaidLike | undefined =
          candidate.default ??
          (typeof candidate.initialize === 'function' ? (candidate as MermaidLike) : undefined);
        if (!mermaid || typeof mermaid.initialize !== 'function') {
          const keys = Object.keys(mermaidModule as Record<string, unknown>).join(', ');
          throw new Error(`mermaid module loaded but exports are unrecognised — got keys: ${keys}`);
        }

        const theme = detectVscodeTheme();
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: 'strict',
          ...(theme === 'dark' ? MERMAID_THEME_DARK : MERMAID_THEME_LIGHT),
          // Render at natural size so we can pan/zoom around larger diagrams.
          flowchart: { useMaxWidth: false, htmlLabels: true, curve: 'basis' },
        });

        const renderId = `overview-mermaid-${Date.now()}`;
        const { svg } = await mermaid.render(renderId, source);
        if (cancelled) return;

        stage.innerHTML = svg;
        setRenderError(null);

        const svgEl = stage.querySelector('svg');
        if (!svgEl) return;
        // Reset any size constraints so the svg renders at its natural size.
        svgEl.removeAttribute('style');
        svgEl.style.display = 'block';
        svgEl.style.maxWidth = 'none';
        svgEl.style.height = 'auto';

        // Tag each node group with our own data attributes (used both by the
        // delegated click handler and by the active-section highlight). We do
        // NOT attach per-node click listeners — clicks are delegated at the
        // stage level (see the dedicated useEffect below) so that listener
        // attachment timing and SVG/foreignObject event quirks can't break
        // node clicks.
        // Mermaid prefixes the node id with whatever renderId we pass to
        // `mermaid.render()`, so the actual format is
        // `{renderId}-flowchart-{sanitized}-{N}`. We match the trailing
        // `-flowchart-{sanitized}-{N}` portion regardless of the prefix.
        const nodeEls = svgEl.querySelectorAll<SVGElement>('g.node');
        nodeEls.forEach((nodeEl) => {
          const match = nodeEl.id.match(/-flowchart-(.+)-\d+$/);
          if (!match) return;
          const sanitized = match[1];
          const original = idLookup.get(sanitized);
          if (!original) return;
          nodeEl.style.cursor = 'pointer';
          nodeEl.setAttribute('data-overview-node-id', original);
          nodeEl.setAttribute('data-overview-sanitized', sanitized);
        });

        // Re-apply the active-section highlight after a fresh render so it
        // survives source changes / theme switches.
        applyActiveHighlight();
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

  // Wheel: ctrl/meta = zoom around cursor; otherwise pan.
  // Trackpad pinch on macOS dispatches wheel events with ctrlKey=true, so it
  // is naturally covered by the zoom branch.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const current = transformRef.current;
      if (e.ctrlKey || e.metaKey) {
        // Zoom centred on cursor position relative to the viewport.
        const rect = viewport.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;
        const factor = Math.exp(-e.deltaY * 0.01);
        const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * factor));
        const ratio = nextScale / current.scale;
        const nx = cx - (cx - current.x) * ratio;
        const ny = cy - (cy - current.y) * ratio;
        setTransform({ scale: nextScale, x: nx, y: ny });
      } else {
        setTransform({
          scale: current.scale,
          x: current.x - e.deltaX,
          y: current.y - e.deltaY,
        });
      }
    };

    // `passive: false` so we can preventDefault to stop the page from
    // scrolling while we handle pan/zoom.
    viewport.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      viewport.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Mouse drag pans the stage. Native listeners (not React's pointer events)
  // are used so they don't interfere with click event delivery to the SVG
  // node listeners attached during render. The drag is started on a
  // background mousedown; clicks that originate on a `g.node` are ignored.
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    let dragStart: { x: number; y: number; tx: number; ty: number } | null = null;

    const onMouseMove = (e: MouseEvent) => {
      if (!dragStart) return;
      setTransform({
        scale: transformRef.current.scale,
        x: dragStart.tx + (e.clientX - dragStart.x),
        y: dragStart.ty + (e.clientY - dragStart.y),
      });
    };
    const onMouseUp = () => {
      dragStart = null;
      // Restore the open-hand cursor.
      viewport.removeAttribute('data-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      if (target?.closest('g.node')) return; // let the node's own click fire
      e.preventDefault();
      const t = transformRef.current;
      dragStart = { x: e.clientX, y: e.clientY, tx: t.x, ty: t.y };
      // Switch to the closed-fist (grabbing) cursor while the drag is held.
      viewport.setAttribute('data-dragging', 'true');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    viewport.addEventListener('mousedown', onMouseDown);
    return () => {
      viewport.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };
  }, []);

  // Delegated click handler for SVG nodes. Listening on the stage container
  // makes the click work regardless of which inner shape / label / foreignObject
  // child the user actually pointed at — we just walk up to the nearest g.node
  // and read the original id we stamped during render.
  // Note: the handler is attached once and reads `onNodeClick` from a ref so
  // it doesn't need re-binding when the prop identity changes.
  const onNodeClickRef = useRef(onNodeClick);
  useEffect(() => {
    onNodeClickRef.current = onNodeClick;
  }, [onNodeClick]);
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      const nodeEl = target?.closest('g.node');
      if (!nodeEl) return;
      const original = nodeEl.getAttribute('data-overview-node-id');
      if (!original) return;
      e.stopPropagation();
      onNodeClickRef.current(original);
    };
    stage.addEventListener('click', onClick);
    return () => stage.removeEventListener('click', onClick);
  }, []);

  const zoomBy = useCallback((factor: number) => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const current = transformRef.current;
    const cx = viewport.clientWidth / 2;
    const cy = viewport.clientHeight / 2;
    const nextScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, current.scale * factor));
    const ratio = nextScale / current.scale;
    const nx = cx - (cx - current.x) * ratio;
    const ny = cy - (cy - current.y) * ratio;
    setTransform({ scale: nextScale, x: nx, y: ny });
  }, []);

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
      ref={viewportRef}
      className="overview-mermaid-viewport"
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        cursor: 'grab',
        userSelect: 'none',
      }}
    >
      <div
        ref={stageRef}
        className="overview-mermaid-stage"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          transformOrigin: '0 0',
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          willChange: 'transform',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: 8,
          right: 8,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
          padding: 4,
          borderRadius: 4,
          backgroundColor: 'var(--vscode-editorWidget-background, rgba(0,0,0,0.4))',
          border: '1px solid var(--vscode-panel-border)',
          zIndex: 1,
        }}
      >
        <ZoomButton title="Zoom in" onClick={() => zoomBy(1.2)}>
          <Plus size={14} />
        </ZoomButton>
        <ZoomButton title="Zoom out" onClick={() => zoomBy(1 / 1.2)}>
          <Minus size={14} />
        </ZoomButton>
        <ZoomButton title="Fit to view" onClick={fitToViewport}>
          <Maximize2 size={14} />
        </ZoomButton>
        <ZoomButton
          title={followActive ? 'Follow active node: on' : 'Follow active node: off'}
          onClick={() => setFollowActive((v) => !v)}
          active={followActive}
        >
          {followActive ? <Locate size={14} /> : <LocateOff size={14} />}
        </ZoomButton>
        <ZoomButton
          title={
            direction === 'TD'
              ? 'Layout: top-down (click to switch to left-to-right)'
              : 'Layout: left-to-right (click to switch to top-down)'
          }
          onClick={() => setDirection((d) => (d === 'TD' ? 'LR' : 'TD'))}
        >
          {direction === 'TD' ? <MoveVertical size={14} /> : <MoveHorizontal size={14} />}
        </ZoomButton>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 8,
          bottom: 8,
          padding: '2px 6px',
          fontSize: 10,
          color: 'var(--vscode-descriptionForeground)',
          backgroundColor: 'var(--vscode-editorWidget-background, rgba(0,0,0,0.4))',
          borderRadius: 3,
          border: '1px solid var(--vscode-panel-border)',
          pointerEvents: 'none',
        }}
      >
        {Math.round(transform.scale * 100)}%
      </div>
    </div>
  );
};

const ZoomButton: React.FC<{
  title: string;
  onClick: () => void;
  children: React.ReactNode;
  /** When true, render the button in a pressed/highlighted state. */
  active?: boolean;
}> = ({ title, onClick, children, active }) => (
  <button
    type="button"
    title={title}
    aria-label={title}
    aria-pressed={active}
    onClick={onClick}
    // Prevent the click on a zoom button from triggering the viewport's
    // mousedown (which would start a pan gesture).
    onMouseDown={(e) => e.stopPropagation()}
    style={{
      width: 24,
      height: 24,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: active
        ? 'color-mix(in srgb, var(--vscode-focusBorder) 25%, transparent)'
        : 'transparent',
      color: active ? 'var(--vscode-focusBorder)' : 'var(--vscode-foreground)',
      border: 'none',
      borderRadius: 3,
      cursor: 'pointer',
    }}
  >
    {children}
  </button>
);
