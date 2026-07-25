/**
 * Suite S3 — the canvas serialization round-trip (issue #1014).
 *
 * `serializeWorkflow` is the only thing that writes the canvas back to a
 * workflow file, and `deserializeWorkflow` is the only thing that reads one
 * in. Every save in the product goes through them: App.tsx (load, save,
 * AI-edit round-trip, live diff), Toolbar.tsx, DescriptionPanel.tsx. Neither
 * is type-protected against dropping a field, and a dropped field is
 * invisible until the file is reopened or an agent runs it.
 *
 * So what these tests protect is the user's file: that a group's children
 * stay inside it, that a branch edge keeps the condition that routes it, and
 * that a configured slash-command option is still there after a save.
 *
 * `validateWorkflow` in the same module is out of scope — it is a
 * hand-written re-statement of constraints suite S1 already covers via zod,
 * and testing it here would transcribe it.
 */

import {
  NodeType,
  type QuestionOption,
  type SlashCommandOptions,
  type TourStep,
  type Workflow,
  type WorkflowNode,
} from '@cc-wf-studio/core';
import type { Edge, Node } from 'reactflow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { deserializeWorkflow, serializeWorkflow } from './workflow-service';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

/**
 * Build a workflow node as it arrives *from a file*.
 *
 * The cast is deliberate. `WorkflowNode` is a discriminated union pairing each
 * type with its own data shape, but several cases below feed deliberately
 * malformed input — an `ifElse` with one branch, options with no `id` — and
 * those are exactly the files the repair paths under test exist for. A file on
 * disk is not type-checked; neither is this fixture.
 */
function fileNode(
  id: string,
  type: NodeType,
  data: Record<string, unknown>,
  extra: { parentId?: string; style?: { width?: number; height?: number } } = {}
): WorkflowNode {
  return {
    id,
    type,
    name: id,
    position: { x: 10, y: 20 },
    data,
    ...(extra.parentId ? { parentId: extra.parentId } : {}),
    ...(extra.style ? { style: extra.style } : {}),
  } as unknown as WorkflowNode;
}

function fileWorkflow(nodes: WorkflowNode[], connections: Workflow['connections'] = []): Workflow {
  return {
    id: 'workflow-original',
    name: 'sample',
    version: '1.0.0',
    nodes,
    connections,
    createdAt: new Date('2020-03-04T05:06:07.000Z'),
    updatedAt: new Date('2020-03-04T05:06:07.000Z'),
  };
}

/** A React Flow node as the canvas holds it. */
function canvasNode(id: string, over: Partial<Node> = {}): Node {
  return { id, type: 'prompt', position: { x: 1, y: 2 }, data: {}, ...over };
}

function indexOfNode(nodes: Node[], id: string): number {
  return nodes.findIndex((n) => n.id === id);
}

// ===========================================================================
// A. deserializeWorkflow — the shape the canvas receives
// ===========================================================================

