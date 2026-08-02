/**
 * Suite S6 (sixth slice) — entering, leaving and cancelling a Sub-Agent Flow
 * (issue #1041).
 *
 * A Sub-Agent Flow is a workflow nested inside a workflow. Opening one swaps
 * the whole canvas for the nested contents; closing it swaps back and folds the
 * nested edits into `subAgentFlows`. `setActiveSubAgentFlowId`
 * (`workflow-store.ts:1114`) is the **only** writer of nested-flow contents,
 * and `subAgentFlows` is written straight to disk
 * (`services/workflow-service.ts:98`) and read by every exporter
 * (`core/services/workflow-export.ts:369`, `agent-skill-export.ts:186`,
 * `workflow-prompt-generator.ts:894`). So a lossy enter/exit round trip
 * corrupts the saved file *and* every generated artifact, and nothing on the
 * user's machine reports it: the canvas they see after closing the dialog is
 * the corrupted version, which looks like what they meant unless they compare.
 *
 * The action is reachable from the live UI on four paths — `NodePalette.tsx:411`
 * (create) and `:414` (enter), `sub-agent-flow-panel.tsx:40` (enter),
 * `App.tsx:993` (exit), `SubAgentFlowDialog.tsx:439` (cancel) — so this is not
 * a frozen feature.
 *
 * It has three transitions plus a shared tail, and the sections below follow
 * them: **A** enter (`:1118-1163`), **B** exit (`:1165-1290`), **C** switch
 * (`:1292-1349`), **D** cancel (`:1358-1385`), **E** remove-while-active
 * (`:1086-1104`).
 *
 * Two things are deliberately NOT re-asserted here. The undo/redo stack
 * behaviour of these actions is already covered by
 * `workflow-store-history.test.ts:398-457`; a second assertion on it is
 * negative value. The one exception is A4, which pins an *asymmetry* that suite
 * does not reach: the not-found early return skips the `temporal.clear()` at
 * `:1351` that all three transitions otherwise share.
 *
 * **Section F** pins two conversion losses **as currently observed**, not as
 * desired, named `CURRENT BEHAVIOUR (bug #1042)`. Both conversion directions
 * are hand-written field lists (`{id, type, position, data}` one way,
 * `{id, name, type, position, data}` the other) rather than reuses of
 * `deserializeWorkflow`/`serializeWorkflow`, so `parentId`, `style` and
 * `Connection.condition` fall out. `ensureActiveWorkflow` in the same file
 * preserves `parentId`/`style` (`:1043-1050`), which is what makes this an
 * oversight rather than a decision. Keeping the cases green today turns them
 * red the moment the feature loop fixes it on `auto-dev` — the intended signal.
 * This loop does not edit product source.
 *
 * A sibling file to the four existing store suites rather than an addition to
 * them: vitest gives each test file its own module registry, so the store's
 * module-global state here cannot perturb theirs.
 */

import type { Connection, SubAgentFlow, WorkflowNode } from '@cc-wf-studio/core';
import type { Edge, Node } from 'reactflow';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useWorkflowStore } from '../../stores/workflow-store';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const store = () => useWorkflowStore.getState();

/** The temporal state object is replaced on every change — always re-read it. */
const history = () => useWorkflowStore.temporal.getState();

const nodeIds = () => store().nodes.map((n) => n.id);

const nodeById = (id: string) => {
  const found = store().nodes.find((n) => n.id === id);
  if (!found) throw new Error(`expected a node with id "${id}" on the canvas`);
  return found;
};

const flowById = (id: string) => {
  const found = store().subAgentFlows.find((sf) => sf.id === id);
  if (!found) throw new Error(`expected a sub-agent flow with id "${id}"`);
  return found;
};

/** A node as it appears on the React Flow canvas. */
function canvasNode(
  id: string,
  type: string,
  x = 0,
  y = 0,
  data: Record<string, unknown> = { label: id },
  extra: Partial<Node> = {}
): Node {
  return { id, type, position: { x, y }, data, ...extra } as Node;
}

function canvasEdge(id: string, source: string, target: string, extra: Partial<Edge> = {}): Edge {
  return { id, source, target, ...extra } as Edge;
}

