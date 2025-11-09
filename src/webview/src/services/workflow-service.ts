/**
 * Claude Code Workflow Studio - Workflow Service
 *
 * Handles workflow serialization, deserialization, and validation
 * Based on: /specs/001-cc-wf-studio/data-model.md
 */

import type { Connection, Workflow, WorkflowNode } from '@shared/types/workflow-definition';
import type { Edge, Node } from 'reactflow';

/**
 * Convert React Flow state to Workflow definition
 *
 * @param nodes - React Flow nodes
 * @param edges - React Flow edges
 * @param workflowName - Workflow name
 * @param workflowDescription - Workflow description
 * @returns Workflow definition
 */
export function serializeWorkflow(
  nodes: Node[],
  edges: Edge[],
  workflowName: string,
  workflowDescription?: string
): Workflow {
  // Convert React Flow nodes to WorkflowNodes
  const workflowNodes: WorkflowNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.type as 'subAgent' | 'askUserQuestion',
    name: node.data.name || node.id,
    position: node.position,
    data: node.data,
  })) as WorkflowNode[];

  // Convert React Flow edges to Connections
  const connections: Connection[] = edges.map((edge) => ({
    id: edge.id,
    from: edge.source,
    to: edge.target,
    fromPort: edge.sourceHandle || 'output',
    toPort: edge.targetHandle || 'input',
    condition: edge.data?.condition,
  }));

  // Create workflow object
  const workflow: Workflow = {
    id: `workflow-${Date.now()}`,
    name: workflowName,
    description: workflowDescription,
    version: '0.5.0',
    nodes: workflowNodes,
    connections,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  return workflow;
}

/**
 * Convert Workflow definition to React Flow state
 *
 * @param workflow - Workflow definition
 * @returns React Flow nodes and edges
 */
export function deserializeWorkflow(workflow: Workflow): {
  nodes: Node[];
  edges: Edge[];
} {
  // Convert WorkflowNodes to React Flow nodes
  const nodes: Node[] = workflow.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    position: node.position,
    data: node.data,
  }));

  // Convert Connections to React Flow edges
  const edges: Edge[] = workflow.connections.map((connection) => ({
    id: connection.id,
    source: connection.from,
    target: connection.to,
    sourceHandle: connection.fromPort,
    targetHandle: connection.toPort,
    data: connection.condition ? { condition: connection.condition } : undefined,
  }));

  return { nodes, edges };
}

/**
 * Validate workflow definition
 *
 * @param workflow - Workflow to validate
 * @throws Error if validation fails
 */
export function validateWorkflow(workflow: Workflow): void {
  // Check required fields
  if (!workflow.id) {
    throw new Error('Workflow ID is required');
  }

  if (!workflow.name) {
    throw new Error('Workflow name is required');
  }

  // Validate name format (alphanumeric, hyphen, underscore only)
  const namePattern = /^[a-zA-Z0-9_-]+$/;
  if (!namePattern.test(workflow.name)) {
    throw new Error(
      'Workflow name must contain only alphanumeric characters, hyphens, and underscores'
    );
  }

  // Check name length (1-100 characters)
  if (workflow.name.length < 1 || workflow.name.length > 100) {
    throw new Error('Workflow name must be between 1 and 100 characters');
  }

  // Validate version format (semantic versioning)
  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (!workflow.version || !versionPattern.test(workflow.version)) {
    throw new Error('Workflow version must follow semantic versioning (e.g., 1.0.0)');
  }

  // Check max nodes (50)
  if (workflow.nodes.length > 50) {
    throw new Error('Workflow cannot have more than 50 nodes');
  }

  // Validate nodes
  for (const node of workflow.nodes) {
    validateNode(node);
  }

  // Validate connections
  for (const connection of workflow.connections) {
    validateConnection(connection, workflow.nodes);
  }

  // Validate Start/End nodes
  const startNodes = workflow.nodes.filter((n) => n.type === 'start');
  const endNodes = workflow.nodes.filter((n) => n.type === 'end');

  if (startNodes.length === 0) {
    throw new Error('Workflow must have at least one Start node');
  }

  if (startNodes.length > 1) {
    throw new Error('Workflow must have exactly one Start node');
  }

  if (endNodes.length === 0) {
    throw new Error('Workflow must have at least one End node');
  }
}

/**
 * Validate a single node
 *
 * @param node - Node to validate
 * @throws Error if validation fails
 */
function validateNode(node: WorkflowNode): void {
  // Check required fields
  if (!node.id) {
    throw new Error('Node ID is required');
  }

  if (!node.name) {
    throw new Error('Node name is required');
  }

  // Validate name
  const namePattern = /^[a-zA-Z0-9_-]+$/;
  if (!namePattern.test(node.name)) {
    throw new Error(
      `Node "${node.id}" name must contain only alphanumeric characters, hyphens, and underscores`
    );
  }

  if (node.name.length < 1 || node.name.length > 50) {
    throw new Error(`Node "${node.id}" name must be between 1 and 50 characters`);
  }

  // Type-specific validation
  if (node.type === 'subAgent') {
    const data = node.data;

    if (!data.description || data.description.length < 1) {
      throw new Error(`Node "${node.id}" description is required`);
    }

    if (!data.prompt || data.prompt.length < 1) {
      throw new Error(`Node "${node.id}" prompt is required`);
    }

    if (data.prompt.length > 10000) {
      throw new Error(`Node "${node.id}" prompt must be 10000 characters or less`);
    }
  } else if (node.type === 'askUserQuestion') {
    const data = node.data;

    if (!data.questionText || data.questionText.length < 1) {
      throw new Error(`Node "${node.id}" question text is required`);
    }

    // Skip options validation if AI suggestions mode is enabled
    if (!data.useAiSuggestions) {
      if (!data.options || data.options.length < 2 || data.options.length > 4) {
        throw new Error(`Node "${node.id}" must have 2-4 options`);
      }

      for (const option of data.options) {
        if (!option.label || option.label.length < 1 || option.label.length > 50) {
          throw new Error(`Node "${node.id}" option label must be 1-50 characters`);
        }

        if (
          !option.description ||
          option.description.length < 1 ||
          option.description.length > 200
        ) {
          throw new Error(`Node "${node.id}" option description must be 1-200 characters`);
        }
      }
    }
  }
}

/**
 * Validate a connection
 *
 * @param connection - Connection to validate
 * @param nodes - All nodes in the workflow
 * @throws Error if validation fails
 */
function validateConnection(connection: Connection, nodes: WorkflowNode[]): void {
  // Check that source and target nodes exist
  const sourceNode = nodes.find((n) => n.id === connection.from);
  if (!sourceNode) {
    throw new Error(
      `Connection "${connection.id}" references non-existent source node "${connection.from}"`
    );
  }

  const targetNode = nodes.find((n) => n.id === connection.to);
  if (!targetNode) {
    throw new Error(
      `Connection "${connection.id}" references non-existent target node "${connection.to}"`
    );
  }

  // Validate condition for AskUserQuestion nodes
  if (sourceNode.type === 'askUserQuestion' && connection.condition) {
    const validLabels = sourceNode.data.options.map((opt: { label: string }) => opt.label);
    if (!validLabels.includes(connection.condition)) {
      throw new Error(
        `Connection "${connection.id}" condition "${connection.condition}" does not match any option in source node`
      );
    }
  }
}
