import { describe, expect, it } from 'vitest';
import {
  NodeType,
  type SubAgentFlow,
  type Workflow,
  type WorkflowNode,
} from '../types/workflow-definition.js';
import { validateAIGeneratedWorkflow, validateSubAgentFlow } from './validate-workflow.js';

/**
 * Suite S1, item 2 — the validator's *behavior*, not the schema's content.
 *
 * `validateAIGeneratedWorkflow` is the gate every AI-authored workflow passes
 * through before it is written to the user's `workflow.json` (the MCP
 * `apply_workflow` path refuses the write when it fails). Two things about it
 * are load-bearing and invisible to a type check:
 *
 * 1. **A rejection has to name the offending node.** Without that, the agent
 *    is told "something is wrong" about a 40-node workflow and cannot fix it.
 * 2. **A rejection has to be a rejection, not a crash.** Corrupt input must
 *    become a structured error rather than a TypeError out of the validator.
 *
 * These tests deliberately do not restate the zod definitions — which fields
 * exist and which values they permit is the schema's business, and a test
 * read off the schema would pass whether or not the schema is right. What is
 * checked here is what the validator *does* with them.
 */

/**
 * Fixture builders take a deliberately loose shape and cast once, here.
 * Half of these tests exist to prove the validator survives input the
 * TypeScript types forbid — the whole point is to hand it data a compiler
 * would never let through, so the cast belongs in the builder rather than
 * scattered across the call sites.
 */
interface RawNode {
  id: string;
  type: NodeType;
  name?: unknown;
  position?: unknown;
  data?: unknown;
  parentId?: unknown;
}

function node(overrides: RawNode): WorkflowNode {
  return {
    name: overrides.id,
    position: { x: 0, y: 0 },
    data: {},
    ...overrides,
  } as unknown as WorkflowNode;
}

/** A workflow that validates cleanly, so every test below varies one thing. */
function workflow(overrides: Record<string, unknown> = {}): Workflow {
  return {
    id: 'wf-1',
    name: 'test-workflow',
    version: '1.0.0',
    nodes: [node({ id: 'start-1', type: NodeType.Start }), node({ id: 'end-1', type: NodeType.End })],
    connections: [],
    ...overrides,
  } as unknown as Workflow;
}

const subAgent = (id: string, data: Record<string, unknown>) =>
  node({
    id,
    type: NodeType.SubAgent,
    data: {
      description: 'does a thing',
      agentDefinition: 'you are an agent',
      prompt: 'do the thing',
      outputPorts: 1,
      ...data,
    },
  });

/**
 * A SubAgentFlow *reference* node — the node that sits on the canvas and
 * points at a definition held in `workflow.subAgentFlows`.
 */
const subAgentFlowRef = (id: string, data: Record<string, unknown> = {}) =>
  node({
    id,
    type: NodeType.SubAgentFlow,
    data: {
      subAgentFlowId: 'flow-1',
      label: 'Nested flow',
      outputPorts: 1,
      ...data,
    },
  });

/** A SubAgentFlow *definition* that passes every rule, so tests vary one thing. */
function flow(overrides: Record<string, unknown> = {}): SubAgentFlow {
  return {
    id: 'flow-1',
    name: 'nested-flow',
    nodes: [
      node({ id: 'inner-start', type: NodeType.Start }),
      node({ id: 'inner-end', type: NodeType.End }),
    ],
    connections: [],
    ...overrides,
  } as unknown as SubAgentFlow;
}

const codesOf = (result: { errors: { code: string }[] }) => result.errors.map((e) => e.code);

describe('validateAIGeneratedWorkflow — the baseline fixture', () => {
  it('accepts a minimal start → end workflow', () => {
    // If this ever fails, every other assertion in this file is meaningless.
    expect(validateAIGeneratedWorkflow(workflow())).toEqual({ valid: true, errors: [] });
  });
});

