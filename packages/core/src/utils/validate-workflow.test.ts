import { describe, expect, it } from 'vitest';
import { NodeType, type Workflow, type WorkflowNode } from '../types/workflow-definition.js';
import { validateAIGeneratedWorkflow } from './validate-workflow.js';

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
