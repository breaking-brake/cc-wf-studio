/**
 * Suite S6 (second slice) — the canvas change-detection gate (issue #1020).
 *
 * Two module-level functions in `workflow-store.ts` answer the question "has
 * this canvas changed?", and both are consulted before something replaces the
 * user's work:
 *
 * - `getCanvasRevision()` is the optimistic-concurrency guard for MCP
 *   `apply_workflow`. `App.tsx:566-570` rejects an incoming apply whose
 *   `expectedRevision` no longer matches, and `App.tsx:602-612` is where the
 *   refusal is sent back to the agent. If the counter **under-reports** (a
 *   content change that fails to bump it), a stale apply is accepted and the
 *   edits the user made after the agent fetched the workflow are silently
 *   replaced — unrecoverable, since the canvas has no undo across an apply.
 *   If it **over-reports** (selection or measurement noise bumping it), every
 *   apply carrying an `expectedRevision` is rejected and MCP-driven editing
 *   stops working while looking like a concurrency problem.
 *
 * - `hasUnsavedChanges()` guards the confirmation dialog at `App.tsx:305`
 *   before a sample workflow is loaded over the canvas. A wrong `false` there
 *   replaces unsaved work with no prompt at all.
 *
 * Neither is maintained by the store framework: the revision counter is a
 * hand-written zustand subscriber comparing a hand-written fingerprint, and
 * `hasUnsavedChanges` is a hand-written field-by-field comparison. Both are
 * exactly the kind of code that drifts silently under refactoring, which is
 * why the assertions below are about observable answers rather than about how
 * either one is computed.
 *
 * Two notes on how these tests are written:
 *
 * 1. `_canvasRevision` is a **module-global monotonic counter** shared by every
 *    test in this file, and the `beforeEach` reset bumps it itself. So every
 *    revision assertion is a **delta** measured around the action under test,
 *    never an absolute value.
 * 2. Everything is driven through the store's public actions rather than by
 *    writing state directly, so the tests exercise the paths the UI actually
 *    takes. The one exception is clearing `activeWorkflow` back to `null` in
 *    `beforeEach` — no action does that (`clearWorkflow` deliberately keeps it),
 *    and section C needs the no-active-workflow branch.
 */

import type { Connection, Workflow, WorkflowNode } from '@cc-wf-studio/core';
import type { Edge, Node } from 'reactflow';
import { beforeEach, describe, expect, it } from 'vitest';
import { getCanvasRevision, hasUnsavedChanges, useWorkflowStore } from './workflow-store';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * The canvas as the store boots it: `DEFAULT_START_NODE` + `DEFAULT_END_NODE`,
 * no edges. Rebuilt per call so tests never share node identities — the
 * revision subscriber has a reference-equality fast path, and reusing objects
 * across tests would let one test's array silently satisfy another's.
 */
function bootNodes(): Node[] {
  return [
    {
      id: 'start-node-default',
      type: 'start',
      position: { x: 100, y: 200 },
      data: { label: 'Start' },
    },
    { id: 'end_node_default', type: 'end', position: { x: 600, y: 200 }, data: { label: 'End' } },
  ];
}

function canvasNode(
  id: string,
  type: string,
  x = 0,
  y = 0,
  data: Record<string, unknown> = {}
): Node {
  return { id, type, position: { x, y }, data };
}

function canvasEdge(id: string, source: string, target: string, extra: Partial<Edge> = {}): Edge {
  return { id, source, target, ...extra };
}

/**
 * A saved workflow, as `activeWorkflow` holds it.
 *
 * The `WorkflowNode` cast is deliberate and mirrors `workflow-diff.test.ts`:
 * `WorkflowNode` is a discriminated union pairing each node type with its own
 * data shape, while `hasUnsavedChanges` only ever reads `id`, `position` and
 * `data`. Satisfying the full union would add fixture noise that none of the
 * code under test looks at.
 */
function savedWorkflow(
  nodes: Partial<WorkflowNode>[],
  connections: Connection[],
  name = 'saved-flow'
): Workflow {
  return {
    id: 'wf-1',
    name,
    version: '1.0.0',
    nodes: nodes as WorkflowNode[],
    connections,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
  };
}