describe('deserializeWorkflow', () => {
  describe('parent-first ordering', () => {
    // React Flow requires a parent node to appear before its children,
    // otherwise the children render detached at the canvas root. Nothing
    // guarantees the file declares them in that order: AI-authored workflows
    // and `patch_workflow` output append nodes as they are created.
    it('emits a group before its children even when the file declares the children first', () => {
      const workflow = fileWorkflow([
        fileNode('child-a', NodeType.Prompt, { prompt: 'first' }, { parentId: 'group-1' }),
        fileNode('child-b', NodeType.Prompt, { prompt: 'second' }, { parentId: 'group-1' }),
        fileNode('group-1', NodeType.Group, { label: 'Setup' }),
      ]);

      const { nodes } = deserializeWorkflow(workflow);

      expect(indexOfNode(nodes, 'group-1')).toBeLessThan(indexOfNode(nodes, 'child-a'));
      expect(indexOfNode(nodes, 'group-1')).toBeLessThan(indexOfNode(nodes, 'child-b'));
    });

    it('keeps a group ahead of unrelated non-group nodes', () => {
      const workflow = fileWorkflow([
        fileNode('start-1', NodeType.Start, {}),
        fileNode('group-1', NodeType.Group, { label: 'Setup' }),
        fileNode('end-1', NodeType.End, {}),
      ]);

      const { nodes } = deserializeWorkflow(workflow);

      expect(indexOfNode(nodes, 'group-1')).toBeLessThan(indexOfNode(nodes, 'start-1'));
      expect(indexOfNode(nodes, 'group-1')).toBeLessThan(indexOfNode(nodes, 'end-1'));
    });
  });

  describe('optional node fields', () => {
    it('sets parentId only for a node that has one', () => {
      const workflow = fileWorkflow([
        fileNode('group-1', NodeType.Group, { label: 'Setup' }),
        fileNode('child-a', NodeType.Prompt, { prompt: 'x' }, { parentId: 'group-1' }),
        fileNode('loose', NodeType.Prompt, { prompt: 'y' }),
      ]);

      const { nodes } = deserializeWorkflow(workflow);
      const child = nodes[indexOfNode(nodes, 'child-a')];
      const loose = nodes[indexOfNode(nodes, 'loose')];

      expect(child.parentId).toBe('group-1');
      expect('parentId' in loose).toBe(false);
    });

    it('copies style only for a node that has one', () => {
      const workflow = fileWorkflow([
        fileNode(
          'group-1',
          NodeType.Group,
          { label: 'Setup' },
          { style: { width: 320, height: 180 } }
        ),
        fileNode('plain', NodeType.Prompt, { prompt: 'x' }),
      ]);

      const { nodes } = deserializeWorkflow(workflow);
      const group = nodes[indexOfNode(nodes, 'group-1')];
      const plain = nodes[indexOfNode(nodes, 'plain')];

      expect(group.style).toEqual({ width: 320, height: 180 });
      expect('style' in plain).toBe(false);
    });

    it('preserves id, type and position verbatim', () => {
      const workflow = fileWorkflow([fileNode('n-1', NodeType.Prompt, { prompt: 'x' })]);

      const { nodes } = deserializeWorkflow(workflow);

      expect(nodes[0].id).toBe('n-1');
      expect(nodes[0].type).toBe('prompt');
      expect(nodes[0].position).toEqual({ x: 10, y: 20 });
    });
  });

  describe('connections become edges', () => {
    it('renames from/to and fromPort/toPort onto the React Flow edge', () => {
      const workflow = fileWorkflow(
        [
          fileNode('a', NodeType.Prompt, { prompt: 'x' }),
          fileNode('b', NodeType.Prompt, { prompt: 'y' }),
        ],
        [{ id: 'e1', from: 'a', to: 'b', fromPort: 'output-2', toPort: 'input' }]
      );

      const { edges } = deserializeWorkflow(workflow);

      expect(edges).toEqual([
        {
          id: 'e1',
          source: 'a',
          target: 'b',
          sourceHandle: 'output-2',
          targetHandle: 'input',
          data: undefined,
        },
      ]);
    });

    // A regression here is what silently unroutes a branch edge: the edge
    // still draws, but the label that decides which answer follows it is gone.
    it('carries a condition into edge.data, and leaves data undefined without one', () => {
      const workflow = fileWorkflow(
        [
          fileNode('ask', NodeType.AskUserQuestion, {
            questionText: 'Pick',
            options: [{ id: 'o1', label: 'Yes', description: 'y' }],
            outputPorts: 2,
          }),
          fileNode('b', NodeType.Prompt, { prompt: 'y' }),
        ],
        [
          { id: 'e1', from: 'ask', to: 'b', fromPort: 'output', toPort: 'input', condition: 'Yes' },
          { id: 'e2', from: 'ask', to: 'b', fromPort: 'output-2', toPort: 'input' },
        ]
      );

      const { edges } = deserializeWorkflow(workflow);

      expect(edges[0].data).toEqual({ condition: 'Yes' });
      expect(edges[1].data).toBeUndefined();
    });
  });

  describe('load-time array-item id backfill', () => {
    it('generates unique ids for askUserQuestion options that have none', () => {
      const workflow = fileWorkflow([
        fileNode('ask', NodeType.AskUserQuestion, {
          questionText: 'Pick',
          options: [
            { label: 'Yes', description: 'y' },
            { label: 'No', description: 'n' },
          ],
          outputPorts: 2,
        }),
      ]);

      const { nodes } = deserializeWorkflow(workflow);
      const options = nodes[0].data.options as QuestionOption[];

      expect(options).toHaveLength(2);
      for (const option of options) {
        expect(option.id).toMatch(/^opt-/);
      }
      expect(options[0].id).not.toBe(options[1].id);
      expect(options.map((o) => o.label)).toEqual(['Yes', 'No']);
    });

    // The identity check is the point, not an implementation detail: returning
    // the same `data` reference when nothing changed is what stops the
    // property panel re-rendering on every load.
    it('returns the same data reference when every option already has an id', () => {
      const data = {
        questionText: 'Pick',
        options: [
          { id: 'o1', label: 'Yes', description: 'y' },
          { id: 'o2', label: 'No', description: 'n' },
        ],
        outputPorts: 2,
      };
      const workflow = fileWorkflow([fileNode('ask', NodeType.AskUserQuestion, data)]);

      const { nodes } = deserializeWorkflow(workflow);

      expect(nodes[0].data).toBe(data);
    });

    it.each([NodeType.Branch, NodeType.Switch])('backfills branch ids for a %s node', (type) => {
      const workflow = fileWorkflow([
        fileNode('n', type, {
          branchType: 'switch',
          branches: [
            { label: 'A', condition: 'is a' },
            { label: 'B', condition: 'is b' },
          ],
          outputPorts: 2,
        }),
      ]);

      const { nodes } = deserializeWorkflow(workflow);
      const branches = nodes[0].data.branches as { id?: string; label: string }[];

      expect(branches.map((b) => b.id)).toEqual([
        expect.stringMatching(/^branch_/),
        expect.stringMatching(/^branch_/),
      ]);
      expect(branches[0].id).not.toBe(branches[1].id);
      expect(branches.map((b) => b.label)).toEqual(['A', 'B']);
    });
  });

  describe('ifElse repair', () => {
    it('pads a node that arrives with no branches to the two English fallbacks', () => {
      const workflow = fileWorkflow([
        fileNode('if-1', NodeType.IfElse, { evaluationTarget: 'the previous result' }),
      ]);

      const { nodes } = deserializeWorkflow(workflow);
      const branches = nodes[0].data.branches as {
        id?: string;
        label: string;
        condition: string;
      }[];

      expect(branches.map((b) => b.label)).toEqual(['True', 'False']);
      expect(branches.map((b) => b.condition)).toEqual([
        'If the condition is true',
        'If the condition is false',
      ]);
      for (const branch of branches) {
        expect(branch.id).toMatch(/^branch_/);
      }
      expect(nodes[0].data.outputPorts).toBe(2);
    });

    it('keeps the single branch a malformed node does have and pads the second', () => {
      const workflow = fileWorkflow([
        fileNode('if-1', NodeType.IfElse, {
          branches: [{ id: 'kept', label: 'Approved', condition: 'the reviewer approved' }],
        }),
      ]);

      const { nodes } = deserializeWorkflow(workflow);
      const branches = nodes[0].data.branches as { id?: string; label: string }[];

      expect(branches).toHaveLength(2);
      expect(branches[0]).toEqual({
        id: 'kept',
        label: 'Approved',
        condition: 'the reviewer approved',
      });
      expect(branches[1].label).toBe('False');
      expect(branches[1].id).toMatch(/^branch_/);
      expect(nodes[0].data.outputPorts).toBe(2);
    });

    it('leaves a well-formed ifElse untouched — including not adding outputPorts', () => {
      // The asymmetry is worth pinning: the repair path sets outputPorts, the
      // untouched path does not. A node whose two branches already carry ids
      // comes back byte-for-byte as the file had it.
      const data = {
        branches: [
          { id: 'b1', label: 'Yes', condition: 'yes' },
          { id: 'b2', label: 'No', condition: 'no' },
        ],
      };
      const workflow = fileWorkflow([fileNode('if-1', NodeType.IfElse, data)]);

      const { nodes } = deserializeWorkflow(workflow);

      expect(nodes[0].data).toBe(data);
      expect('outputPorts' in nodes[0].data).toBe(false);
    });
  });
});

