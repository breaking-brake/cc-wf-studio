/**
 * Auto-focus hook for newly added nodes and Overview-mode jump targets.
 *
 * Watches `lastAddedNodeId` (set when a node is first added to the canvas)
 * and `requestedFocusNodeId` (set by the Overview "Edit on canvas" links)
 * and pans the canvas to centre the matching node.
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
 * to a newly added or externally-requested node.
 *
 * Uses React Flow's setCenter() method to pan while preserving
 * the current zoom level.
 */
export function useAutoFocusNode(): void {
  const { setCenter, getZoom } = useReactFlow();
  const lastAddedNodeId = useWorkflowStore((state) => state.lastAddedNodeId);
  const requestedFocusNodeId = useWorkflowStore((state) => state.requestedFocusNodeId);
  const nodes = useWorkflowStore((state) => state.nodes);
  const clearLastAddedNodeId = useWorkflowStore((state) => state.clearLastAddedNodeId);
  const clearRequestedFocusNodeId = useWorkflowStore((state) => state.clearRequestedFocusNodeId);

  // Pan to a newly added node.
  useEffect(() => {
    if (!lastAddedNodeId) return;
    const target = nodes.find((n) => n.id === lastAddedNodeId);
    if (!target) {
      clearLastAddedNodeId();
      return;
    }
    setCenter(target.position.x + NODE_WIDTH_HALF, target.position.y + NODE_HEIGHT_HALF, {
      zoom: getZoom(),
      duration: ANIMATION_DURATION,
    });
    clearLastAddedNodeId();
  }, [lastAddedNodeId, nodes, setCenter, getZoom, clearLastAddedNodeId]);

  // Pan to a node explicitly requested by another part of the UI
  // (e.g. "Edit on canvas" link in Overview mode).
  useEffect(() => {
    if (!requestedFocusNodeId) return;
    const target = nodes.find((n) => n.id === requestedFocusNodeId);
    if (!target) {
      clearRequestedFocusNodeId();
      return;
    }
    setCenter(target.position.x + NODE_WIDTH_HALF, target.position.y + NODE_HEIGHT_HALF, {
      zoom: getZoom(),
      duration: ANIMATION_DURATION,
    });
    clearRequestedFocusNodeId();
  }, [requestedFocusNodeId, nodes, setCenter, getZoom, clearRequestedFocusNodeId]);
}
