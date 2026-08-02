/**
 * Suite S6 (third slice) — undo/redo history in the canvas store (issue #1022).
 *
 * Undo is the canvas's only recovery path. Most edits carry no confirmation
 * and no autosave, so `Ctrl+Z` is what stands between a user and permanently
 * losing work — most sharply after an external AI agent's `apply_workflow`
 * rewrites the whole canvas. Two directions of failure, both silent:
 *
 * - **History cleared when it should be kept.** `setActiveWorkflow` clears the
 *   undo stack unless the caller passes `clearHistory: false`, and all three
 *   callers that pass it (`App.tsx:321` accept-MCP-apply, `:455` import,
 *   `:621` MCP `apply_workflow`) do so precisely so the pre-apply canvas stays
 *   undoable. If that guard regresses to an unconditional `clear()`, an
 *   agent's rewrite becomes unrecoverable and nothing surfaces the loss.
 * - **History kept when it should be cleared.** The five `clear()` sites exist
 *   to stop undo crossing between canvases. If one regresses, `Ctrl+Z` on a
 *   freshly opened workflow pulls in the *previous* workflow's nodes and the
 *   next save writes them into the wrong file.
 *
 * Alongside those, `partialize` / `equality` / `limit` decide what counts as an
 * undoable step at all. They are what keeps a user's real edit from sitting
 * behind a stack of no-op entries created by merely selecting and measuring
 * nodes — a "broken" undo from the user's side even though every entry is
 * technically correct.
 *
 * Two notes on how these tests are written:
 *
 * 1. `useWorkflowStore.temporal` is **module-global**, shared by every test in
 *    this file. The `beforeEach` reset itself performs `set()` calls that
 *    record entries, so it ends by clearing the stack (and resuming tracking,
 *    in case a section E test left it paused). Every count below is therefore
 *    measured from an empty stack.
 * 2. Everything is driven through the store's public actions, so the tests
 *    exercise the paths the UI actually takes. The exceptions are deliberate
 *    and marked: section E reproduces `WorkflowEditor.tsx`'s drag handling,
 *    which itself reaches for `useWorkflowStore.setState`.
 *
 * This is a sibling file to `workflow-store.test.ts` rather than an addition to
 * it: vitest gives each test file its own module registry, so the temporal
 * stack here cannot perturb that file's module-global revision counter.
 */

import type { Connection, Workflow, WorkflowNode } from '@cc-wf-studio/core';
import type { Node } from 'reactflow';
import { beforeEach, describe, expect, it } from 'vitest';
import { deserializeWorkflow } from '../../services/workflow-service';
import { useWorkflowStore } from '../../stores/workflow-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** The temporal state object is replaced on every change — always re-read it. */
const history = () => useWorkflowStore.temporal.getState();

const store = () => useWorkflowStore.getState();

const nodeIds = () => store().nodes.map((n) => n.id);

/**
 * The canvas as the store boots it. Rebuilt per call so no two tests share node
 * identities.
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

/**
 * A saved workflow, as `setActiveWorkflow` receives it.
 *
 * The `WorkflowNode` cast mirrors `workflow-store.test.ts`: `WorkflowNode` is a
 * discriminated union pairing each node type with its own data shape, while the
 * code under test only ever reads `id`, `type`, `position` and `data`.
 */
function savedNode(id: string, type: string, x = 0, y = 0): WorkflowNode {
  return {
    id,
    name: id,
    type,
    position: { x, y },
    data: { label: id },
  } as unknown as WorkflowNode;
}

function savedWorkflow(nodes: WorkflowNode[], connections: Connection[] = []): Workflow {
  return {
    version: '1.0.0',
    name: 'applied-workflow',
    nodes,
    connections,
  } as unknown as Workflow;
}

beforeEach(() => {
  // Resume first: a section E test may have left tracking paused, in which case
  // the reset below would record nothing and `clear()` would be a no-op on a
  // stack the *previous* test filled.
  history().resume();
  useWorkflowStore.setState({
    activeWorkflow: null,
    subAgentFlows: [],
    activeSubAgentFlowId: null,
    mainWorkflowSnapshot: null,
  });
  store().cancelDeleteNodes();
  store().setSelectedNodeId(null);
  store().setWorkflowName('my-workflow');
  store().setCanvas(bootNodes(), []);
  // Last, so every count assertion starts from zero.
  history().clear();
});