function savedNode(id: string, type: string, x = 0, y = 0, data: Record<string, unknown> = {}) {
  return { id, type, position: { x, y }, data } as unknown as Partial<WorkflowNode>;
}

function savedConnection(
  id: string,
  from: string,
  to: string,
  fromPort = 'default',
  toPort = 'default'
): Connection {
  return { id, from, to, fromPort, toPort };
}

/** Runs `action` and returns how much the canvas revision moved. */
function revisionDelta(action: () => void): number {
  const before = getCanvasRevision();
  action();
  return getCanvasRevision() - before;
}

beforeEach(() => {
  const store = useWorkflowStore.getState();
  // No action sets `activeWorkflow` back to null — `clearWorkflow` keeps it on
  // purpose — so the reset goes through zustand's own setState.
  useWorkflowStore.setState({ activeWorkflow: null });
  store.cancelDeleteNodes();
  store.setSelectedNodeId(null);
  store.setWorkflowName('my-workflow');
  store.setCanvas(bootNodes(), []);
});

// ===========================================================================
// A. The revision increments on a content change
// ===========================================================================
//
// Under-reporting is the data-loss direction: a change the counter misses is a
// change a stale `apply_workflow` will overwrite without warning.

describe('getCanvasRevision — content changes increment it', () => {
  it('increments when a node is added', () => {
    const delta = revisionDelta(() => {
      useWorkflowStore.getState().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    });

    expect(delta).toBe(1);
  });

  it('increments when a staged delete is confirmed', () => {
    useWorkflowStore.getState().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    useWorkflowStore.getState().onNodesChange([{ id: 'agent-1', type: 'remove' }]);

    const delta = revisionDelta(() => {
      useWorkflowStore.getState().confirmDeleteNodes();
    });

    expect(delta).toBe(1);
    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).not.toContain('agent-1');
  });

  it('increments exactly once when an edge is connected', () => {
    // Worth its own case: `onConnect` also rewrites *every* node with
    // `selected: false`. Since selection is not content, the correct answer is
    // 1 (the new edge), not 2 — a fingerprint that stopped stripping
    // `selected` would still bump only once here, but case B7 catches that.
    const delta = revisionDelta(() => {
      useWorkflowStore.getState().onConnect({
        source: 'start-node-default',
        target: 'end_node_default',
        sourceHandle: null,
        targetHandle: null,
      });
    });

    expect(delta).toBe(1);
    expect(useWorkflowStore.getState().edges).toHaveLength(1);
  });

  it("increments when a node's data is edited", () => {
    useWorkflowStore
      .getState()
      .addNode(canvasNode('agent-1', 'sub-agent', 300, 200, { prompt: 'before' }));

    const delta = revisionDelta(() => {
      useWorkflowStore.getState().updateNodeData('agent-1', { prompt: 'after' });
    });

    expect(delta).toBe(1);
  });

  it('increments when a node is moved', () => {
    useWorkflowStore.getState().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));

    const delta = revisionDelta(() => {
      useWorkflowStore
        .getState()
        .onNodesChange([{ id: 'agent-1', type: 'position', position: { x: 640, y: 480 } }]);
    });

    expect(delta).toBe(1);
  });

  it('increments when setCanvas replaces the canvas with different content', () => {
    const delta = revisionDelta(() => {
      useWorkflowStore
        .getState()
        .setCanvas(
          [...bootNodes(), canvasNode('agent-1', 'sub-agent', 300, 200)],
          [canvasEdge('e1', 'start-node-default', 'agent-1')]
        );
    });

    expect(delta).toBe(1);
  });
});

// ===========================================================================
// B. The revision does NOT increment on noise
// ===========================================================================
//
// The load-bearing half. A false increment does not lose data, but it rejects
// every `apply_workflow` that carries an `expectedRevision` — MCP editing goes
// dead with an error message blaming a concurrent edit that never happened.

