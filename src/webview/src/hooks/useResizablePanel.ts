/**
 * Resizable Panel Custom Hook
 *
 * Provides drag-to-resize functionality for sidebar panels.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md Phase 3.3
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const MIN_WIDTH = 200;
const MAX_WIDTH = 600;
const DEFAULT_WIDTH = 300;
const STORAGE_KEY = 'cc-wf-studio.sidebarWidth';

interface UseResizablePanelReturn {
  width: number;
  isResizing: boolean;
  handleMouseDown: (e: React.MouseEvent) => void;
}

/**
 * Custom hook for resizable panel functionality
 *
 * Features:
 * - Drag-to-resize with mouse events
 * - Width constraints (200px - 600px)
 * - localStorage persistence
 * - Visual feedback during resize
 *
 * @returns {UseResizablePanelReturn} Panel width, resizing state, and mouse down handler
 */
export function useResizablePanel(): UseResizablePanelReturn {
  // Initialize width from localStorage or use default
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (!Number.isNaN(parsed) && parsed >= MIN_WIDTH && parsed <= MAX_WIDTH) {
        return parsed;
      }
    }
    return DEFAULT_WIDTH;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Handle mouse move during resize
  const handleMouseMove = useCallback((e: MouseEvent) => {
    const deltaX = startXRef.current - e.clientX;
    const newWidth = startWidthRef.current + deltaX;

    // Apply constraints
    const constrainedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));
    setWidth(constrainedWidth);
  }, []);

  // Handle mouse up to end resize
  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Handle mouse down to start resize
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    startXRef.current = e.clientX;
    startWidthRef.current = width;
  };

  // Set up global mouse event listeners
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'ew-resize';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Restore normal cursor and selection
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

  // Persist width to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, width.toString());
  }, [width]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}