describe('validateAIGeneratedWorkflow — errors identify the offending node', () => {
  it('names the node and field when a value is not in the permitted set', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgent('good-agent', { model: 'opus' }),
          subAgent('bad-agent', { model: 'gpt-4' }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    expect(result.valid).toBe(false);
    const violations = result.errors.filter((e) => e.code === 'NODE_SCHEMA_VIOLATION');
    expect(violations).toHaveLength(1);
    expect(violations[0]?.field).toBe('nodes[bad-agent].data.model');
    expect(violations[0]?.message).toContain('model');

    // The node that is fine must not be implicated anywhere.
    expect(JSON.stringify(result.errors)).not.toContain('good-agent');
  });

  it('reports one error per offending node rather than collapsing them', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgent('agent-a', { model: 'nope' }),
          subAgent('agent-b', { model: 'also-nope' }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    const fields = result.errors
      .filter((e) => e.code === 'NODE_SCHEMA_VIOLATION')
      .map((e) => e.field);
    expect(fields).toEqual(['nodes[agent-a].data.model', 'nodes[agent-b].data.model']);
  });

  it('names the connection that references a node which does not exist', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        connections: [{ id: 'c-1', from: 'start-1', to: 'ghost-node' }],
      }),
    );

    const error = result.errors.find((e) => e.code === 'INVALID_CONNECTION');
    expect(error?.field).toBe('connections[c-1].to');
    expect(error?.message).toContain('ghost-node');
  });
});

