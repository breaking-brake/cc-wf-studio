/**
 * Suite S6 (fifth slice) — `setActiveWorkflow`, the conversion that decides
 * what a loaded workflow becomes on the canvas (issue #1038).
 *
 * Every path by which a workflow reaches the canvas ends in this one action:
 * opening a `workflow.json` (`Toolbar.tsx:340-356`), an MCP `apply_workflow`
 * (`App.tsx:616-621`, and `:321` after the review confirmation), the Slack
 * import (`App.tsx:451-455`), and the sample load (`App.tsx:480-486`). It is
 * the **last writer** of `nodes` and `edges` on all of them, so whatever its
 * conversion drops is what the user loses — and, because `serializeWorkflow`
 * reads back from that same store state, what the next save writes out.
 *
 * Two things are under test here, and they are deliberately separated:
 *
 * - **Section A — the conversion contract.** `setActiveWorkflow` is one of
 *   three near-identical `Workflow → canvas` converters in `workflow-store.ts`
 *   (`addGeneratedWorkflow:871`, `updateWorkflow:921`, `setActiveWorkflow:964`)
 *   and they have **already drifted**: the first two run `normalizeMcpNodeData`,
 *   this one does not. Duplicated logic that has drifted once is where the next
 *   drift lands unopposed, so the contract is pinned field by field.
 *
 * - **Section B — the load-order contract.** Every caller runs
 *   `deserializeWorkflow` → `setCanvas` → **then** `setActiveWorkflow`.
 *   `setCanvas` is a plain setter (`:441`) and `setActiveWorkflow` calls
 *   `set({ nodes, edges })` at `:993`, so the second conversion **overwrites**
 *   the first — and it is strictly weaker than it. Each case below asserts the
 *   state after *both* steps in a single test, so the divergence itself is the
 *   assertion and neither half can pass alone.
 *
 * The section B cases are pinned **as currently observed**, not as desired, and
 * are named `CURRENT BEHAVIOUR (bug #1039)`. That keeps the suite green today
 * and turns it red the moment the feature loop fixes the defect on `auto-dev` —
 * which is the intended signal. This loop does not edit product source.
 *
 * A sibling file to the three existing store suites rather than an addition to
 * them: vitest gives each test file its own module registry, so the store's
 * module-global state here cannot perturb theirs.
 */

import type {
  Connection,
  McpNodeData,
  SubAgentFlow,
  Workflow,
  WorkflowNode,
} from '@cc-wf-studio/core';
import { beforeEach, describe, expect, it } from 'vitest';
import { deserializeWorkflow, serializeWorkflow } from '../services/workflow-service';
import { useWorkflowStore } from './workflow-store';

const store = () => useWorkflowStore.getState();

const nodeIds = () => store().nodes.map((n) => n.id);

const nodeById = (id: string) => {
  const found = store().nodes.find((n) => n.id === id);
  if (!found) throw new Error(`expected a node with id "${id}" on the canvas`);
  return found;
};

/**
 * A node as it appears inside a saved `workflow.json`.
 *
 * The `WorkflowNode` cast mirrors the sibling suites: `WorkflowNode` is a
 * discriminated union pairing each node type with its own data shape, while the
 * code under test only ever reads `id`, `type`, `position`, `data`, `parentId`
 * and `style`.
 */
function savedNode(
  id: string,
  type: string,
  x = 0,
  y = 0,
  extra: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id,
    name: id,
    type,
    position: { x, y },
    data: { label: id },
    ...extra,
  } as unknown as WorkflowNode;
}

function savedWorkflow(
  nodes: WorkflowNode[],
  connections: Connection[] = [],
  extra: Record<string, unknown> = {}
): Workflow {
  return {
    id: 'wf-under-test',
    version: '1.0.0',
    name: 'applied-workflow',
    nodes,
    connections,
    ...extra,
  } as unknown as Workflow;
}