// ===========================================================================
// B. serializeWorkflow — what lands in the user's file
// ===========================================================================

describe('serializeWorkflow', () => {
  beforeEach(() => {
    // serializeWorkflow stamps `Date.now()` and `new Date()`; pin them so the
    // assertions describe behavior rather than the wall clock.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('node fields', () => {
    it('falls back to the node id when data carries no name', () => {
      const workflow = serializeWorkflow(
        [canvasNode('n-1'), canvasNode('n-2', { data: { name: 'Review code' } })],
        [],
        'my-workflow'
      );

      expect(workflow.nodes[0].name).toBe('n-1');
      expect(workflow.nodes[1].name).toBe('Review code');
    });

    it('narrows style to width and height only', () => {
      const workflow = serializeWorkflow(
        [canvasNode('n-1', { style: { width: 320, height: 180, background: 'red' } })],
        [],
        'my-workflow'
      );

      expect(workflow.nodes[0].style).toEqual({ width: 320, height: 180 });
    });

    it('writes only the dimension that is set', () => {
      const workflow = serializeWorkflow(
        [canvasNode('n-1', { style: { width: 320 } })],
        [],
        'my-workflow'
      );

      expect(workflow.nodes[0].style).toEqual({ width: 320 });
      expect('height' in (workflow.nodes[0].style ?? {})).toBe(false);
    });

    it('omits the style key entirely when neither dimension is set', () => {
      const workflow = serializeWorkflow(
        [canvasNode('n-1'), canvasNode('n-2', { style: { background: 'red' } })],
        [],
        'my-workflow'
      );

      expect('style' in workflow.nodes[0]).toBe(false);
      expect('style' in workflow.nodes[1]).toBe(false);
    });

    it('writes parentId only for a node that has one', () => {
      const workflow = serializeWorkflow(
        [canvasNode('g-1', { type: 'group' }), canvasNode('n-1', { parentId: 'g-1' })],
        [],
        'my-workflow'
      );

      expect('parentId' in workflow.nodes[0]).toBe(false);
      expect(workflow.nodes[1].parentId).toBe('g-1');
    });
  });

  describe('edges become connections', () => {
    it('defaults the handles to output/input when the canvas edge has none', () => {
      const edges: Edge[] = [{ id: 'e1', source: 'a', target: 'b' }];

      const workflow = serializeWorkflow([], edges, 'my-workflow');

      expect(workflow.connections[0].fromPort).toBe('output');
      expect(workflow.connections[0].toPort).toBe('input');
    });

    it('preserves explicit handles and the branch condition', () => {
      const edges: Edge[] = [
        {
          id: 'e1',
          source: 'ask',
          target: 'b',
          sourceHandle: 'output-2',
          targetHandle: 'input',
          data: { condition: 'Yes' },
        },
      ];

      const workflow = serializeWorkflow([], edges, 'my-workflow');

      expect(workflow.connections[0]).toEqual({
        id: 'e1',
        from: 'ask',
        to: 'b',
        fromPort: 'output-2',
        toPort: 'input',
        condition: 'Yes',
      });
    });

    it('leaves condition undefined when the edge carries no data', () => {
      const workflow = serializeWorkflow([], [{ id: 'e1', source: 'a', target: 'b' }], 'wf');

      expect(workflow.connections[0].condition).toBeUndefined();
    });
  });

  // The highest-value block in this suite: `hasNonDefaultOptions` is one
  // boolean built from six clauses, and each clause decides whether a setting
  // the user configured survives the save or silently vanishes. Dropping any
  // single clause must fail a named case below.
  describe('slashCommandOptions', () => {
    const cases: [name: string, input: SlashCommandOptions, expected: SlashCommandOptions][] = [
      ['context', { context: 'fork' }, { context: 'fork' }],
      ['model', { model: 'opus' }, { model: 'opus' }],
      [
        'hooks',
        { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }] } },
        { hooks: { Stop: [{ hooks: [{ type: 'command', command: 'echo done' }] }] } },
      ],
      ['allowedTools', { allowedTools: 'Bash,Read' }, { allowedTools: 'Bash,Read' }],
      [
        'disableModelInvocation',
        { disableModelInvocation: true },
        { disableModelInvocation: true },
      ],
      ['argumentHint', { argumentHint: '[file]' }, { argumentHint: '[file]' }],
    ];

    it.each(cases)('keeps %s when it is the only option set', (_name, input, expected) => {
      const workflow = serializeWorkflow(
        [],
        [],
        'my-workflow',
        undefined,
        undefined,
        undefined,
        input
      );

      expect(workflow.slashCommandOptions).toEqual(expected);
    });

    it('drops the default sentinels for context and model', () => {
      const workflow = serializeWorkflow([], [], 'my-workflow', undefined, undefined, undefined, {
        context: 'default',
        model: 'default',
        allowedTools: 'Bash',
      });

      expect(workflow.slashCommandOptions).toEqual({ allowedTools: 'Bash' });
    });

    it('drops empty hooks, allowedTools and argumentHint alongside a real option', () => {
      const workflow = serializeWorkflow([], [], 'my-workflow', undefined, undefined, undefined, {
        context: 'fork',
        hooks: {},
        allowedTools: '',
        argumentHint: '',
      });

      expect(workflow.slashCommandOptions).toEqual({ context: 'fork' });
    });

    it('omits the whole key when every option is default or empty', () => {
      const workflow = serializeWorkflow([], [], 'my-workflow', undefined, undefined, undefined, {
        context: 'default',
        model: 'default',
        hooks: {},
        allowedTools: '',
        disableModelInvocation: false,
        argumentHint: '',
      });

      expect(workflow.slashCommandOptions).toBeUndefined();
    });

    it('omits the whole key when no options are passed at all', () => {
      const workflow = serializeWorkflow([], [], 'my-workflow');

      expect(workflow.slashCommandOptions).toBeUndefined();
    });
  });

  describe('optional workflow-level payloads', () => {
    const tour: TourStep[] = [
      { order: 1, title: 'Start here', description: 'The entry point', nodeIds: ['start-1'] },
    ];

    it('includes a non-empty tour', () => {
      const workflow = serializeWorkflow(
        [],
        [],
        'my-workflow',
        undefined,
        undefined,
        undefined,
        undefined,
        tour
      );

      expect(workflow.tour).toEqual(tour);
    });

    it('does not write an empty tour array', () => {
      const workflow = serializeWorkflow(
        [],
        [],
        'my-workflow',
        undefined,
        undefined,
        undefined,
        undefined,
        []
      );

      expect('tour' in workflow).toBe(false);
    });

    it('passes conversationHistory and subAgentFlows straight through', () => {
      const conversationHistory = {
        workflowId: 'wf-1',
        messages: [],
        createdAt: '2026-07-25T00:00:00.000Z',
        updatedAt: '2026-07-25T00:00:00.000Z',
      } as unknown as NonNullable<Workflow['conversationHistory']>;
      const subAgentFlows = [
        { id: 'flow-1', name: 'Reviewer', nodes: [], connections: [] },
      ] as NonNullable<Workflow['subAgentFlows']>;

      const workflow = serializeWorkflow(
        [],
        [],
        'my-workflow',
        'a description',
        conversationHistory,
        subAgentFlows
      );

      expect(workflow.description).toBe('a description');
      expect(workflow.conversationHistory).toBe(conversationHistory);
      expect(workflow.subAgentFlows).toBe(subAgentFlows);
    });

    it('leaves conversationHistory and subAgentFlows undefined when not supplied', () => {
      const workflow = serializeWorkflow([], [], 'my-workflow');

      expect(workflow.conversationHistory).toBeUndefined();
      expect(workflow.subAgentFlows).toBeUndefined();
      expect(workflow.description).toBeUndefined();
    });
  });

  describe('generated metadata', () => {
    // Observed behavior, deliberately not asserted as preservation: a save
    // mints a fresh id and resets createdAt. Nothing in the product reads
    // either field back, so this is recorded rather than reported as a bug —
    // see docs/qa-log.md.
    it('mints a fresh id and timestamps on every save', () => {
      const workflow = serializeWorkflow([], [], 'my-workflow');

      expect(workflow.id).toBe(`workflow-${Date.parse('2026-07-25T12:00:00.000Z')}`);
      expect(workflow.createdAt).toEqual(new Date('2026-07-25T12:00:00.000Z'));
      expect(workflow.updatedAt).toEqual(new Date('2026-07-25T12:00:00.000Z'));
      expect(workflow.version).toBe('1.0.0');
      expect(workflow.name).toBe('my-workflow');
    });

    it('does not carry the loaded workflow id or createdAt through a save', () => {
      const loaded = fileWorkflow([fileNode('n-1', NodeType.Prompt, { prompt: 'x' })]);
      const { nodes, edges } = deserializeWorkflow(loaded);

      const saved = serializeWorkflow(nodes, edges, loaded.name);

      expect(saved.id).not.toBe(loaded.id);
      expect(saved.createdAt).not.toEqual(loaded.createdAt);
    });
  });
});

