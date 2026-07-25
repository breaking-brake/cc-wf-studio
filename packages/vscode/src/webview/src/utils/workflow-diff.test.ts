/**
 * Suite S6 (first slice) — the review gate for MCP `apply_workflow` (issue #1017).
 *
 * `computeWorkflowDiff` is the only thing that describes an incoming workflow
 * before it replaces what is on the canvas. `App.tsx:586` calls it when an MCP
 * `apply_workflow` arrives with `requireConfirmation`, stores the result in
 * `pendingMcpApply`, and renders it through `DiffPreviewDialog` — the primary
 * interface for external AI agents per CLAUDE.md.
 *
 * So what these tests protect is the user's decision: that the summary they
 * approve matches what is about to be written. If this breaks, a removed node
 * goes unlisted, or "no changes" is shown for an apply that rewrites three
 * nodes, and the user clicks Apply on a description of a different edit.
 *
 * Four of the assertions below pin behaviour that is surprising, and pin it
 * **as it is** rather than as it arguably should be: the diff compares
 * serialized form, not meaning, so an unchanged wire and an unchanged
 * question node can both read as changes. That is filed as issue #1018 for
 * the feature track — whoever fixes it should update those four cases rather
 * than work around them. They are not skipped, because the code does today
 * what they say it does.
 *
 * The zustand-store half of S6 (undo/redo, `clearWorkflow`, unsaved-change
 * detection) is deliberately not here: `workflow-store.ts` reads
 * `localStorage` at store-creation time and needs a stub this module does not.
 */

import type { Connection, Workflow, WorkflowNode } from '@cc-wf-studio/core';
import type { Edge, Node } from 'reactflow';
import { describe, expect, it } from 'vitest';
import { computeWorkflowDiff } from './workflow-diff';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/** A node as React Flow holds it on the canvas. `type` is optional there. */
function canvasNode(id: string, type: string | undefined, data: Record<string, unknown>): Node {
  return { id, type, position: { x: 0, y: 0 }, data } as Node;
}

/**
 * A node as it arrives *from an agent*, i.e. parsed out of a JSON payload.
 *
 * The cast is deliberate. `WorkflowNode` is a discriminated union pairing each
 * type with its own data shape, but an `apply_workflow` payload is not
 * type-checked on the way in, and several cases below feed exactly the shapes
 * that are not supposed to happen — a node with no `type` at all.
 */
function incomingNode(
  id: string,
  type: string | undefined,
  data: Record<string, unknown>
): WorkflowNode {
  return { id, type, name: id, position: { x: 0, y: 0 }, data } as unknown as WorkflowNode;
}

function conn(from: string, to: string, fromPort = 'output', toPort = 'input'): Connection {
  return { id: `${from}-${to}-${fromPort}-${toPort}`, from, to, fromPort, toPort };
}

function canvasEdge(
  source: string,
  target: string,
  sourceHandle: string | null = 'output',
  targetHandle: string | null = 'input'
): Edge {
  return {
    id: `${source}-${target}-${sourceHandle}-${targetHandle}`,
    source,
    target,
    sourceHandle,
    targetHandle,
  };
}

function incomingWorkflow(
  name: string,
  nodes: WorkflowNode[],
  connections: Connection[] = []
): Workflow {
  return {
    id: 'wf-1',
    name,
    version: '1.0.0',
    nodes,
    connections,
    createdAt: new Date('2020-01-01T00:00:00Z'),
    updatedAt: new Date('2020-01-01T00:00:00Z'),
  };
}

/**
 * Three canvas nodes, so `isNewWorkflow` is false and does not confound the
 * node/connection cases. Named ids so a failure message says which node.
 */
const CANVAS_BASE: Node[] = [
  canvasNode('start_1', 'start', { description: 'Start' }),
  canvasNode('agent_1', 'subAgent', { description: 'Reviewer' }),
  canvasNode('end_1', 'end', { description: 'End' }),
];

const INCOMING_BASE: WorkflowNode[] = [
  incomingNode('start_1', 'start', { description: 'Start' }),
  incomingNode('agent_1', 'subAgent', { description: 'Reviewer' }),
  incomingNode('end_1', 'end', { description: 'End' }),
];

// ---------------------------------------------------------------------------
// A. Node classification
// ---------------------------------------------------------------------------

