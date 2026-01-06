/**
 * Auto-focus hook for newly added nodes
 *
 * Watches for new node additions and automatically pans
 * the canvas to center on the new node.
 */

import { useEffect } from 'react';
import { useReactFlow } from 'reactflow';
import { useWorkflowStore } from '../stores/workflow-store';

// Constants for node dimensions (approximate center offset)
const NODE_WIDTH_HALF = 100;
const NODE_HEIGHT_HALF = 40;
const ANIMATION_DURATION = 300;

/**
 * Custom hook that automatically focuses (pans) the canvas
 * to a newly added node.
 *
 * Uses React Flow's setCenter() method to pan while preserving
 * the current zoom level.
 */
export function useAutoFocusNode(): void {
  const { setCenter, getZoom } = useReactFlow();
  const lastAddedNodeId = useWorkflowStore((state) => state.lastAddedNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const clearLastAddedNodeId = useWorkflowStore((state) => state.clearLastAddedNodeId);

  useEffect(() => {
    if (!lastAddedNodeId) return;

    // Find the newly added node
    const newNode = nodes.find((n) => n.id === lastAddedNodeId);
    if (!newNode) {
      clearLastAddedNodeId();
      return;
    }

    // Calculate center of the node
    const centerX = newNode.position.x + NODE_WIDTH_HALF;
    const centerY = newNode.position.y + NODE_HEIGHT_HALF;

    // Pan to the node while preserving current zoom level
    const currentZoom = getZoom();
    setCenter(centerX, centerY, {
      zoom: currentZoom,
      duration: ANIMATION_DURATION,
    });

    // Clear the tracking after focus is complete
    clearLastAddedNodeId();
  }, [lastAddedNodeId, nodes, setCenter, getZoom, clearLastAddedNodeId]);
}