// ===========================================================================
// C. Round-trip
// ===========================================================================

describe('serialize → deserialize round-trip', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-25T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  /**
   * One canvas with everything a save has to carry: a group with two children,
   * an askUserQuestion with labelled option edges, and an ifElse. Options and
   * branches carry ids so the load-time backfill is a no-op and the arrays can
   * be compared whole — any dropped field fails the comparison.
   *
   * Declared group-first, which is the order deserialize produces, so the two
   * sides are directly comparable.
   */
  function canvasFixture(): { nodes: Node[]; edges: Edge[] } {
    const nodes: Node[] = [
      {
        id: 'group-1',
        type: 'group',
        position: { x: 0, y: 0 },
        data: { label: 'Review stage' },
        style: { width: 400, height: 260 },
      },
      {
        id: 'ask-1',
        type: 'askUserQuestion',
        position: { x: 20, y: 40 },
        parentId: 'group-1',
        data: {
          name: 'Ask the reviewer',
          questionText: 'Ship it?',
          options: [
            { id: 'o1', label: 'Yes', description: 'ship now' },
            { id: 'o2', label: 'No', description: 'hold' },
          ],
          outputPorts: 2,
        },
      },
      {
        id: 'if-1',
        type: 'ifElse',
        position: { x: 240, y: 40 },
        parentId: 'group-1',
        data: {
          evaluationTarget: 'the review outcome',
          branches: [
            { id: 'b1', label: 'True', condition: 'approved' },
            { id: 'b2', label: 'False', condition: 'rejected' },
          ],
          outputPorts: 2,
        },
      },
      {
        id: 'end-1',
        type: 'end',
        position: { x: 500, y: 40 },
        data: { label: 'Done' },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'ask-1',
        target: 'if-1',
        sourceHandle: 'output',
        targetHandle: 'input',
        data: { condition: 'Yes' },
      },
      {
        id: 'e2',
        source: 'ask-1',
        target: 'end-1',
        sourceHandle: 'output-2',
        targetHandle: 'input',
        data: { condition: 'No' },
      },
      {
        id: 'e3',
        source: 'if-1',
        target: 'end-1',
        sourceHandle: 'output',
        targetHandle: 'input',
      },
    ];

    return { nodes, edges };
  }

  it('returns the canvas unchanged — nodes and edges whole, not field by field', () => {
    const { nodes, edges } = canvasFixture();

    const roundTripped = deserializeWorkflow(serializeWorkflow(nodes, edges, 'my-workflow'));

    expect(roundTripped.nodes).toEqual(nodes);
    expect(roundTripped.edges).toEqual(edges);
  });

  it('keeps the group ahead of its children after a round-trip', () => {
    const { nodes, edges } = canvasFixture();

    const roundTripped = deserializeWorkflow(serializeWorkflow(nodes, edges, 'my-workflow'));

    expect(indexOfNode(roundTripped.nodes, 'group-1')).toBeLessThan(
      indexOfNode(roundTripped.nodes, 'ask-1')
    );
    expect(indexOfNode(roundTripped.nodes, 'group-1')).toBeLessThan(
      indexOfNode(roundTripped.nodes, 'if-1')
    );
  });

  it('survives a second round-trip unchanged', () => {
    const { nodes, edges } = canvasFixture();

    const once = deserializeWorkflow(serializeWorkflow(nodes, edges, 'my-workflow'));
    const twice = deserializeWorkflow(serializeWorkflow(once.nodes, once.edges, 'my-workflow'));

    expect(twice.nodes).toEqual(nodes);
    expect(twice.edges).toEqual(edges);
  });
});