// ===========================================================================
// A. What does and does not become an undo entry
// ===========================================================================
//
// An entry too few loses an edit; an entry too many buries the edit the user
// is actually trying to reach.

describe('undo entries — content changes are recorded', () => {
  it('records one entry when a node is added, and undo restores the prior node set', () => {
    const before = nodeIds();

    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));

    expect(history().pastStates).toHaveLength(1);
    expect(nodeIds()).toContain('agent-1');

    history().undo();

    expect(nodeIds()).toEqual(before);
  });

  it('records exactly one entry when an edge is connected', () => {
    // Worth its own case: `onConnect` (workflow-store.ts:425) rewrites *every*
    // node with `selected: false` in the same `set()` as the new edge. Because
    // `partialize` strips `selected`, the node half of that write is invisible
    // to the history and the answer is 1 — but a `partialize` that stopped
    // stripping it would still produce 1 here, since it is a single `set()`.
    // Case A4 is what catches that.
    store().onConnect({
      source: 'start-node-default',
      target: 'end_node_default',
      sourceHandle: 'out',
      targetHandle: 'input',
    });

    expect(store().edges).toHaveLength(1);
    expect(history().pastStates).toHaveLength(1);

    history().undo();

    expect(store().edges).toHaveLength(0);
  });

  it('records one entry when node data is edited, and undo restores the prior data', () => {
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200, { label: 'before' }));
    history().clear();

    store().updateNodeData('agent-1', { label: 'after' });

    expect(history().pastStates).toHaveLength(1);
    expect(store().nodes.find((n) => n.id === 'agent-1')?.data.label).toBe('after');

    history().undo();

    expect(store().nodes.find((n) => n.id === 'agent-1')?.data.label).toBe('before');
  });
});

describe('undo entries — interaction noise is not recorded', () => {
  it('records nothing when a node is merely selected', () => {
    // Load-bearing. Selection travels through `onNodesChange` on every click,
    // so without both the `partialize` strip and the `equality` dedupe the
    // user's real edit ends up one or more Ctrl+Z further away than it looks.
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    history().clear();

    store().onNodesChange([{ id: 'agent-1', type: 'select', selected: true }]);

    // Prove the change actually landed, so the zero below is not vacuous.
    expect(store().nodes.find((n) => n.id === 'agent-1')?.selected).toBe(true);
    expect(history().pastStates).toHaveLength(0);
  });

  it('records nothing when React Flow reports a node dimension', () => {
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    history().clear();

    store().onNodesChange([
      { id: 'agent-1', type: 'dimensions', dimensions: { width: 220, height: 96 } },
    ]);

    const measured = store().nodes.find((n) => n.id === 'agent-1');
    // Assert which fields React Flow actually wrote. If a future version routes
    // the measurement somewhere `partialize` does not strip, this fails and
    // names the field rather than the zero below passing for the wrong reason.
    expect(measured?.width).toBe(220);
    expect(measured?.height).toBe(96);
    expect(history().pastStates).toHaveLength(0);
  });

  it('records nothing when setCanvas is handed identical content in fresh arrays', () => {
    // `equality` compares serialized content, not array identity — this is what
    // makes a re-render or a redundant load a non-event for undo.
    store().setCanvas(bootNodes(), []);

    expect(history().pastStates).toHaveLength(0);
  });

  it('restores nodes without the stripped presentation fields (asserted as observed)', () => {
    // `partialize` drops `selected` / `width` / `height` before an entry is
    // stored, so what `undo()` hands back carries none of those keys. This is
    // asserted as observed, not as a wish: React Flow re-measures a node on the
    // next render and re-applies selection from its own state, so the missing
    // keys are not known to be user-visible. If that turns out to be wrong,
    // file a `bug` and update this case rather than asserting a different
    // answer here.
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200, { label: 'before' }));
    store().onNodesChange([
      { id: 'agent-1', type: 'select', selected: true },
      { id: 'agent-1', type: 'dimensions', dimensions: { width: 220, height: 96 } },
    ]);
    history().clear();

    store().updateNodeData('agent-1', { label: 'after' });
    history().undo();

    const restored = store().nodes.find((n) => n.id === 'agent-1') as Node;
    expect(restored.data.label).toBe('before');
    expect(restored).not.toHaveProperty('selected');
    expect(restored).not.toHaveProperty('width');
    expect(restored).not.toHaveProperty('height');
  });
});

