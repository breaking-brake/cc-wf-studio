/**
 * Workflow fixtures shared by the S2 generator suites.
 *
 * Deliberately hand-built rather than loaded from a sample file: the
 * generators branch on node type, and a fixture on disk drifts away from the
 * cases the tests actually name. Everything here is a plain builder so each
 * test can state exactly the workflow shape it is talking about.
 *
 * `createdAt` / `updatedAt` are a fixed epoch so generated output is stable
 * across runs (the determinism bar in `docs/quality/03-assurance-map.md`).
 */

import {
  type AskUserQuestionNode,
  type BranchSessionNode,
  type CodexNode,
  type Connection,
  type GroupNode,
  type IfElseNode,
  type McpNode,
  NodeType,
  type PromptNode,
  type SkillNode,
  type SubAgentFlow,
  type SubAgentFlowNode,
  type SubAgentNode,
  type SwitchNode,
  type Workflow,
  type WorkflowNode,
} from '../../../types/workflow-definition.js';

const FIXED_EPOCH = new Date(0);

/** Assemble a Workflow around a set of nodes and connections. */
export function makeWorkflow(
  nodes: WorkflowNode[],
  connections: Connection[] = [],
  overrides: Partial<Workflow> = {}
): Workflow {
  return {
    id: 'workflow-1',
    name: 'Sample Workflow',
    version: '1.0.0',
    nodes,
    connections,
    createdAt: FIXED_EPOCH,
    updatedAt: FIXED_EPOCH,
    ...overrides,
  };
}

/** Connect two nodes. `fromPort` defaults to a non-branch port. */
export function connect(from: string, to: string, fromPort = 'output'): Connection {
  return { id: `${from}->${to}:${fromPort}`, from, to, fromPort, toPort: 'input' };
}

const position = { x: 0, y: 0 };

export function startNode(id = 'start-node', label?: string): WorkflowNode {
  return { id, type: NodeType.Start, name: 'Start', position, data: label ? { label } : {} };
}

export function endNode(id = 'end-node', label?: string): WorkflowNode {
  return { id, type: NodeType.End, name: 'End', position, data: label ? { label } : {} };
}

export function promptNode(
  id: string,
  prompt: string,
  extra: Partial<PromptNode['data']> = {},
  name = 'Prompt Step'
): PromptNode {
  return { id, type: NodeType.Prompt, name, position, data: { prompt, ...extra } };
}

export function subAgentNode(
  id: string,
  name: string,
  extra: Partial<SubAgentNode['data']> = {}
): SubAgentNode {
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
  };
}

export function askUserQuestionNode(
  id: string,
  extra: Partial<AskUserQuestionNode['data']> = {}
): AskUserQuestionNode {
  return {
    id,
    type: NodeType.AskUserQuestion,
    name: 'Ask',
    position,
    data: {
      questionText: 'Which environment?',
      options: [
        { label: 'Staging', description: 'Deploy to staging' },
        { label: 'Production', description: 'Deploy to production' },
      ],
      outputPorts: 2,
      ...extra,
    },
  };
}

export function ifElseNode(id: string, extra: Partial<IfElseNode['data']> = {}): IfElseNode {
  return {
    id,
    type: NodeType.IfElse,
    name: 'Check',
    position,
    data: {
      branches: [
        { label: 'True', condition: 'the check passed' },
        { label: 'False', condition: 'the check failed' },
      ],
      outputPorts: 2,
      ...extra,
    },
  };
}

export function switchNode(id: string, extra: Partial<SwitchNode['data']> = {}): SwitchNode {
  return {
    id,
    type: NodeType.Switch,
    name: 'Route',
    position,
    data: {
      branches: [
        { label: 'Small', condition: 'under 10 files' },
        { label: 'Large', condition: '10 files or more' },
      ],
      outputPorts: 2,
      ...extra,
    },
  };
}

export function skillNode(id: string, extra: Partial<SkillNode['data']> = {}): SkillNode {
  return {
    id,
    type: NodeType.Skill,
    name: 'Skill Step',
    position,
    data: {
      name: 'code-review',
      description: 'Review the code',
      skillPath: '.claude/skills/code-review/SKILL.md',
      scope: 'project',
      validationStatus: 'valid',
      outputPorts: 1,
      ...extra,
    },
  };
}

export function mcpNode(id: string, extra: Partial<McpNode['data']> = {}): McpNode {
  return {
    id,
    type: NodeType.Mcp,
    name: 'MCP Step',
    position,
    data: {
      serverId: 'weather',
      toolName: 'get_forecast',
      validationStatus: 'valid',
      outputPorts: 1,
      ...extra,
    },
  };
}

export function codexNode(id: string, extra: Partial<CodexNode['data']> = {}): CodexNode {
  return {
    id,
    type: NodeType.Codex,
    name: 'Codex Step',
    position,
    data: {
      label: 'Refactor',
      promptMode: 'fixed',
      prompt: 'Refactor the module',
      model: 'gpt-5-codex',
      reasoningEffort: 'medium',
      outputPorts: 1,
      ...extra,
    },
  };
}

export function branchSessionNode(
  id: string,
  extra: Partial<BranchSessionNode['data']> = {}
): BranchSessionNode {
  return {
    id,
    type: NodeType.BranchSession,
    name: 'Checkpoint',
    position,
    data: {
      label: 'Review together',
      outputPorts: 1,
      ...extra,
    },
  };
}

/**
 * A `SubAgentFlow` definition with a runnable three-node body.
 *
 * The body is deliberately distinguishable from anything `makeWorkflow`
 * produces, so a test can tell whose nodes reached the generator.
 */
export function makeSubAgentFlow(overrides: Partial<SubAgentFlow> = {}): SubAgentFlow {
  return {
    id: 'flow-1',
    name: 'Input Validation',
    nodes: [
      startNode('flow-start'),
      promptNode('flow-step', 'Validate the input', {}, 'Validate'),
      endNode('flow-end'),
    ],
    connections: [connect('flow-start', 'flow-step'), connect('flow-step', 'flow-end')],
    ...overrides,
  };
}

/** The main-workflow node that references a {@link makeSubAgentFlow} definition. */
export function subAgentFlowNode(
  id: string,
  extra: Partial<SubAgentFlowNode['data']> = {},
  name = 'Run Validation'
): SubAgentFlowNode {
  return {
    id,
    type: NodeType.SubAgentFlow,
    name,
    position,
    data: { subAgentFlowId: 'flow-1', label: name, outputPorts: 1, ...extra },
  };
}

export function groupNode(id: string, label: string): GroupNode {
  return { id, type: NodeType.Group, name: label, position, data: { label } };
}

/** Place an existing node inside a group. */
export function inGroup<T extends WorkflowNode>(node: T, groupId: string): T {
  return { ...node, parentId: groupId };
}
