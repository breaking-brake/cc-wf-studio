/**
 * DeletableEdge Component
 *
 * Custom edge component with delete button.
 * Shows delete button only when edge is selected.
 */

import { X } from 'lucide-react';
import type React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  useReactFlow,
} from 'reactflow';

/**
 * Deletable edge component
 *
 * Extends React Flow's default edge to show delete button when selected.
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

  return (
    <>
      {/* Base edge */}
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />

      {/* Delete button rendered in HTML layer (outside SVG) to avoid animation flicker */}
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            onClick={handleDeleteClick}
            className="nodrag nopan"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'all',
              width: '18px',
              height: '18px',
              borderRadius: '3px',
              backgroundColor: 'var(--vscode-errorForeground)',
              color: 'white',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.8';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
            title="Delete connection"
          >
            <X size={12} strokeWidth={2.5} />
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

export default DeletableEdge;