// ===========================================================================
// B. Redo
// ===========================================================================

describe('redo', () => {
  it('returns to the later state and drains the redo stack', () => {
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    history().undo();

    expect(nodeIds()).not.toContain('agent-1');
    expect(history().futureStates).toHaveLength(1);

    history().redo();

    expect(nodeIds()).toContain('agent-1');
    expect(history().futureStates).toHaveLength(0);
  });

  it('drops the redo stack when a fresh edit follows an undo', () => {
    // This is what disables the redo button at `UndoRedoControls.tsx:24`: once
    // the user edits after undoing, the branch they undid is gone.
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    history().undo();
    expect(history().futureStates).toHaveLength(1);

    store().addNode(canvasNode('agent-2', 'sub-agent', 400, 200));

    expect(history().futureStates).toHaveLength(0);
    expect(nodeIds()).toContain('agent-2');
    expect(nodeIds()).not.toContain('agent-1');
  });
});

// ===========================================================================
// C. The 50-entry cap
// ===========================================================================

describe('history limit', () => {
  it('keeps the 50 most recent entries and drops the oldest', () => {
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200, { label: 'v0' }));
    history().clear();

    // 60 distinct content changes: v0 → v1 → … → v60.
    for (let i = 1; i <= 60; i++) {
      store().updateNodeData('agent-1', { label: `v${i}` });
    }

    expect(history().pastStates).toHaveLength(50);

    for (let i = 0; i < 50; i++) {
      history().undo();
    }

    expect(history().pastStates).toHaveLength(0);
    // Change i recorded the state before it, i.e. v0…v59; capped at 50 the
    // stack keeps v10…v59, so 50 undos land on v10 — not on the v0 the canvas
    // started from. Asserting the exact label is what distinguishes "the oldest
    // entries were dropped" from "the newest were".
    expect(store().nodes.find((n) => n.id === 'agent-1')?.data.label).toBe('v10');
  });
});

// ===========================================================================
// D. History clearing — the cross-canvas half
// ===========================================================================
//
// Four of these five sites clear unconditionally. The fifth is the one the
// whole issue is about.