describe('getCanvasRevision — non-content changes leave it alone', () => {
  it('does not increment when a node is selected', () => {
    useWorkflowStore.getState().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));

    const delta = revisionDelta(() => {
      useWorkflowStore
        .getState()
        .onNodesChange([{ id: 'agent-1', type: 'select', selected: true }]);
    });

    expect(delta).toBe(0);
  });

  it('does not increment when React Flow reports node dimensions', () => {
    // Fires on every canvas mount, so an increment here would break the very
    // first `apply_workflow` of each session. React Flow v11 writes `width` /
    // `height` for this change type, and both are stripped by the fingerprint.
    useWorkflowStore.getState().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));

    const delta = revisionDelta(() => {
      useWorkflowStore
        .getState()
        .onNodesChange([
          { id: 'agent-1', type: 'dimensions', dimensions: { width: 180, height: 72 } },
        ]);
    });

    expect(delta).toBe(0);
    // Guards the premise of the assertion above: if a future React Flow writes
    // the measurement somewhere the fingerprint does not strip, this fails and
    // says so, rather than the delta assertion passing for the wrong reason.
    const node = useWorkflowStore.getState().nodes.find((n) => n.id === 'agent-1');
    expect(Object.keys(node ?? {}).sort()).toEqual([
      'data',
      'height',
      'id',
      'position',
      'type',
      'width',
    ]);
  });

  it('does not increment when setCanvas is given identical content in fresh arrays', () => {
    // The reference-equality fast path cannot help here — the arrays and the
    // node objects are all new. Only the fingerprint comparison stands between
    // this and a spurious bump, and re-serializing the canvas is what several
    // UI paths do on every render.
    const delta = revisionDelta(() => {
      useWorkflowStore.getState().setCanvas(bootNodes(), []);
    });

    expect(delta).toBe(0);
  });

  it('does not increment when a delete is staged but not confirmed', () => {
    // `onNodesChange` records `pendingDeleteNodeIds` and removes nothing until
    // `confirmDeleteNodes` — the node is still on the canvas while the
    // confirmation dialog is open, so nothing has changed yet.
    useWorkflowStore.getState().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));

    const delta = revisionDelta(() => {
      useWorkflowStore.getState().onNodesChange([{ id: 'agent-1', type: 'remove' }]);
    });

    expect(delta).toBe(0);
    expect(useWorkflowStore.getState().nodes.map((n) => n.id)).toContain('agent-1');
    expect(useWorkflowStore.getState().pendingDeleteNodeIds).toEqual(['agent-1']);
  });

  it('does not increment when an unrelated store field changes', () => {
    const nameDelta = revisionDelta(() => {
      useWorkflowStore.getState().setWorkflowName('renamed-flow');
    });
    const selectionDelta = revisionDelta(() => {
      useWorkflowStore.getState().setSelectedNodeId('start-node-default');
    });

    expect(nameDelta).toBe(0);
    expect(selectionDelta).toBe(0);
  });
});

// ===========================================================================
// C. hasUnsavedChanges() with no activeWorkflow
// ===========================================================================
//
// The "is this canvas still pristine?" heuristic. A wrong `false` skips the
// confirmation dialog and a sample workflow lands on top of the user's work.

describe('hasUnsavedChanges — no active workflow', () => {
  it('is false on the freshly booted canvas', () => {
    expect(hasUnsavedChanges()).toBe(false);
  });

  it('is true once a third node is added', () => {
    useWorkflowStore.getState().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true once the two default nodes are wired together', () => {
    useWorkflowStore.getState().onConnect({
      source: 'start-node-default',
      target: 'end_node_default',
      sourceHandle: null,
      targetHandle: null,
    });

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true once the workflow has been renamed', () => {
    useWorkflowStore.getState().setWorkflowName('my-real-workflow');

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true for two nodes that are not one start and one end', () => {
    useWorkflowStore
      .getState()
      .setCanvas([canvasNode('agent-1', 'sub-agent'), canvasNode('agent-2', 'sub-agent')], []);

    expect(hasUnsavedChanges()).toBe(true);
  });
});

// ===========================================================================
// D. hasUnsavedChanges() against an activeWorkflow
// ===========================================================================