/**
 * A node as it appears inside a `SubAgentFlow` in a saved `workflow.json`.
 *
 * The cast mirrors the sibling suites: `WorkflowNode` is a discriminated union
 * pairing each node type with its own data shape, while the code under test
 * only ever reads `id`, `type`, `position` and `data`.
 */
function savedNode(
  id: string,
  type: string,
  x = 0,
  y = 0,
  data: Record<string, unknown> = { label: id },
  extra: Record<string, unknown> = {}
): WorkflowNode {
  return { id, name: id, type, position: { x, y }, data, ...extra } as unknown as WorkflowNode;
}

function savedConnection(
  id: string,
  from: string,
  to: string,
  extra: Record<string, unknown> = {}
): Connection {
  return { id, from, to, fromPort: 'output', toPort: 'input', ...extra } as unknown as Connection;
}

function subAgentFlow(
  id: string,
  nodes: WorkflowNode[] = [savedNode(`${id}-start`, 'start')],
  connections: Connection[] = [],
  extra: Partial<SubAgentFlow> = {}
): SubAgentFlow {
  return { id, name: `Flow ${id}`, nodes, connections, ...extra };
}

/** A reference node on the main canvas pointing at a nested flow. */
function refNode(id: string, subAgentFlowId: string, x = 0, y = 0): Node {
  return canvasNode(id, 'subAgentFlow', x, y, {
    subAgentFlowId,
    label: 'stale label',
    description: 'stale description',
    outputPorts: 1,
  });
}

/**
 * Install a main canvas and a set of nested flows, then start every test from
 * an empty undo stack — `setState` and `setCanvas` both record entries.
 */
function installMain(nodes: Node[], edges: Edge[] = [], flows: SubAgentFlow[] = []) {
  store().setCanvas(nodes, edges);
  useWorkflowStore.setState({ subAgentFlows: flows });
  history().clear();
}

beforeEach(() => {
  useWorkflowStore.setState({
    nodes: [],
    edges: [],
    subAgentFlows: [],
    activeSubAgentFlowId: null,
    mainWorkflowSnapshot: null,
    selectedNodeId: null,
    activeWorkflow: null,
  });
  history().clear();
  vi.restoreAllMocks();
});

// ===========================================================================
// A. Enter — main → sub (`:1118-1163`)
// ===========================================================================

