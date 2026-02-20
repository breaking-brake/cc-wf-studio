import type { Workflow } from '@shared/types/messages';
import type { Edge, Node } from 'reactflow';

export interface WorkflowDiffSummary {
  nameChange: { from: string; to: string } | null;
  addedNodes: { id: string; name: string; type: string }[];
  removedNodes: { id: string; name: string; type: string }[];
  modifiedNodes: { id: string; name: string; type: string }[];
  addedConnections: number;
  removedConnections: number;
  totalChanges: number;
  isNewWorkflow: boolean;
}

function getNodeName(node: Node): string {
  return (node.data as { description?: string })?.description || node.id;
}

function makeEdgeKey(edge: Edge): string {
  return `${edge.source}:${edge.sourceHandle ?? ''}→${edge.target}:${edge.targetHandle ?? ''}`;
}

function makeWorkflowEdgeKey(conn: {
  from: string;
  to: string;
  fromPort: string;
  toPort: string;
}): string {
  return `${conn.from}:${conn.fromPort}→${conn.to}:${conn.toPort}`;
}

export function computeWorkflowDiff(
  currentNodes: Node[],
  currentEdges: Edge[],
  currentName: string,
  incomingWorkflow: Workflow
): WorkflowDiffSummary {
  const isNewWorkflow =
    currentNodes.length <= 2 &&
    currentNodes.every((n) => n.type === 'start' || n.type === 'end') &&
    currentEdges.length === 0;

  // Name change
  const nameChange =
    currentName !== incomingWorkflow.name ? { from: currentName, to: incomingWorkflow.name } : null;

  // Build node maps by ID
  const currentNodeMap = new Map<string, Node>();
  for (const node of currentNodes) {
    currentNodeMap.set(node.id, node);
  }

  const incomingNodeMap = new Map<
    string,
    { id: string; type: string; name: string; data: string }
  >();
  for (const node of incomingWorkflow.nodes) {
    incomingNodeMap.set(node.id, {
      id: node.id,
      type: node.type,
      name: (node as { data?: { description?: string } }).data?.description || node.id,
      data: JSON.stringify(node.data),
    });
  }

  // Added nodes: in incoming but not in current
  const addedNodes: WorkflowDiffSummary['addedNodes'] = [];
  for (const [id, node] of incomingNodeMap) {
    if (!currentNodeMap.has(id)) {
      addedNodes.push({ id, name: node.name, type: node.type });
    }
  }

  // Removed nodes: in current but not in incoming
  const removedNodes: WorkflowDiffSummary['removedNodes'] = [];
  for (const [id, node] of currentNodeMap) {
    if (!incomingNodeMap.has(id)) {
      removedNodes.push({ id, name: getNodeName(node), type: node.type || 'unknown' });
    }
  }

  // Modified nodes: in both but data changed
  const modifiedNodes: WorkflowDiffSummary['modifiedNodes'] = [];
  for (const [id, incomingNode] of incomingNodeMap) {
    const currentNode = currentNodeMap.get(id);
    if (currentNode) {
      const currentData = JSON.stringify(currentNode.data);
      if (currentData !== incomingNode.data) {
        modifiedNodes.push({ id, name: incomingNode.name, type: incomingNode.type });
      }
    }
  }

  // Edge comparison
  const currentEdgeKeys = new Set(currentEdges.map(makeEdgeKey));
  const incomingEdgeKeys = new Set(incomingWorkflow.connections.map(makeWorkflowEdgeKey));

  let addedConnections = 0;
  for (const key of incomingEdgeKeys) {
    if (!currentEdgeKeys.has(key)) {
      addedConnections++;
    }
  }

  let removedConnections = 0;
  for (const key of currentEdgeKeys) {
    if (!incomingEdgeKeys.has(key)) {
      removedConnections++;
    }
  }

  const totalChanges =
    (nameChange ? 1 : 0) +
    addedNodes.length +
    removedNodes.length +
    modifiedNodes.length +
    addedConnections +
    removedConnections;

  return {
    nameChange,
    addedNodes,
    removedNodes,
    modifiedNodes,
    addedConnections,
    removedConnections,
    totalChanges,
    isNewWorkflow,
  };
}
