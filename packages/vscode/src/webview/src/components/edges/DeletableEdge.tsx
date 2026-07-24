/**
 * DeletableEdge Component
 *
 * Custom edge component with insert and delete buttons.
 * Shows the buttons only when the edge is selected.
 */

import { Plus, X } from 'lucide-react';
import type React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useReactFlow,
} from 'reactflow';
import { useTranslation } from '../../i18n/i18n-context';
import { useWorkflowStore } from '../../stores/workflow-store';

const edgeButtonStyle: React.CSSProperties = {
  width: '18px',
  height: '18px',
  borderRadius: '3px',
  color: 'white',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 0,
};

/**
 * Deletable edge component
 *
 * Extends React Flow's default edge to show insert (splice a node into the
 * connection) and delete buttons when selected.
 */
export const DeletableEdge: React.FC<EdgeProps> = ({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
  style,
  markerEnd,
}) => {
  const { t } = useTranslation();
  const { setEdges } = useReactFlow();

  // Calculate bezier curve path and center coordinates
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Delete button click handler - delete immediately without confirmation
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent edge selection event
    setEdges((edges) => edges.filter((edge) => edge.id !== id));
  };

  // Insert button click handler - ask WorkflowEditor (which owns the picker
  // menu) to open the insert-node picker for this edge. The inserted node
  // lands at the grid-snapped edge midpoint.
  const handleInsertClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    useWorkflowStore.getState().setEdgeInsertRequest({
      edgeId: id,
      clientX: e.clientX,
      clientY: e.clientY,
      flowPosition: {
        x: Math.round(labelX / 15) * 15,
        y: Math.round(labelY / 15) * 15,
      },
    });
  };

  return (
    <>
      {/* Base edge */}
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />

      {/* Buttons rendered in HTML layer (outside SVG) to avoid animation flicker */}
      {selected && (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              display: 'flex',
              gap: '4px',
            }}
          >
            <button
              type="button"
              onClick={handleInsertClick}
              style={{
                ...edgeButtonStyle,
                backgroundColor: 'var(--vscode-button-background)',
                color: 'var(--vscode-button-foreground)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              title={t('canvas.insertNodeOnEdge.tooltip')}
              aria-label={t('canvas.insertNodeOnEdge.tooltip')}
            >
              <Plus size={12} strokeWidth={2.5} />
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              style={{
                ...edgeButtonStyle,
                backgroundColor: 'var(--vscode-errorForeground)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              title={t('canvas.deleteEdge.tooltip')}
            >
              <X size={12} strokeWidth={2.5} />
            </button>
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default DeletableEdge;