describe('validateAIGeneratedWorkflow — which fields get checked', () => {
  it('does not report fields the workflow simply omits', () => {
    // Older workflow files predate later-added fields; they must keep
    // loading rather than being rejected wholesale.
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgent('agent-a', {}),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    expect(result.errors.filter((e) => e.code === 'NODE_SCHEMA_VIOLATION')).toEqual([]);
  });

  it('checks a field that the node’s current state actually uses', () => {
    // Manual mode consumes `options`, so its bounds apply: one option is
    // below the minimum a user can pick from.
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          node({
            id: 'ask-1',
            type: NodeType.AskUserQuestion,
            data: {
              questionText: 'Which environment?',
              useAiSuggestions: false,
              options: [{ label: 'staging', description: 'the staging environment' }],
              outputPorts: 1,
            },
          }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    const violation = result.errors.find((e) => e.code === 'NODE_SCHEMA_VIOLATION');
    expect(violation?.field).toBe('nodes[ask-1].data.options');
  });

  it('skips a field that the node’s current state does not use', () => {
    // AI-suggestions mode populates the options at run time, so an empty
    // array is legitimate — the same value that is invalid above.
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          node({
            id: 'ask-1',
            type: NodeType.AskUserQuestion,
            data: {
              questionText: 'Which environment?',
              useAiSuggestions: true,
              options: [],
              outputPorts: 1,
            },
          }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    expect(result.errors).toEqual([]);
  });
});

describe('validateAIGeneratedWorkflow — corrupt input becomes an error, not a crash', () => {
  it.each([
    ['null', null],
    ['a string', 'not a workflow'],
    ['a number', 42],
  ])('reports %s as an invalid type', (_label, input) => {
    const result = validateAIGeneratedWorkflow(input);
    expect(result.valid).toBe(false);
    expect(result.errors[0]?.code).toBe('INVALID_TYPE');
  });

  it.each([
    ['null', null],
    ['an array', []],
    ['a string', 'oops'],
  ])('reports node data that is %s without throwing', (_label, data) => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          node({ id: 'broken', type: NodeType.SubAgent, data }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    const error = result.errors.find((e) => e.code === 'INVALID_NODE_DATA');
    expect(error?.field).toBe('nodes[broken].data');
  });

  it('stops cleanly when the nodes array is missing entirely', () => {
    const result = validateAIGeneratedWorkflow({ id: 'wf-1', name: 'x', version: '1.0.0' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'nodes' && e.code === 'MISSING_FIELD')).toBe(true);
  });
});

describe('validateAIGeneratedWorkflow — boundary values', () => {
  function withNodeCount(count: number): Workflow {
    const filler = Array.from({ length: count - 2 }, (_, i) => subAgent(`agent-${i}`, {}));
    return workflow({
      nodes: [
        node({ id: 'start-1', type: NodeType.Start }),
        ...filler,
        node({ id: 'end-1', type: NodeType.End }),
      ],
    });
  }

  it('accepts exactly the configured node limit', () => {
    const result = validateAIGeneratedWorkflow(withNodeCount(5), { maxNodes: 5 });
    expect(result.errors.filter((e) => e.code === 'MAX_NODES_EXCEEDED')).toEqual([]);
  });

  it('rejects one node past the configured limit and states the limit', () => {
    const result = validateAIGeneratedWorkflow(withNodeCount(6), { maxNodes: 5 });
    const error = result.errors.find((e) => e.code === 'MAX_NODES_EXCEEDED');
    expect(error?.message).toContain('5');
  });

  it('falls back to the built-in limit when none is configured', () => {
    // 101 nodes exceeds VALIDATION_RULES.WORKFLOW.MAX_NODES (100).
    const result = validateAIGeneratedWorkflow(withNodeCount(101));
    expect(result.errors.some((e) => e.code === 'MAX_NODES_EXCEEDED')).toBe(true);
    expect(validateAIGeneratedWorkflow(withNodeCount(100)).valid).toBe(true);
  });
});

describe('validateAIGeneratedWorkflow — workflow-level structure', () => {
  it('requires a start node and an end node', () => {
    const result = validateAIGeneratedWorkflow(workflow({ nodes: [] }));
    const codes = result.errors.map((e) => e.code);
    expect(codes).toContain('MISSING_START_NODE');
    expect(codes).toContain('MISSING_END_NODE');
  });

  it('rejects a second start node', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          node({ id: 'start-2', type: NodeType.Start }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );
    expect(result.errors.map((e) => e.code)).toContain('MULTIPLE_START_NODES');
  });

  it('rejects duplicate node ids', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgent('twin', {}),
          subAgent('twin', {}),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );
    expect(result.errors.map((e) => e.code)).toContain('DUPLICATE_NODE_ID');
  });

  it('rejects a workflow name that is not filename-safe', () => {
    // The name becomes a path component on export, so uppercase and spaces
    // would produce different files on case-sensitive and case-insensitive
    // filesystems.
    const result = validateAIGeneratedWorkflow(workflow({ name: 'My Workflow' }));
    const error = result.errors.find((e) => e.field === 'name');
    expect(error?.code).toBe('INVALID_FORMAT');
  });

  it('rejects a version that is not semantic', () => {
    const result = validateAIGeneratedWorkflow(workflow({ version: 'v1' }));
    expect(result.errors.find((e) => e.field === 'version')?.code).toBe('INVALID_FORMAT');
  });

  it('rejects a node connected to itself', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgent('agent-a', {}),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        connections: [{ id: 'c-1', from: 'agent-a', to: 'agent-a' }],
      }),
    );
    expect(result.errors.find((e) => e.code === 'SELF_CONNECTION')?.field).toBe('connections[c-1]');
  });
});

/**
 * Sub-Agent Flow validation (issue #1050).
 *
 * Three functions guard this feature and none of them was executed by the
 * suite before this block existed: `validateSubAgentFlowReferences` (called
 * unconditionally from the public entry point), `validateSubAgentFlowNode`
 * (dispatched per node) and the exported `validateSubAgentFlow` (called per
 * definition). They are not a transcription of a zod schema — they enforce
 * *cross-node invariants* a schema cannot express: does the referenced flow
 * exist, and does the nested flow have exactly one Start.
 *
 * If the reference check breaks, an agent's `apply_workflow` lands a workflow
 * whose `subAgentFlow` node points at a `subAgentFlowId` with no definition,
 * validation passes, and the user gets a canvas node that opens nothing while
 * every generated artifact — the Mermaid subgraph, the execution
 * instructions, the exported SKILL.md — describes a flow that does not exist.
 *
 * Only `validateSubAgentFlow` is exported; the other two are reached through
 * `validateAIGeneratedWorkflow` on purpose. Exporting them to make testing
 * easier would be a `packages/*​/src` edit.
 *
 * **Deliberate non-assertions.** `VALIDATION_RULES.SUB_AGENT_FLOW`'s
 * `NAME_PATTERN` (`/^[a-z0-9_-]+$/`), `NAME_MAX_LENGTH` and
 * `DESCRIPTION_MAX_LENGTH` are declared and never read by any code path, and
 * the authoring guide's own worked example uses `"name": "Input Validation"`
 * — a space and two capitals — which that pattern rejects. The two
 * representations contradict each other, so asserting either one would pin an
 * arbitrary answer rather than check anything.
 */

