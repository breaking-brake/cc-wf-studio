/**
 * DeletableEdge Component
 *
 * Custom edge component with delete button.
 * Shows delete button only when edge is selected.
 */

import type React from 'react';
import { BaseEdge, type EdgeProps, getBezierPath } from 'reactflow';
import { useWorkflowStore } from '../../stores/workflow-store';

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
  const { requestDeleteEdge } = useWorkflowStore();

  // Calculate bezier curve path and center coordinates
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  // Delete button click handler
  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent edge selection event
    requestDeleteEdge(id);
  };

  return (
    <>
      {/* Base edge */}
      <BaseEdge path={edgePath} style={style} markerEnd={markerEnd} />

      {/* Show delete button only when selected */}
      {selected && (
        <foreignObject
          x={labelX - 9}
          y={labelY - 9}
          width={18}
          height={18}
          className="edgebutton-foreignobject"
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <button
            type="button"
            onClick={handleDeleteClick}
            style={{
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
              fontSize: '14px',
              fontWeight: 'bold',
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
            <svg
              width="8"
              height="8"
              viewBox="0 0 8 8"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{ display: 'block' }}
              aria-labelledby="delete-edge-icon-title"
            >
              <title id="delete-edge-icon-title">Delete</title>
              <path
                d="M1 1L7 7M7 1L1 7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </foreignObject>
      )}
    </>
  );
};

export default DeletableEdge;