describe('computeWorkflowDiff — node classification', () => {
  it('sorts each node into exactly one of added / removed / modified', () => {
    const current = [
      canvasNode('keep_1', 'prompt', { description: 'Kept' }),
      canvasNode('gone_1', 'prompt', { description: 'Dropped' }),
      canvasNode('edit_1', 'prompt', { description: 'Before' }),
    ];
    const incoming = incomingWorkflow('wf', [
      incomingNode('keep_1', 'prompt', { description: 'Kept' }),
      incomingNode('edit_1', 'prompt', { description: 'After' }),
      incomingNode('new_1', 'skill', { description: 'Added' }),
    ]);

    const diff = computeWorkflowDiff(current, [], 'wf', incoming);

    // Whole lists, not membership: a node landing in two categories fails here.
    expect(diff.addedNodes).toEqual([{ id: 'new_1', name: 'Added', type: 'skill' }]);
    expect(diff.removedNodes).toEqual([{ id: 'gone_1', name: 'Dropped', type: 'prompt' }]);
    expect(diff.modifiedNodes).toEqual([{ id: 'edit_1', name: 'After', type: 'prompt' }]);
  });

  it('leaves an unchanged node out of all three lists', () => {
    const diff = computeWorkflowDiff(CANVAS_BASE, [], 'wf', incomingWorkflow('wf', INCOMING_BASE));

    expect(diff.addedNodes).toEqual([]);
    expect(diff.removedNodes).toEqual([]);
    expect(diff.modifiedNodes).toEqual([]);
  });

  it('falls back to the node id for a removed node with no description', () => {
    const diff = computeWorkflowDiff(
      [canvasNode('gone_1', 'prompt', {})],
      [],
      'wf',
      incomingWorkflow('wf', [])
    );

    expect(diff.removedNodes).toEqual([{ id: 'gone_1', name: 'gone_1', type: 'prompt' }]);
  });

  it('falls back to the node id for an added node with no description', () => {
    // The same rule is written twice — `getNodeName` for canvas nodes, an inline
    // expression for incoming ones — so each side needs its own case: a refactor
    // may well update only one of them.
    const diff = computeWorkflowDiff(
      [],
      [],
      'wf',
      incomingWorkflow('wf', [incomingNode('new_1', 'prompt', {})])
    );

    expect(diff.addedNodes).toEqual([{ id: 'new_1', name: 'new_1', type: 'prompt' }]);
  });

  it("reports a typeless removed node as 'unknown', but passes a typeless added node through", () => {
    // Asymmetric on purpose: only the canvas side has a fallback.
    const diff = computeWorkflowDiff(
      [canvasNode('gone_1', undefined, { description: 'Dropped' })],
      [],
      'wf',
      incomingWorkflow('wf', [incomingNode('new_1', undefined, { description: 'Added' })])
    );

    expect(diff.removedNodes).toEqual([{ id: 'gone_1', name: 'Dropped', type: 'unknown' }]);
    expect(diff.addedNodes).toEqual([{ id: 'new_1', name: 'Added', type: undefined }]);
  });

  it('reports a node as modified when only the key order of its data differs', () => {
    // The comparison is `JSON.stringify(data)`, which is key-order sensitive.
    const current = [
      canvasNode('agent_1', 'subAgent', { description: 'Reviewer', model: 'haiku' }),
    ];
    const incoming = incomingWorkflow('wf', [
      incomingNode('agent_1', 'subAgent', { model: 'haiku', description: 'Reviewer' }),
    ]);

    const diff = computeWorkflowDiff(current, [], 'wf', incoming);

    expect(diff.modifiedNodes).toEqual([{ id: 'agent_1', name: 'Reviewer', type: 'subAgent' }]);
  });

  it('reports an askUserQuestion node as modified when the agent omits the generated option ids', () => {
    // Reachable in normal use, not a contrived case: `deserializeWorkflow` runs
    // `ensureNodeDataItemIds`, so every askUserQuestion option on the canvas
    // carries a generated `id`. An agent authoring the same visible question
    // has no reason to invent those ids, so the node reads as modified even
    // though nothing the user can see has changed — the dialog will list a
    // "modified" node for an edit that changes nothing.
    //
    // Asserted as observed, and filed as #1018. Making the comparison semantic
    // would mean editing product source, which is the feature track's call.
    const current = [
      canvasNode('ask_1', 'askUserQuestion', {
        description: 'Pick one',
        options: [
          { id: 'opt-generated-1', label: 'Yes' },
          { id: 'opt-generated-2', label: 'No' },
        ],
      }),
    ];
    const incoming = incomingWorkflow('wf', [
      incomingNode('ask_1', 'askUserQuestion', {
        description: 'Pick one',
        options: [{ label: 'Yes' }, { label: 'No' }],
      }),
    ]);

    const diff = computeWorkflowDiff(current, [], 'wf', incoming);

    expect(diff.modifiedNodes).toEqual([
      { id: 'ask_1', name: 'Pick one', type: 'askUserQuestion' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// B. Connection counting
// ---------------------------------------------------------------------------

describe('computeWorkflowDiff — connection counting', () => {
  it('counts nothing when the connection sets match', () => {
    const diff = computeWorkflowDiff(
      CANVAS_BASE,
      [canvasEdge('start_1', 'agent_1'), canvasEdge('agent_1', 'end_1')],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE, [conn('start_1', 'agent_1'), conn('agent_1', 'end_1')])
    );

    expect(diff.addedConnections).toBe(0);
    expect(diff.removedConnections).toBe(0);
  });

  it('counts a genuinely added and a genuinely removed connection once each', () => {
    const diff = computeWorkflowDiff(
      CANVAS_BASE,
      [canvasEdge('start_1', 'agent_1')],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE, [conn('start_1', 'end_1')])
    );

    expect(diff.addedConnections).toBe(1);
    expect(diff.removedConnections).toBe(1);
  });

  it('reports one unchanged connection as 1 added + 1 removed when the canvas handles are null', () => {
    // The two key builders disagree on the port default: the canvas key uses
    // `sourceHandle ?? ''`, the incoming key uses `fromPort` verbatim, and
    // `serializeWorkflow` normalizes a null handle to 'output'/'input'. So the
    // same wire, saved and sent back, does not match itself. Filed as #1018.
    const diff = computeWorkflowDiff(
      CANVAS_BASE,
      [canvasEdge('start_1', 'agent_1', null, null)],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE, [conn('start_1', 'agent_1', 'output', 'input')])
    );

    expect(diff.addedConnections).toBe(1);
    expect(diff.removedConnections).toBe(1);
  });

  it("reports a start→subAgent wire as 1 added + 1 removed because the canvas emits 'out' where an agent writes 'output'", () => {
    // Not limited to the null case. Handle ids differ per node component —
    // StartNode renders id="out", SubAgentNode renders id="input" — while the
    // AI-authoring guide's examples tell agents to write "fromPort": "output".
    // So the most common wire in the product diffs as a change every time.
    const diff = computeWorkflowDiff(
      CANVAS_BASE,
      [canvasEdge('start_1', 'agent_1', 'out', 'input')],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE, [conn('start_1', 'agent_1', 'output', 'input')])
    );

    expect(diff.addedConnections).toBe(1);
    expect(diff.removedConnections).toBe(1);
  });

  it('collapses duplicate parallel connections, counting the wire once', () => {
    // Both sides are Sets, so two identical wires share one key.
    const diff = computeWorkflowDiff(
      CANVAS_BASE,
      [],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE, [
        conn('start_1', 'agent_1'),
        { ...conn('start_1', 'agent_1'), id: 'duplicate' },
      ])
    );

    expect(diff.addedConnections).toBe(1);
    expect(diff.removedConnections).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// C. isNewWorkflow — switches the dialog heading (DiffPreviewDialog.tsx:89)
// ---------------------------------------------------------------------------

describe('computeWorkflowDiff — isNewWorkflow', () => {
  it('is true for an empty canvas', () => {
    const diff = computeWorkflowDiff([], [], 'wf', incomingWorkflow('wf', INCOMING_BASE));

    expect(diff.isNewWorkflow).toBe(true);
  });

  it('is true for the default start + end with no edge between them', () => {
    const current = [
      canvasNode('start_1', 'start', { description: 'Start' }),
      canvasNode('end_1', 'end', { description: 'End' }),
    ];

    const diff = computeWorkflowDiff(current, [], 'wf', incomingWorkflow('wf', INCOMING_BASE));

    expect(diff.isNewWorkflow).toBe(true);
  });

  it('is false once the user has wired start → end, because any edge disqualifies it', () => {
    const current = [
      canvasNode('start_1', 'start', { description: 'Start' }),
      canvasNode('end_1', 'end', { description: 'End' }),
    ];

    const diff = computeWorkflowDiff(
      current,
      [canvasEdge('start_1', 'end_1')],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE)
    );

    expect(diff.isNewWorkflow).toBe(false);
  });

  it('is false for three nodes, and for two nodes that are not start/end', () => {
    const three = computeWorkflowDiff(CANVAS_BASE, [], 'wf', incomingWorkflow('wf', INCOMING_BASE));
    expect(three.isNewWorkflow).toBe(false);

    const twoOther = computeWorkflowDiff(
      [
        canvasNode('agent_1', 'subAgent', { description: 'A' }),
        canvasNode('agent_2', 'subAgent', { description: 'B' }),
      ],
      [],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE)
    );
    expect(twoOther.isNewWorkflow).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// D. totalChanges and nameChange
// ---------------------------------------------------------------------------

describe('computeWorkflowDiff — totalChanges and nameChange', () => {
  /**
   * One scenario per term of the sum, so dropping any single term from
   * `totalChanges` fails a case that names the term that went missing.
   */
  const singleChangeCases: {
    term: string;
    current: Node[];
    edges: Edge[];
    currentName: string;
    incoming: Workflow;
  }[] = [
    {
      term: 'name change',
      current: CANVAS_BASE,
      edges: [],
      currentName: 'Before',
      incoming: incomingWorkflow('After', INCOMING_BASE),
    },
    {
      term: 'added node',
      current: CANVAS_BASE,
      edges: [],
      currentName: 'wf',
      incoming: incomingWorkflow('wf', [
        ...INCOMING_BASE,
        incomingNode('new_1', 'prompt', { description: 'Added' }),
      ]),
    },
    {
      term: 'removed node',
      current: [...CANVAS_BASE, canvasNode('gone_1', 'prompt', { description: 'Dropped' })],
      edges: [],
      currentName: 'wf',
      incoming: incomingWorkflow('wf', INCOMING_BASE),
    },
    {
      term: 'modified node',
      current: CANVAS_BASE,
      edges: [],
      currentName: 'wf',
      incoming: incomingWorkflow('wf', [
        incomingNode('start_1', 'start', { description: 'Start' }),
        incomingNode('agent_1', 'subAgent', { description: 'Renamed' }),
        incomingNode('end_1', 'end', { description: 'End' }),
      ]),
    },
    {
      term: 'added connection',
      current: CANVAS_BASE,
      edges: [],
      currentName: 'wf',
      incoming: incomingWorkflow('wf', INCOMING_BASE, [conn('start_1', 'agent_1')]),
    },
    {
      term: 'removed connection',
      current: CANVAS_BASE,
      edges: [canvasEdge('start_1', 'agent_1')],
      currentName: 'wf',
      incoming: incomingWorkflow('wf', INCOMING_BASE),
    },
  ];

  for (const { term, current, edges, currentName, incoming } of singleChangeCases) {
    it(`counts a single ${term} as exactly 1 change`, () => {
      const diff = computeWorkflowDiff(current, edges, currentName, incoming);

      expect(diff.totalChanges).toBe(1);
    });
  }

  it('sums every category at once', () => {
    const current = [...CANVAS_BASE, canvasNode('gone_1', 'prompt', { description: 'Dropped' })];
    const incoming = incomingWorkflow(
      'After',
      [
        incomingNode('start_1', 'start', { description: 'Start' }),
        incomingNode('agent_1', 'subAgent', { description: 'Renamed' }),
        incomingNode('end_1', 'end', { description: 'End' }),
        incomingNode('new_1', 'prompt', { description: 'Added' }),
      ],
      [conn('start_1', 'agent_1')]
    );

    const diff = computeWorkflowDiff(current, [canvasEdge('agent_1', 'end_1')], 'Before', incoming);

    // 1 name + 1 added + 1 removed + 1 modified + 1 added conn + 1 removed conn
    expect(diff.totalChanges).toBe(6);
  });

  it('reports zero changes for a no-op apply', () => {
    // DiffPreviewDialog keys its "no changes" message off exactly this value.
    const diff = computeWorkflowDiff(
      CANVAS_BASE,
      [canvasEdge('start_1', 'agent_1')],
      'wf',
      incomingWorkflow('wf', INCOMING_BASE, [conn('start_1', 'agent_1')])
    );

    expect(diff.totalChanges).toBe(0);
  });

  it('reports nameChange as null when the names match and as from/to when they differ', () => {
    const same = computeWorkflowDiff(CANVAS_BASE, [], 'wf', incomingWorkflow('wf', INCOMING_BASE));
    expect(same.nameChange).toBeNull();

    const changed = computeWorkflowDiff(
      CANVAS_BASE,
      [],
      'Before',
      incomingWorkflow('After', INCOMING_BASE)
    );
    expect(changed.nameChange).toEqual({ from: 'Before', to: 'After' });
  });
});