describe('validateAIGeneratedWorkflow — the SubAgentFlow reference contract', () => {
  it('accepts a reference node whose flow is defined', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1'),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        subAgentFlows: [flow()],
      }),
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('names the node and the field when the referenced flow does not exist', () => {
    // "An error was produced" is not the contract — "you can find the node
    // from it" is. The agent has to be able to repair the workflow.
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1', { subAgentFlowId: 'flow-does-not-exist' }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        subAgentFlows: [flow()],
      }),
    );

    expect(result.valid).toBe(false);
    const error = result.errors.find((e) => e.code === 'SUBAGENTFLOW_MISSING_DEFINITION');
    expect(error?.field).toBe('nodes[flow-ref-1].data.subAgentFlowId');
    expect(error?.message).toContain('flow-does-not-exist');
  });

  it('reports a dangling reference when the workflow carries no definitions at all', () => {
    // The `|| []` fallback: a missing `subAgentFlows` array must produce the
    // same structured error rather than throwing.
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1'),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    expect(codesOf(result)).toContain('SUBAGENTFLOW_MISSING_DEFINITION');
  });

  it('reports one error per dangling reference rather than collapsing them', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-a', { subAgentFlowId: 'ghost-a' }),
          subAgentFlowRef('flow-ref-b', { subAgentFlowId: 'ghost-b' }),
          node({ id: 'end-1', type: NodeType.End }),
        ],
      }),
    );

    const fields = result.errors
      .filter((e) => e.code === 'SUBAGENTFLOW_MISSING_DEFINITION')
      .map((e) => e.field);
    expect(fields).toEqual([
      'nodes[flow-ref-a].data.subAgentFlowId',
      'nodes[flow-ref-b].data.subAgentFlowId',
    ]);
  });
});

describe('validateAIGeneratedWorkflow — the SubAgentFlow reference node’s own fields', () => {
  const validateRef = (data: Record<string, unknown>) =>
    validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1', data),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        subAgentFlows: [flow()],
      }),
    );

  it.each([
    ['omitted', undefined],
    ['not a string', 42],
  ])('names the node when subAgentFlowId is %s', (_label, subAgentFlowId) => {
    const result = validateRef({ subAgentFlowId });
    const error = result.errors.find((e) => e.code === 'SUBAGENTFLOW_MISSING_REF_ID');
    expect(error?.field).toBe('nodes[flow-ref-1].data.subAgentFlowId');
  });

  it.each([
    ['omitted', undefined],
    ['not a string', 7],
  ])('names the node when label is %s', (_label, label) => {
    const result = validateRef({ label });
    const error = result.errors.find((e) => e.code === 'SUBAGENTFLOW_MISSING_LABEL');
    expect(error?.field).toBe('nodes[flow-ref-1].data.label');
  });

  it('rejects an omitted outputPorts, not just a wrong one', () => {
    // The check is a strict `!==` against 1, so `undefined` fails it. The
    // authoring guide declares outputPorts required with value 1; this case
    // is what keeps the guide and the validator agreeing.
    const result = validateRef({ outputPorts: undefined });
    const error = result.errors.find((e) => e.code === 'SUBAGENTFLOW_INVALID_PORTS');
    expect(error?.field).toBe('nodes[flow-ref-1].data.outputPorts');
  });

  it('rejects more than one output port and accepts exactly one', () => {
    expect(codesOf(validateRef({ outputPorts: 2 }))).toContain('SUBAGENTFLOW_INVALID_PORTS');
    expect(codesOf(validateRef({ outputPorts: 1 }))).not.toContain('SUBAGENTFLOW_INVALID_PORTS');
  });
});