describe('history clearing', () => {
  /** Fill both stacks so a failure to clear is visible in either direction. */
  function fillBothStacks(): void {
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    store().addNode(canvasNode('agent-2', 'sub-agent', 400, 200));
    history().undo();

    expect(history().pastStates.length).toBeGreaterThan(0);
    expect(history().futureStates.length).toBeGreaterThan(0);
  }

  it('clearWorkflow empties both stacks', () => {
    fillBothStacks();

    store().clearWorkflow();

    expect(history().pastStates).toHaveLength(0);
    expect(history().futureStates).toHaveLength(0);
  });

  it('addGeneratedWorkflow empties both stacks', () => {
    fillBothStacks();

    store().addGeneratedWorkflow(
      savedWorkflow([savedNode('start-node-default', 'start', 100, 200)])
    );

    expect(history().pastStates).toHaveLength(0);
    expect(history().futureStates).toHaveLength(0);
  });

  it('setActiveWorkflow empties both stacks by default', () => {
    fillBothStacks();

    store().setActiveWorkflow(savedWorkflow([savedNode('start-node-default', 'start', 100, 200)]));

    expect(history().pastStates).toHaveLength(0);
    expect(history().futureStates).toHaveLength(0);
  });

  it('setActiveWorkflow with clearHistory:false keeps the pre-apply canvas undoable', () => {
    // The case this issue exists for. Reproduces `App.tsx:317-321` exactly —
    // deserialize, setCanvas, setWorkflowName, setActiveWorkflow — which is the
    // path an accepted MCP `apply_workflow` takes. The user's canvas must still
    // be one Ctrl+Z away afterwards.
    store().addNode(canvasNode('my-work', 'sub-agent', 400, 100, { label: 'my work' }));
    history().clear();
    const preApply = nodeIds();
    expect(preApply).toContain('my-work');

    const incoming = savedWorkflow([
      savedNode('start-node-default', 'start', 100, 200),
      savedNode('agent-written', 'sub-agent', 300, 200),
      savedNode('end_node_default', 'end', 600, 200),
    ]);
    const { nodes: loadedNodes, edges: loadedEdges } = deserializeWorkflow(incoming);
    store().setCanvas(loadedNodes, loadedEdges);
    store().setWorkflowName(incoming.name);
    store().setActiveWorkflow(incoming, { clearHistory: false });

    expect(nodeIds()).toContain('agent-written');
    expect(nodeIds()).not.toContain('my-work');
    // The guard held: the apply did not wipe the stack.
    expect(history().pastStates.length).toBeGreaterThan(0);
    // And exactly one entry, so the user's work is one Ctrl+Z away and not
    // buried behind no-op entries from the setCanvas/setActiveWorkflow pair
    // writing the same content twice.
    expect(history().pastStates).toHaveLength(1);

    history().undo();

    expect(nodeIds()).toEqual(preApply);
  });

  it('setActiveSubAgentFlowId empties both stacks when entering sub-agent flow editing', () => {
    useWorkflowStore.setState({
      subAgentFlows: [
        {
          id: 'flow-1',
          name: 'Sub Flow',
          nodes: [savedNode('sub-start', 'start', 0, 0)],
          connections: [],
        },
      ],
    });
    fillBothStacks();

    store().setActiveSubAgentFlowId('flow-1');

    expect(store().activeSubAgentFlowId).toBe('flow-1');
    expect(history().pastStates).toHaveLength(0);
    expect(history().futureStates).toHaveLength(0);
  });

  it('cancelSubAgentFlowEditing empties both stacks when a snapshot exists', () => {
    useWorkflowStore.setState({
      subAgentFlows: [
        {
          id: 'flow-1',
          name: 'Sub Flow',
          nodes: [savedNode('sub-start', 'start', 0, 0)],
          connections: [],
        },
      ],
    });
    store().setActiveSubAgentFlowId('flow-1');
    expect(store().mainWorkflowSnapshot).not.toBeNull();
    fillBothStacks();

    store().cancelSubAgentFlowEditing();

    expect(store().activeSubAgentFlowId).toBeNull();
    expect(history().pastStates).toHaveLength(0);
    expect(history().futureStates).toHaveLength(0);
  });

  it('cancelSubAgentFlowEditing leaves history alone when not editing a sub-agent flow', () => {
    // The early return at `workflow-store.ts:1360`. A stray Escape on the main
    // canvas must not cost the user their undo stack.
    expect(store().activeSubAgentFlowId).toBeNull();
    fillBothStacks();
    const past = history().pastStates.length;
    const future = history().futureStates.length;

    store().cancelSubAgentFlowEditing();

    expect(history().pastStates).toHaveLength(past);
    expect(history().futureStates).toHaveLength(future);
  });
});

// ===========================================================================
// E. The drag pause/resume contract
// ===========================================================================

describe('node drag records a single undo entry', () => {
  it('collapses a drag into one entry that undoes to the pre-drag position', () => {
    // `WorkflowEditor.tsx:279-301` makes a drag one undo step by pausing
    // tracking, reverting to the pre-drag nodes, resuming, then re-applying the
    // final nodes. That is a contract with zundo's `pause`/`resume`: if a zundo
    // upgrade changed either, a drag would silently become zero entries (undo
    // does nothing) or one entry per mouse-move (undo crawls the node back
    // pixel by pixel), and nothing else in the codebase would notice.
    store().addNode(canvasNode('agent-1', 'sub-agent', 300, 200));
    history().clear();

    // --- handleNodeDragStart
    const preDragNodes = useWorkflowStore.getState().nodes;
    history().pause();

    // --- React Flow's per-mouse-move position writes during the drag
    for (const x of [310, 340, 380, 420]) {
      useWorkflowStore.setState({
        nodes: useWorkflowStore
          .getState()
          .nodes.map((n) => (n.id === 'agent-1' ? { ...n, position: { x, y: 200 } } : n)),
      });
    }
    expect(history().pastStates).toHaveLength(0);

    // --- handleNodeDragStop
    const currentNodes = useWorkflowStore.getState().nodes;
    useWorkflowStore.setState({ nodes: preDragNodes });
    history().resume();
    useWorkflowStore.setState({ nodes: currentNodes });

    expect(history().pastStates).toHaveLength(1);
    expect(store().nodes.find((n) => n.id === 'agent-1')?.position.x).toBe(420);

    history().undo();

    expect(store().nodes.find((n) => n.id === 'agent-1')?.position.x).toBe(300);
  });
});