describe('setActiveSubAgentFlowId — entering a nested flow', () => {
  it('puts the flow onto the canvas, renaming the four connection fields', () => {
    installMain(
      [canvasNode('main-1', 'subAgent')],
      [],
      [
        subAgentFlow(
          'flow-a',
          [savedNode('sub-start', 'start', 10, 20), savedNode('sub-agent', 'subAgent', 300, 40)],
          [
            savedConnection('c-1', 'sub-start', 'sub-agent', {
              fromPort: 'out-0',
              toPort: 'in-0',
            }),
          ]
        ),
      ]
    );

    store().setActiveSubAgentFlowId('flow-a');

    expect(store().activeSubAgentFlowId).toBe('flow-a');
    expect(nodeIds()).toEqual(['sub-start', 'sub-agent']);
    expect(nodeById('sub-agent').type).toBe('subAgent');
    expect(nodeById('sub-start').position).toEqual({ x: 10, y: 20 });
    expect(store().edges).toEqual([
      {
        id: 'c-1',
        source: 'sub-start',
        target: 'sub-agent',
        sourceHandle: 'out-0',
        targetHandle: 'in-0',
      },
    ]);
  });

  it('snapshots the main canvas by content and clears the nested selection', () => {
    const mainNodes = [canvasNode('main-1', 'subAgent'), canvasNode('main-2', 'subAgent', 200)];
    const mainEdges = [canvasEdge('main-e', 'main-1', 'main-2')];
    installMain(mainNodes, mainEdges, [subAgentFlow('flow-a')]);
    store().setSelectedNodeId('main-2');

    store().setActiveSubAgentFlowId('flow-a');

    expect(store().mainWorkflowSnapshot?.nodes).toEqual(mainNodes);
    expect(store().mainWorkflowSnapshot?.edges).toEqual(mainEdges);
    expect(store().mainWorkflowSnapshot?.selectedNodeId).toBe('main-2');
    // The nested canvas starts with nothing selected — a stale main-canvas id
    // would open the property panel on a node that is no longer on screen.
    expect(store().selectedNodeId).toBeNull();
  });

  it('sets isNewSubAgentFlow from whether a reference node already points at the flow', () => {
    // This flag is the sole input to whether cancel deletes the flow (see D15),
    // so both halves are asserted.
    installMain([canvasNode('main-1', 'subAgent')], [], [subAgentFlow('flow-a')]);
    store().setActiveSubAgentFlowId('flow-a');
    expect(store().mainWorkflowSnapshot?.isNewSubAgentFlow).toBe(true);

    store().cancelSubAgentFlowEditing();

    installMain(
      [canvasNode('main-1', 'subAgent'), refNode('ref-1', 'flow-b')],
      [],
      [subAgentFlow('flow-b')]
    );
    store().setActiveSubAgentFlowId('flow-b');
    expect(store().mainWorkflowSnapshot?.isNewSubAgentFlow).toBe(false);
  });

  it('leaves every piece of state untouched when the id is unknown, and keeps the undo stack', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installMain([canvasNode('main-1', 'subAgent')], [], [subAgentFlow('flow-a')]);
    // One recorded entry, so "the stack survived" is distinguishable from
    // "the stack was empty anyway".
    store().setCanvas([...store().nodes, canvasNode('main-2', 'subAgent', 200)], store().edges);
    expect(history().pastStates).toHaveLength(1);
    const nodesBefore = store().nodes;
    const edgesBefore = store().edges;

    store().setActiveSubAgentFlowId('flow-missing');

    expect(warn).toHaveBeenCalled();
    // Identity, not equality: a rebuilt-but-identical array would still remount
    // every node on the canvas.
    expect(store().nodes).toBe(nodesBefore);
    expect(store().edges).toBe(edgesBefore);
    expect(store().activeSubAgentFlowId).toBeNull();
    expect(store().mainWorkflowSnapshot).toBeNull();
    // The `return` at `:1136` also skips the `temporal.clear()` at `:1351` that
    // all three real transitions reach. Pinned as observed: a failed open is the
    // one path that leaves undo intact.
    expect(history().pastStates).toHaveLength(1);
  });
});

// ===========================================================================
// B. Exit — sub → main (`:1165-1290`)
// ===========================================================================