/** A connection as it appears inside a saved `workflow.json`. */
function savedConnection(
  id: string,
  from: string,
  to: string,
  extra: Record<string, unknown> = {}
): Connection {
  return { id, from, to, ...extra } as unknown as Connection;
}

beforeEach(() => {
  useWorkflowStore.setState({
    activeWorkflow: null,
    subAgentFlows: [],
    activeSubAgentFlowId: null,
    selectedNodeId: null,
    highlightedGroupNodeId: null,
    isTourActive: false,
    tourStepIndex: 0,
  });
  store().setCanvas([], []);
});

// ===========================================================================
// A. The conversion contract
// ===========================================================================

describe('setActiveWorkflow — node conversion', () => {
  it('copies id, type and position verbatim from each saved node', () => {
    store().setActiveWorkflow(
      savedWorkflow([
        savedNode('agent-1', 'subAgent', 120, 340),
        savedNode('q-1', 'askUserQuestion', -80, 0),
      ])
    );

    expect(nodeIds()).toEqual(['agent-1', 'q-1']);
    expect(nodeById('agent-1').type).toBe('subAgent');
    expect(nodeById('agent-1').position).toEqual({ x: 120, y: 340 });
    // Negative coordinates are legal on the canvas and must not be clamped.
    expect(nodeById('q-1').type).toBe('askUserQuestion');
    expect(nodeById('q-1').position).toEqual({ x: -80, y: 0 });
  });

  it('writes parentId and style only for the nodes that carry them', () => {
    store().setActiveWorkflow(
      savedWorkflow([
        savedNode('grp', 'group', 0, 0, { style: { width: 400, height: 300 } }),
        savedNode('inside', 'subAgent', 20, 20, { parentId: 'grp' }),
        savedNode('outside', 'subAgent', 500, 20),
      ])
    );

    expect(nodeById('inside').parentId).toBe('grp');
    expect(nodeById('grp').style).toEqual({ width: 400, height: 300 });

    // Absence, not undefined-ness: React Flow treats a present `parentId` key
    // as a containment claim, so a blanket spread would re-parent every node.
    expect('parentId' in nodeById('outside')).toBe(false);
    expect('style' in nodeById('outside')).toBe(false);
    expect('parentId' in nodeById('grp')).toBe(false);
  });

  it('gives a group node zIndex -1001 and leaves every other node without the key', () => {
    // The "edges inside a group stay clickable" guard: selected group renders at
    // -1001 + 1000 = -1, still below the edge SVG layer at 0.
    store().setActiveWorkflow(
      savedWorkflow([savedNode('grp', 'group'), savedNode('agent-1', 'subAgent')])
    );

    expect(nodeById('grp').zIndex).toBe(-1001);
    // Asserted as key absence: a blanket `zIndex` on every node would satisfy a
    // presence-only check while burying ordinary nodes under the edge layer.
    expect('zIndex' in nodeById('agent-1')).toBe(false);
  });
});

describe('setActiveWorkflow — parent-first ordering', () => {
  it('hoists a group declared after its child, and leaves a childless group in place', () => {
    // React Flow requires a parent to precede its children in the array, and a
    // saved file carries no ordering guarantee. Note what the partition is on:
    // "is some node's parent", not "is a group" — `grp-childless` is a group
    // with no children and is therefore NOT hoisted.
    store().setActiveWorkflow(
      savedWorkflow([
        savedNode('child', 'subAgent', 20, 20, { parentId: 'grp-parent' }),
        savedNode('plain', 'subAgent', 500, 20),
        savedNode('grp-childless', 'group', 800, 0),
        savedNode('grp-parent', 'group', 0, 0),
      ])
    );

    expect(nodeIds()).toEqual(['grp-parent', 'child', 'plain', 'grp-childless']);
  });
});

