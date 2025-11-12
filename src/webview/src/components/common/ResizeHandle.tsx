/**
 * Resize Handle Component
 *
 * Draggable vertical line for resizing sidebar panels.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md Phase 3.3
 */

import type React from 'react';
import { useState } from 'react';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

/**
 * ResizeHandle Component
 *
 * A draggable vertical line displayed on the left edge of sidebar panels.
 * Provides visual feedback on hover and during drag operations.
 */
export function ResizeHandle({ onMouseDown }: ResizeHandleProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      onMouseDown={onMouseDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      tabIndex={0}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: '4px',
        cursor: 'ew-resize',
        backgroundColor: isHovered ? 'var(--vscode-focusBorder)' : 'transparent',
        transition: 'background-color 0.2s ease',
        zIndex: 10,
      }}
      aria-label="Resize sidebar"
      role="separator"
      aria-orientation="vertical"
      aria-valuenow={0}
    />
  );
}