describe('setActiveSubAgentFlowId — leaving a nested flow', () => {
  it('writes the nested canvas back into its own entry and no other', () => {
    installMain(
      [refNode('ref-1', 'flow-a')],
      [],
      [subAgentFlow('flow-a'), subAgentFlow('flow-b', [savedNode('b-start', 'start')])]
    );
    const untouched = flowById('flow-b');
    store().setActiveSubAgentFlowId('flow-a');

    store().setCanvas(
      [canvasNode('added', 'subAgent', 40, 60, { label: 'Added Step' })],
      [canvasEdge('added-e', 'added', 'added', { sourceHandle: 'out-0', targetHandle: 'in-0' })]
    );
    store().setActiveSubAgentFlowId(null);

    expect(flowById('flow-a').nodes).toEqual([
      {
        id: 'added',
        name: 'Added Step',
        type: 'subAgent',
        position: { x: 40, y: 60 },
        data: { label: 'Added Step' },
      },
    ]);
    expect(flowById('flow-a').connections).toEqual([
      { id: 'added-e', from: 'added', to: 'added', fromPort: 'out-0', toPort: 'in-0' },
    ]);
    // Identity: the map at `:1176-1180` must rebuild only the matching entry.
    expect(flowById('flow-b')).toBe(untouched);
  });

  it('falls back to the node id when the node carries no label', () => {
    // Matches `serializeWorkflow`'s rule, so an unlabelled node keeps a usable
    // `name` in the exported artifacts instead of an empty string.
    installMain([refNode('ref-1', 'flow-a')], [], [subAgentFlow('flow-a')]);
    store().setActiveSubAgentFlowId('flow-a');
    store().setCanvas([canvasNode('no-label', 'subAgent', 0, 0, {})], []);

    store().setActiveSubAgentFlowId(null);

    expect(flowById('flow-a').nodes[0].name).toBe('no-label');
  });

  it("defaults an unhandled edge's ports to 'default'", () => {
    installMain([refNode('ref-1', 'flow-a')], [], [subAgentFlow('flow-a')]);
    store().setActiveSubAgentFlowId('flow-a');
    store().setCanvas(
      [canvasNode('n-1', 'start'), canvasNode('n-2', 'subAgent', 200)],
      [canvasEdge('e-1', 'n-1', 'n-2')]
    );

    store().setActiveSubAgentFlowId(null);

    // Asserted as a literal because it is a divergence, not a detail:
    // `serializeWorkflow` (`workflow-service.ts:65-66`) defaults the same two
    // fields to 'output'/'input'. The same edge therefore serializes differently
    // depending on whether it sits in the main workflow or a nested flow.
    expect(flowById('flow-a').connections).toEqual([
      { id: 'e-1', from: 'n-1', to: 'n-2', fromPort: 'default', toPort: 'default' },
    ]);
  });

  it('appends a reference node when the main canvas has none, and selects it', () => {
    installMain(
      [canvasNode('main-1', 'subAgent')],
      [],
      [
        subAgentFlow('flow-a', [savedNode('sub-start', 'start')], [], {
          name: 'Review Flow',
          description: 'Reviews the diff',
        }),
      ]
    );
    store().setActiveSubAgentFlowId('flow-a');

    store().setActiveSubAgentFlowId(null);

    expect(store().nodes).toHaveLength(2);
    const added = store().nodes[1];
    // The id is built from `Date.now()` (`:1243`), so only its shape is stable.
    expect(added.id).toMatch(/^subagentflow-\d+$/);
    expect(added.type).toBe('subAgentFlow');
    expect(added.data).toEqual({
      subAgentFlowId: 'flow-a',
      label: 'Review Flow',
      description: 'Reviews the diff',
      outputPorts: 1,
    });
    expect(added.position).toEqual({ x: 350, y: 200 });
    expect(store().selectedNodeId).toBe(added.id);
  });

  it('refreshes the existing reference node instead of adding a second one', () => {
    installMain(
      [canvasNode('main-1', 'subAgent'), refNode('ref-1', 'flow-a', 350, 200)],
      [],
      [subAgentFlow('flow-a')]
    );
    store().setSelectedNodeId('main-1');
    store().setActiveSubAgentFlowId('flow-a');
    // A rename made while inside the nested editor must reach the parent canvas.
    store().updateSubAgentFlow('flow-a', { name: 'Renamed Flow', description: 'Now described' });

    store().setActiveSubAgentFlowId(null);

    // Both directions of the count, so neither branch of `hasRef` can pass alone.
    expect(store().nodes).toHaveLength(2);
    expect(store().nodes.filter((n) => n.type === 'subAgentFlow')).toHaveLength(1);
    expect(nodeById('ref-1').data.label).toBe('Renamed Flow');
    expect(nodeById('ref-1').data.description).toBe('Now described');
    // Restored from the snapshot rather than repointed at the reference node.
    expect(store().selectedNodeId).toBe('main-1');
  });

  it('clears the editing state on both branches', () => {
    for (const mainNodes of [[canvasNode('main-1', 'subAgent')], [refNode('ref-1', 'flow-a')]]) {
      installMain(mainNodes, [], [subAgentFlow('flow-a')]);
      store().setActiveSubAgentFlowId('flow-a');

      store().setActiveSubAgentFlowId(null);

      expect(store().activeSubAgentFlowId).toBeNull();
      expect(store().mainWorkflowSnapshot).toBeNull();
    }
  });
});

// ===========================================================================
// C. Switch — sub → other sub (`:1292-1349`)
// ===========================================================================