describe('setActiveWorkflow — edge conversion', () => {
  it('renames the four connection fields onto the ReactFlow edge', () => {
    store().setActiveWorkflow(
      savedWorkflow(
        [savedNode('a', 'subAgent'), savedNode('b', 'subAgent')],
        [savedConnection('c-1', 'a', 'b', { fromPort: 'yes', toPort: 'in' })]
      )
    );

    expect(store().edges).toHaveLength(1);
    const edge = store().edges[0];
    expect(edge.id).toBe('c-1');
    expect(edge.source).toBe('a');
    expect(edge.target).toBe('b');
    expect(edge.sourceHandle).toBe('yes');
    expect(edge.targetHandle).toBe('in');
  });

  it('copies the ports verbatim — no output/input defaulting on this path', () => {
    // `serializeWorkflow:65-66` defaults a missing handle to 'output'/'input'
    // when writing the file; this direction does not. A connection saved
    // without ports therefore yields undefined handles, not defaulted ones.
    store().setActiveWorkflow(
      savedWorkflow(
        [savedNode('a', 'subAgent'), savedNode('b', 'subAgent')],
        [savedConnection('c-1', 'a', 'b')]
      )
    );

    expect(store().edges[0].sourceHandle).toBeUndefined();
    expect(store().edges[0].targetHandle).toBeUndefined();
  });
});

describe('setActiveWorkflow — the rest of the store state', () => {
  it('passes subAgentFlows through when present and substitutes [] when the key is absent', () => {
    const flows = [{ id: 'flow-1', nodes: [], connections: [] }] as unknown as SubAgentFlow[];

    store().setActiveWorkflow(
      savedWorkflow([savedNode('a', 'subAgent')], [], { subAgentFlows: flows })
    );
    expect(store().subAgentFlows).toEqual(flows);

    // A regression to `undefined` here is sub-agent flow data the next save drops.
    store().setActiveWorkflow(savedWorkflow([savedNode('a', 'subAgent')]));
    expect(store().subAgentFlows).toEqual([]);
  });

  it('adopts the workflow object and resets the tour and group highlight', () => {
    useWorkflowStore.setState({
      isTourActive: true,
      tourStepIndex: 3,
      highlightedGroupNodeId: 'grp',
    });
    const workflow = savedWorkflow([savedNode('a', 'subAgent')]);

    store().setActiveWorkflow(workflow);

    expect(store().activeWorkflow).toBe(workflow);
    // An MCP apply arriving mid-tour cancels the tour: the steps point at nodes
    // that may no longer exist.
    expect(store().isTourActive).toBe(false);
    expect(store().tourStepIndex).toBe(0);
    expect(store().highlightedGroupNodeId).toBeNull();
  });

  it('CURRENT BEHAVIOUR: leaves selectedNodeId pointing at a node the new workflow does not contain', () => {
    // Pinned as observed rather than as desired. Not obviously wrong — the MCP
    // apply path deliberately keeps the user's place — but nothing else records
    // it, and a rewrite of this action would change it silently.
    store().setSelectedNodeId('vanished-node');

    store().setActiveWorkflow(savedWorkflow([savedNode('a', 'subAgent')]));

    expect(nodeIds()).not.toContain('vanished-node');
    expect(store().selectedNodeId).toBe('vanished-node');
  });
});

// ===========================================================================
// B. The load-order contract
// ===========================================================================
//
// Driven exactly as the five call sites drive it: deserialize, setCanvas, then
// setActiveWorkflow. Each test asserts both halves so the overwrite is visible.

