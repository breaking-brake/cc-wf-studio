/**
 * Canvas navigation helpers
 *
 * Selecting a node and centering the viewport on it, shared by the node
 * search panel and the workflow problems panel. Selection state is excluded
 * from undo history and canvas-revision tracking (see workflow-store
 * partialize), so navigating never dirties the workflow.
 */

import type { Node, ReactFlowInstance } from 'reactflow';
import { useWorkflowStore } from '../stores/workflow-store';

/** Mirror of the node headers' display-name resolution, in priority order */
export function nodeDisplayName(node: Node): string {
  const data = (node.data ?? {}) as Record<string, unknown>;
  const str = (value: unknown): string | null =>
    typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
  return (
    str(data.label) ??
    str(data.name) ??
    str(data.questionText) ??
    str(data.toolName) ??
    str(data.description) ??
    node.type ??
    node.id
  );
}

/** Select the node on the canvas and center the viewport on it */
export function jumpToNode(reactFlow: ReactFlowInstance, nodeId: string): void {
  const { nodes: currentNodes, setNodes, syncSelectedNodeId } = useWorkflowStore.getState();
  setNodes(currentNodes.map((n) => ({ ...n, selected: n.id === nodeId })));
  syncSelectedNodeId(nodeId);
  // getNode returns the internal node: positionAbsolute resolves group
  // children, width/height are the measured dimensions
  const internal = reactFlow.getNode(nodeId);
  if (!internal) return;
  const x = (internal.positionAbsolute?.x ?? internal.position.x) + (internal.width ?? 200) / 2;
  const y = (internal.positionAbsolute?.y ?? internal.position.y) + (internal.height ?? 80) / 2;
  reactFlow.setCenter(x, y, { zoom: Math.max(reactFlow.getZoom(), 0.8), duration: 300 });
}