describe('setActiveSubAgentFlowId — switching between nested flows', () => {
  it('saves the flow being left and loads the one being opened', () => {
    installMain(
      [refNode('ref-a', 'flow-a'), refNode('ref-b', 'flow-b', 200)],
      [],
      [subAgentFlow('flow-a'), subAgentFlow('flow-b', [savedNode('b-start', 'start', 5, 5)])]
    );
    store().setActiveSubAgentFlowId('flow-a');
    store().setCanvas([canvasNode('a-edit', 'subAgent', 1, 2, { label: 'A Edit' })], []);
    store().setSelectedNodeId('a-edit');

    store().setActiveSubAgentFlowId('flow-b');

    expect(flowById('flow-a').nodes.map((n) => n.id)).toEqual(['a-edit']);
    expect(store().activeSubAgentFlowId).toBe('flow-b');
    expect(nodeIds()).toEqual(['b-start']);
    expect(store().selectedNodeId).toBeNull();
  });

  it('keeps the main snapshot across the switch so the exit still restores the parent', () => {
    // Without this the user is stranded in the nested editor: closing the dialog
    // would find no snapshot and leave the nested canvas in place of the parent.
    const mainNodes = [refNode('ref-a', 'flow-a'), refNode('ref-b', 'flow-b', 200)];
    installMain(mainNodes, [], [subAgentFlow('flow-a'), subAgentFlow('flow-b')]);
    store().setActiveSubAgentFlowId('flow-a');

    store().setActiveSubAgentFlowId('flow-b');
    expect(store().mainWorkflowSnapshot?.nodes).toEqual(mainNodes);

    store().setActiveSubAgentFlowId(null);

    expect(nodeIds()).toEqual(['ref-a', 'ref-b']);
    expect(store().activeSubAgentFlowId).toBeNull();
    expect(store().mainWorkflowSnapshot).toBeNull();
  });

  it('CURRENT BEHAVIOUR: an unknown target commits the save-back before bailing out', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    installMain([refNode('ref-a', 'flow-a')], [], [subAgentFlow('flow-a')]);
    store().setActiveSubAgentFlowId('flow-a');
    store().setCanvas([canvasNode('a-edit', 'subAgent')], []);

    store().setActiveSubAgentFlowId('flow-missing');

    expect(warn).toHaveBeenCalled();
    // The save at `:1312` has already run by the time the guard at `:1323` fires,
    // so this is not an atomic no-op like A4 — the edits are committed...
    expect(flowById('flow-a').nodes.map((n) => n.id)).toEqual(['a-edit']);
    // ...while the editor stays exactly where it was, still showing flow-a.
    expect(store().activeSubAgentFlowId).toBe('flow-a');
    expect(nodeIds()).toEqual(['a-edit']);
  });
});

// ===========================================================================
// D. cancelSubAgentFlowEditing (`:1358-1385`)
// ===========================================================================

describe('cancelSubAgentFlowEditing', () => {
  it('restores the parent canvas and discards the nested edits', () => {
    const mainNodes = [canvasNode('main-1', 'subAgent'), refNode('ref-a', 'flow-a', 200)];
    const mainEdges = [canvasEdge('main-e', 'main-1', 'ref-a')];
    installMain(mainNodes, mainEdges, [subAgentFlow('flow-a')]);
    store().setSelectedNodeId('main-1');
    const flowBefore = flowById('flow-a');
    store().setActiveSubAgentFlowId('flow-a');
    store().setCanvas([canvasNode('discard-me', 'subAgent')], []);

    store().cancelSubAgentFlowEditing();

    expect(store().nodes).toEqual(mainNodes);
    expect(store().edges).toEqual(mainEdges);
    expect(store().selectedNodeId).toBe('main-1');
    expect(store().activeSubAgentFlowId).toBeNull();
    expect(store().mainWorkflowSnapshot).toBeNull();
    // Identity: cancel must not write the canvas back, not even an equal copy.
    expect(flowById('flow-a')).toBe(flowBefore);
  });

  it('deletes a flow that was newly created, and keeps one that already had a reference', () => {
    installMain([canvasNode('main-1', 'subAgent')], [], [subAgentFlow('flow-new')]);
    store().setActiveSubAgentFlowId('flow-new');

    store().cancelSubAgentFlowEditing();

    // Cancelling out of "create a Sub-Agent Flow" must not leave an orphan
    // entry behind in the saved file.
    expect(store().subAgentFlows).toHaveLength(0);

    installMain([refNode('ref-a', 'flow-existing')], [], [subAgentFlow('flow-existing')]);
    store().setActiveSubAgentFlowId('flow-existing');

    store().cancelSubAgentFlowEditing();

    expect(store().subAgentFlows.map((sf) => sf.id)).toEqual(['flow-existing']);
  });

  it('does nothing on the main canvas', () => {
    // A stray Escape outside the nested editor must not disturb the canvas.
    installMain([canvasNode('main-1', 'subAgent')], [canvasEdge('e', 'main-1', 'main-1')]);
    const nodesBefore = store().nodes;
    const edgesBefore = store().edges;

    store().cancelSubAgentFlowEditing();

    expect(store().nodes).toBe(nodesBefore);
    expect(store().edges).toBe(edgesBefore);
  });
});