describe('hasUnsavedChanges — against a saved workflow', () => {
  /** Loads a two-node, one-edge workflow through the real load path. */
  function loadSaved(): Workflow {
    const workflow = savedWorkflow(
      [
        savedNode('start-node-default', 'start', 100, 200),
        savedNode('agent-1', 'sub-agent', 300, 200, { prompt: 'p' }),
      ],
      [savedConnection('c1', 'start-node-default', 'agent-1')]
    );
    useWorkflowStore.getState().setActiveWorkflow(workflow);
    useWorkflowStore.getState().setWorkflowName(workflow.name);
    return workflow;
  }

  it('is false immediately after a workflow is loaded', () => {
    loadSaved();

    expect(hasUnsavedChanges()).toBe(false);
  });

  it('is true when the node count differs', () => {
    loadSaved();
    useWorkflowStore.getState().addNode(canvasNode('agent-2', 'sub-agent', 500, 200));

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true when the connection count differs', () => {
    const workflow = loadSaved();
    useWorkflowStore.getState().setCanvas(useWorkflowStore.getState().nodes, [
      ...useWorkflowStore.getState().edges,
      canvasEdge('c2', 'agent-1', 'start-node-default', {
        sourceHandle: 'default',
        targetHandle: 'default',
      }),
    ]);

    expect(workflow.connections).toHaveLength(1);
    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true when the workflow name differs', () => {
    loadSaved();
    useWorkflowStore.getState().setWorkflowName('renamed-flow');

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true when a node id is not one the saved workflow contains', () => {
    // Same node count, same edge count, same name — only identity differs, so
    // this is the case the count comparisons cannot catch.
    loadSaved();
    const [start] = useWorkflowStore.getState().nodes;
    useWorkflowStore.getState().setCanvas(
      [start, canvasNode('agent-renamed', 'sub-agent', 300, 200, { prompt: 'p' })],
      [
        canvasEdge('c1', 'start-node-default', 'agent-renamed', {
          sourceHandle: 'default',
          targetHandle: 'default',
        }),
      ]
    );

    const state = useWorkflowStore.getState();
    expect(state.nodes).toHaveLength(state.activeWorkflow?.nodes.length ?? -1);
    expect(state.edges).toHaveLength(state.activeWorkflow?.connections.length ?? -1);
    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true when a node has been moved', () => {
    loadSaved();
    useWorkflowStore
      .getState()
      .onNodesChange([{ id: 'agent-1', type: 'position', position: { x: 999, y: 200 } }]);

    expect(hasUnsavedChanges()).toBe(true);
  });

  it("is true when a node's data has been edited", () => {
    loadSaved();
    useWorkflowStore.getState().updateNodeData('agent-1', { prompt: 'edited' });

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('is true when an edge has been rewired', () => {
    loadSaved();
    useWorkflowStore.getState().setCanvas(useWorkflowStore.getState().nodes, [
      canvasEdge('c1', 'agent-1', 'start-node-default', {
        sourceHandle: 'default',
        targetHandle: 'default',
      }),
    ]);

    expect(hasUnsavedChanges()).toBe(true);
  });

  it('reports unsaved changes for a just-loaded workflow whose connection omits fromPort (see #1018)', () => {
    // Asserted as observed, not as it should be. `hasUnsavedChanges` defaults a
    // null handle to `'default'`, while `serializeWorkflow` normalizes it to
    // `'output'` / `'input'` — the same serialized-form-versus-meaning
    // disagreement filed as #1018 for `computeWorkflowDiff`.
    //
    // Reachable path: an agent-authored workflow that omits `fromPort`.
    // `setActiveWorkflow` copies it verbatim, so the canvas edge gets
    // `sourceHandle: undefined`, which reads back as `'default'` and no longer
    // equals the saved `undefined`. Nothing has been edited, yet the next
    // sample-workflow load prompts the user to discard changes they never made.
    // Whoever fixes #1018 should update this case rather than work around it.
    const workflow = savedWorkflow(
      [
        savedNode('start-node-default', 'start', 100, 200),
        savedNode('agent-1', 'sub-agent', 300, 200),
      ],
      [{ id: 'c1', from: 'start-node-default', to: 'agent-1' } as unknown as Connection]
    );
    useWorkflowStore.getState().setActiveWorkflow(workflow);
    useWorkflowStore.getState().setWorkflowName(workflow.name);

    expect(useWorkflowStore.getState().edges[0].sourceHandle).toBeUndefined();
    expect(hasUnsavedChanges()).toBe(true);
  });
});