describe('validateSubAgentFlow — the definition', () => {
  it('accepts a definition with one Start and one End', () => {
    expect(validateSubAgentFlow(flow())).toEqual([]);
  });

  it('names the missing required field', () => {
    expect(validateSubAgentFlow(flow({ id: '' }))).toEqual([
      { code: 'SUBAGENTFLOW_MISSING_ID', message: expect.any(String), field: 'id' },
    ]);
    expect(validateSubAgentFlow(flow({ name: '' }))).toEqual([
      { code: 'SUBAGENTFLOW_MISSING_NAME', message: expect.any(String), field: 'name' },
    ]);
  });

  it('stops after reporting a nodes field that is not an array', () => {
    // The early return is the behaviour under test: without it the Start/End
    // filters below would throw on a non-array.
    const errors = validateSubAgentFlow(flow({ nodes: 'not an array' }));
    expect(errors).toHaveLength(1);
    expect(errors[0]?.code).toBe('SUBAGENTFLOW_MISSING_NODES');
    expect(errors[0]?.field).toBe('nodes');
  });

  it.each([
    ['no Start node', [node({ id: 'inner-end', type: NodeType.End })], 'SUBAGENTFLOW_INVALID_START'],
    [
      'two Start nodes',
      [
        node({ id: 'inner-start', type: NodeType.Start }),
        node({ id: 'inner-start-2', type: NodeType.Start }),
        node({ id: 'inner-end', type: NodeType.End }),
      ],
      'SUBAGENTFLOW_MULTIPLE_START',
    ],
    [
      'no End node',
      [node({ id: 'inner-start', type: NodeType.Start })],
      'SUBAGENTFLOW_MISSING_END',
    ],
  ])('rejects a definition with %s and names the flow', (_label, nodes, code) => {
    // These three errors carry no `field`, so the flow name in the message is
    // the only handle the user has on which definition is at fault.
    const errors = validateSubAgentFlow(flow({ name: 'payment-check', nodes }));
    const error = errors.find((e) => e.code === code);
    expect(error?.message).toContain('payment-check');
  });

  it.each([
    ['a SubAgent node', NodeType.SubAgent, 'SUBAGENTFLOW_CONTAINS_SUBAGENT'],
    ['a nested SubAgentFlow node', NodeType.SubAgentFlow, 'SUBAGENTFLOW_NESTED_REF'],
  ])('rejects %s inside the flow', (_label, type, code) => {
    const errors = validateSubAgentFlow(
      flow({
        nodes: [
          node({ id: 'inner-start', type: NodeType.Start }),
          node({ id: 'inner-illegal', type }),
          node({ id: 'inner-end', type: NodeType.End }),
        ],
      }),
    );
    expect(errors.map((e) => e.code)).toContain(code);
  });

  it('reports every broken rule, not just the first', () => {
    const errors = validateSubAgentFlow(
      flow({
        id: '',
        nodes: [node({ id: 'inner-agent', type: NodeType.SubAgent })],
      }),
    );

    expect(errors.map((e) => e.code).sort()).toEqual(
      [
        'SUBAGENTFLOW_CONTAINS_SUBAGENT',
        'SUBAGENTFLOW_INVALID_START',
        'SUBAGENTFLOW_MISSING_END',
        'SUBAGENTFLOW_MISSING_ID',
      ].sort(),
    );
  });

  it('surfaces definition errors through the public entry point', () => {
    // The leaf function passing is not enough — the wiring from
    // validateAIGeneratedWorkflow down to each definition has to hold too.
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1'),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        subAgentFlows: [flow({ nodes: [node({ id: 'inner-end', type: NodeType.End })] })],
      }),
    );

    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain('SUBAGENTFLOW_INVALID_START');
  });
});

/**
 * `CURRENT BEHAVIOUR` pins — divergences between the two hand-maintained
 * statements of the sub-agent-flow rules.
 *
 * The AI-authoring guide (`resources/workflow-schema.json`) tells agents six
 * MUST-rules; the validator enforces three of them. These cases pin what the
 * validator does *today*, so they pass now and go red the moment the feature
 * loop closes a gap — which is the signal we want. They are deliberately not
 * skipped: a skipped test says nothing when the behaviour changes.
 *
 * Filed as bug #1051 for the feature track. Which side is wrong is a
 * product decision — whether `branchSession` really should be prohibited, or
 * whether the guide over-promises — so these cases state the divergence and
 * stop there.
 */
