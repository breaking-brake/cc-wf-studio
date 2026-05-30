/**
 * Resizable Panel Custom Hook
 *
 * Provides drag-to-resize functionality for sidebar panels.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md Phase 3.3
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_MIN_WIDTH = 200;
const DEFAULT_MAX_WIDTH = 600;
const DEFAULT_WIDTH = 300;
const DEFAULT_STORAGE_KEY = 'cc-wf-studio.sidebarWidth';

interface UseResizablePanelOptions {
  minWidth?: number;
  maxWidth?: number;
  defaultWidth?: number;
  storageKey?: string;
}

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
 * - Configurable width constraints
 * - localStorage persistence
 * - Visual feedback during resize
 *
 * @param options - Optional configuration for min/max width, default width, and storage key
 * @returns {UseResizablePanelReturn} Panel width, resizing state, and mouse down handler
 */
export function useResizablePanel(options?: UseResizablePanelOptions): UseResizablePanelReturn {
  const minWidth = options?.minWidth ?? DEFAULT_MIN_WIDTH;
  const maxWidth = options?.maxWidth ?? DEFAULT_MAX_WIDTH;
  const defaultWidth = options?.defaultWidth ?? DEFAULT_WIDTH;
  const storageKey = options?.storageKey ?? DEFAULT_STORAGE_KEY;

  // Initialize width from localStorage or use default
  const [width, setWidth] = useState<number>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      const parsed = Number.parseInt(saved, 10);
      if (!Number.isNaN(parsed) && parsed >= minWidth && parsed <= maxWidth) {
        return parsed;
      }
    }
    return defaultWidth;
  });

  const [isResizing, setIsResizing] = useState(false);
  const startXRef = useRef<number>(0);
  const startWidthRef = useRef<number>(0);

  // Handle mouse move during resize
  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      const deltaX = startXRef.current - e.clientX;
      const newWidth = startWidthRef.current + deltaX;

      // Apply constraints
      const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));
      setWidth(constrainedWidth);
    },
    [minWidth, maxWidth]
  );

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
    localStorage.setItem(storageKey, width.toString());
  }, [width, storageKey]);

  return {
    width,
    isResizing,
    handleMouseDown,
  };
}