// ===========================================================================
// D. Probing case — nested groups
// ===========================================================================

describe('nested groups', () => {
  // SKIPPED: fails against the current comparator — see issue #1015.
  //
  // The sort in deserializeWorkflow is correct for any *pair* of nodes but is
  // not a transitive ordering: two unrelated groups compare equal, so a
  // sort that never compares an outer group against its nested child can
  // leave the child ahead of its parent. React Flow then renders the nested
  // group detached from the group that contains it.
  //
  // The canvas itself never creates nested groups (workflow-store.ts:591 —
  // "Skip if the dragged node is a group node (no nesting)"), so the reachable
  // source is an AI-authored or hand-edited file. That makes it real but
  // lower severity than sections A–C.
  it.skip('orders a nested group after the group that contains it (#1015)', () => {
    const workflow = fileWorkflow([
      fileNode('group-c', NodeType.Group, { label: 'Inner' }, { parentId: 'group-b' }),
      fileNode('group-a', NodeType.Group, { label: 'Unrelated' }),
      fileNode('group-b', NodeType.Group, { label: 'Outer' }),
    ]);

    const { nodes } = deserializeWorkflow(workflow);

    expect(indexOfNode(nodes, 'group-b')).toBeLessThan(indexOfNode(nodes, 'group-c'));
  });
});