describe('validateSubAgentFlow — rules the authoring guide states but the validator does not enforce', () => {
  const flowContaining = (type: NodeType) =>
    flow({
      nodes: [
        node({ id: 'inner-start', type: NodeType.Start }),
        node({ id: 'inner-extra', type }),
        node({ id: 'inner-end', type: NodeType.End }),
      ],
    });

  it('CURRENT BEHAVIOUR (bug #1051): accepts an askUserQuestion node inside a flow', () => {
    // `workflow-schema.json:895` prohibits it, and the frozen chat-UI path
    // does enforce it (`refinement-service.ts:977` carries askUserQuestion in
    // SUBAGENTFLOW_PROHIBITED_NODE_TYPES). The live MCP path does not.
    expect(validateSubAgentFlow(flowContaining(NodeType.AskUserQuestion))).toEqual([]);
  });

  it('CURRENT BEHAVIOUR (bug #1051): accepts a branchSession node inside a flow', () => {
    expect(validateSubAgentFlow(flowContaining(NodeType.BranchSession))).toEqual([]);
  });

  it('CURRENT BEHAVIOUR (bug #1051): accepts a flow of 101 nodes', () => {
    // `workflow-schema.json:893` states a 100-node cap and
    // VALIDATION_RULES.SUB_AGENT_FLOW.MAX_NODES declares it, but nothing
    // reads that constant — OUTPUT_PORTS is the only member of the block any
    // code path consumes.
    const filler = Array.from({ length: 99 }, (_, i) =>
      node({ id: `inner-${i}`, type: NodeType.Prompt }),
    );
    const oversized = flow({
      nodes: [
        node({ id: 'inner-start', type: NodeType.Start }),
        ...filler,
        node({ id: 'inner-end', type: NodeType.End }),
      ],
    });

    expect(oversized.nodes).toHaveLength(101);
    expect(validateSubAgentFlow(oversized)).toEqual([]);
  });

  it('CURRENT BEHAVIOUR (bug #1051): accepts two definitions sharing one id', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1'),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        // The reference check builds a Set of ids, which collapses the pair;
        // nothing reports the collision, so which definition the reference
        // resolves to is left to whoever reads the array.
        subAgentFlows: [flow(), flow({ name: 'different-flow' })],
      }),
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('CURRENT BEHAVIOUR (bug #1051): accepts a definition nothing references', () => {
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1'),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        subAgentFlows: [flow(), flow({ id: 'flow-orphan', name: 'orphan-flow' })],
      }),
    );

    expect(result).toEqual({ valid: true, errors: [] });
  });
});

describe('validateAIGeneratedWorkflow — definitions go unchecked when nothing references them', () => {
  const brokenDefinition = flow({ nodes: [node({ id: 'inner-end', type: NodeType.End })] });

  it('CURRENT BEHAVIOUR (bug #1051): a malformed definition passes while no node points at it', () => {
    // The early return short-circuits before any definition is inspected.
    const result = validateAIGeneratedWorkflow(workflow({ subAgentFlows: [brokenDefinition] }));
    expect(result).toEqual({ valid: true, errors: [] });
  });

  it('rejects the same definition once a node points at it', () => {
    // The other half of the pair: the early return cannot be removed, nor the
    // definition loop dropped, without one of these two failing by name.
    const result = validateAIGeneratedWorkflow(
      workflow({
        nodes: [
          node({ id: 'start-1', type: NodeType.Start }),
          subAgentFlowRef('flow-ref-1'),
          node({ id: 'end-1', type: NodeType.End }),
        ],
        subAgentFlows: [brokenDefinition],
      }),
    );

    expect(result.valid).toBe(false);
    expect(codesOf(result)).toContain('SUBAGENTFLOW_INVALID_START');
  });
});