describe('load order — setActiveWorkflow overwrites deserializeWorkflow', () => {
  it('CURRENT BEHAVIOUR (bug #1039): a connection condition survives the load and is then dropped, and the next save omits it', () => {
    // The destructive case. An `askUserQuestion` option route carries its
    // `condition` on the edge; `serializeWorkflow` reads `edge.data?.condition`
    // (`workflow-service.ts:67`), so once the store has lost it, saving the file
    // writes the route away. This is open → save with no edit in between.
    const workflow = savedWorkflow(
      [savedNode('q-1', 'askUserQuestion'), savedNode('a', 'subAgent')],
      [
        savedConnection('c-1', 'q-1', 'a', {
          fromPort: 'opt-yes',
          toPort: 'input',
          condition: 'User chose Yes',
        }),
      ]
    );

    const { nodes, edges } = deserializeWorkflow(workflow);
    store().setCanvas(nodes, edges);

    // After the load, the condition is present.
    expect(store().edges[0].data).toEqual({ condition: 'User chose Yes' });

    store().setActiveWorkflow(workflow);

    // After the store action, it is gone — the edge literal at `:983-989` has
    // no `data` key at all.
    expect(store().edges[0].data).toBeUndefined();

    // And the round trip a user performs by opening a file and pressing save:
    const saved = serializeWorkflow(store().nodes, store().edges, 'applied-workflow');
    expect(saved.connections[0].condition).toBeUndefined();
    // The ports do survive, so the loss is specific rather than wholesale.
    expect(saved.connections[0].fromPort).toBe('opt-yes');
  });

  it('CURRENT BEHAVIOUR (bug #1039): backfilled askUserQuestion option ids are discarded', () => {
    const workflow = savedWorkflow([
      savedNode('q-1', 'askUserQuestion', 0, 0, {
        data: {
          label: 'q-1',
          options: [{ label: 'Yes' }, { label: 'No' }],
        },
      }),
    ]);

    const { nodes, edges } = deserializeWorkflow(workflow);
    store().setCanvas(nodes, edges);

    // Shape and uniqueness only — `generateOptionId` uses Date.now()/Math.random().
    const loaded = nodeById('q-1').data.options as { id?: string }[];
    expect(loaded.every((o) => typeof o.id === 'string' && o.id.startsWith('opt-'))).toBe(true);
    expect(new Set(loaded.map((o) => o.id)).size).toBe(2);

    store().setActiveWorkflow(workflow);

    const after = nodeById('q-1').data.options as { id?: string }[];
    expect(after.every((o) => o.id === undefined)).toBe(true);
  });

  it('CURRENT BEHAVIOUR (bug #1039): an ifElse repaired to two branches reverts to its malformed shape', () => {
    // `ensureNodeDataItemIds` pads a short ifElse to the two English fallbacks
    // and sets outputPorts: 2 (`node-data-normalize.ts:66-73`) so the node has
    // the handles its edges attach to.
    const workflow = savedWorkflow([
      savedNode('if-1', 'ifElse', 0, 0, {
        data: { label: 'if-1', branches: [{ label: 'Yes', condition: 'it is yes' }] },
      }),
    ]);

    const { nodes, edges } = deserializeWorkflow(workflow);
    store().setCanvas(nodes, edges);

    const repaired = nodeById('if-1').data as {
      branches: { label: string }[];
      outputPorts: number;
    };
    expect(repaired.branches).toHaveLength(2);
    expect(repaired.branches[1].label).toBe('False');
    expect(repaired.outputPorts).toBe(2);

    store().setActiveWorkflow(workflow);

    const after = nodeById('if-1').data as { branches: { label: string }[]; outputPorts?: number };
    expect(after.branches).toHaveLength(1);
    expect(after.outputPorts).toBeUndefined();
  });

  it('CURRENT BEHAVIOUR: addGeneratedWorkflow normalizes a legacy MCP mode and setActiveWorkflow does not', () => {
    // The two converters on the same fixture, so the drift itself is the
    // assertion: `:882` runs normalizeMcpNodeData, `:974` does not. The
    // store-side half of #1025's premise.
    const workflow = savedWorkflow([
      savedNode('mcp-1', 'mcp', 0, 0, {
        data: { label: 'mcp-1', mode: 'fullNaturalLanguage' },
      }),
    ]);

    store().addGeneratedWorkflow(workflow);
    expect((nodeById('mcp-1').data as McpNodeData).mode).toBe('aiToolSelection');

    store().setActiveWorkflow(workflow);
    expect((nodeById('mcp-1').data as McpNodeData).mode).toBe('fullNaturalLanguage');
  });
});