// ===========================================================================
// E. removeSubAgentFlow while that flow is open (`:1086-1104`)
// ===========================================================================

describe('removeSubAgentFlow', () => {
  it('returns to the parent canvas and drops the entry without saving the nested edits', () => {
    const mainNodes = [canvasNode('main-1', 'subAgent'), refNode('ref-a', 'flow-a', 200)];
    installMain(mainNodes, [], [subAgentFlow('flow-a'), subAgentFlow('flow-b')]);
    store().setSelectedNodeId('main-1');
    store().setActiveSubAgentFlowId('flow-a');
    store().setCanvas([canvasNode('never-saved', 'subAgent')], []);

    store().removeSubAgentFlow('flow-a');

    expect(store().nodes).toEqual(mainNodes);
    expect(store().selectedNodeId).toBe('main-1');
    expect(store().activeSubAgentFlowId).toBeNull();
    expect(store().mainWorkflowSnapshot).toBeNull();
    expect(store().subAgentFlows.map((sf) => sf.id)).toEqual(['flow-b']);
  });
});

// ===========================================================================
// F. Conversion losses — pinned as current behaviour (bug #1042)
// ===========================================================================

describe('CURRENT BEHAVIOUR (bug #1042) — fields the enter/exit conversions drop', () => {
  it('destroys a group and its membership inside a nested flow on a single open-and-close', () => {
    installMain(
      [refNode('ref-a', 'flow-a')],
      [],
      [
        subAgentFlow('flow-a', [
          savedNode(
            'grp',
            'group',
            0,
            0,
            { label: 'Phase 1' },
            {
              style: { width: 400, height: 300 },
            }
          ),
          savedNode('inside', 'subAgent', 20, 20, { label: 'Inside' }, { parentId: 'grp' }),
        ]),
      ]
    );

    store().setActiveSubAgentFlowId('flow-a');

    // Gone on the way in: React Flow needs `parentId` to draw the node inside
    // the group and `style` to give the group its size, so the user opens the
    // editor and their grouping is already not there.
    expect(nodeById('inside').parentId).toBeUndefined();
    expect(nodeById('grp').style).toBeUndefined();

    // The user changes nothing and closes the editor.
    store().setActiveSubAgentFlowId(null);

    // Gone on the way out too, so the loss is now in `subAgentFlows` and will be
    // written to `workflow.json` by the next save.
    const saved = flowById('flow-a');
    expect(saved.nodes.find((n) => n.id === 'inside')?.parentId).toBeUndefined();
    expect(saved.nodes.find((n) => n.id === 'grp')?.style).toBeUndefined();
  });

  it('destroys a branch condition inside a nested flow on a single open-and-close', () => {
    // Same class of defect as #1039, in a different function: `condition` is the
    // option label that decides which branch an AskUserQuestion answer takes, so
    // losing it silently rewires the generated instructions.
    installMain(
      [refNode('ref-a', 'flow-a')],
      [],
      [
        subAgentFlow(
          'flow-a',
          [savedNode('ask', 'askUserQuestion'), savedNode('next', 'subAgent', 300)],
          [savedConnection('c-1', 'ask', 'next', { condition: 'Yes, proceed' })]
        ),
      ]
    );

    store().setActiveSubAgentFlowId('flow-a');

    // Not carried onto the edge, so nothing on the canvas can render or preserve it.
    expect(store().edges[0]).not.toHaveProperty('condition');
    expect((store().edges[0] as Edge).data).toBeUndefined();

    store().setActiveSubAgentFlowId(null);

    expect(flowById('flow-a').connections[0]).toEqual({
      id: 'c-1',
      from: 'ask',
      to: 'next',
      fromPort: 'output',
      toPort: 'input',
    });
    expect(flowById('flow-a').connections[0]).not.toHaveProperty('condition');
  });
});
