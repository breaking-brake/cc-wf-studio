/**
 * Workflow fixtures shared by the S5 write-path suites.
 *
 * Hand-built rather than loaded from a sample file, for the same reason the
 * S2 fixtures in `packages/core` are: the write path branches on node shape,
 * and a fixture on disk drifts away from the cases the tests actually name.
 *
 * Two constraints these builders exist to satisfy, both learned from the
 * validator rather than assumed:
 *   - `VALIDATION_RULES.WORKFLOW.NAME_PATTERN` rejects spaces and capitals,
 *     so the workflow name is `sample-workflow`, not `Sample Workflow`;
 *   - `parentId` must point at a node of type `Group`, so `groupNode()` is
 *     provided for the un-grouping cases.
 *
 * `createdAt` / `updatedAt` are a fixed epoch so serialized content — and
 * therefore the sha256 revision computed from it — is stable across runs.
 */

import { type Connection, NodeType, type Workflow, type WorkflowNode } from '@cc-wf-studio/core';

const FIXED_EPOCH = new Date(0).toISOString();
const position = { x: 0, y: 0 };

/** Assemble a Workflow around a set of nodes and connections. */
export function makeWorkflow(
  nodes: WorkflowNode[],
  connections: Connection[] = [],
  overrides: Partial<Workflow> = {}
): Workflow {
  return {
    id: 'workflow-1',
    name: 'sample-workflow',
    version: '1.0.0',
    nodes,
    connections,
    createdAt: FIXED_EPOCH,
    updatedAt: FIXED_EPOCH,
    ...overrides,
  } as Workflow;
}

export function connect(from: string, to: string, fromPort = 'output'): Connection {
  return { id: `${from}->${to}:${fromPort}`, from, to, fromPort, toPort: 'input' };
}

export function startNode(id = 'start-1'): WorkflowNode {
  return { id, type: NodeType.Start, name: 'Start', position, data: {} } as WorkflowNode;
}

export function endNode(id = 'end-1'): WorkflowNode {
  return { id, type: NodeType.End, name: 'End', position, data: {} } as WorkflowNode;
}

export function promptNode(
  id: string,
  prompt = 'Summarize the findings',
  extra: Record<string, unknown> = {},
  name = 'Prompt-Step'
): WorkflowNode {
  return {
    id,
    type: NodeType.Prompt,
    name,
    position,
    data: { prompt, outputPorts: 1, ...extra },
  } as WorkflowNode;
}

export function subAgentNode(
  id: string,
  name = 'Code-Reviewer',
  extra: Record<string, unknown> = {}
): WorkflowNode {
  return {
    id,
    type: NodeType.SubAgent,
    name,
    position,
    data: {
      description: `${name} description`,
      agentDefinition: `${name} definition`,
      prompt: `Do the ${name} work`,
      outputPorts: 1,
      ...extra,
    },
  } as WorkflowNode;
}

export function groupNode(id: string, label = 'Review Phase'): WorkflowNode {
  return {
    id,
    type: NodeType.Group,
    name: 'Group',
    position,
    data: { label },
  } as WorkflowNode;
}

/**
 * The default valid workflow: start → prompt → end.
 *
 * Passes `validateAIGeneratedWorkflow`, so a test that gets `Validation
 * failed` back from a write tool is looking at a real defect rather than a
 * malformed fixture.
 */
export function validWorkflow(overrides: Partial<Workflow> = {}): Workflow {
  return makeWorkflow(
    [startNode(), promptNode('prompt-1'), endNode()],
    [connect('start-1', 'prompt-1'), connect('prompt-1', 'end-1')],
    overrides
  );
}

/** Serialize exactly as `FileWorkflowAdapter.applyWorkflow` does (trailing newline included). */
export function serialize(workflow: Workflow): string {
  return `${JSON.stringify(workflow, null, 2)}\n`;
}
