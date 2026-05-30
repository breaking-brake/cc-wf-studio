/**
 * Claude Code Workflow Studio - Window Width Hook
 *
 * Custom hook for detecting window width changes
 * Used for responsive toolbar buttons
 */

import { useEffect, useState } from 'react';
import { useWorkflowStore } from '../stores/workflow-store';

const RESPONSIVE_BREAKPOINT = 900;

/**
 * Hook to get current window width with resize listener
 */
export function useWindowWidth(): number {
  const [width, setWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return width;
}

/**
 * Hook to check if window is in compact mode (width <= 900px or Focus Mode enabled)
 */
export function useIsCompactMode(): boolean {
  const width = useWindowWidth();
  const isFocusMode = useWorkflowStore((state) => state.isFocusMode);
  return isFocusMode || width <= RESPONSIVE_BREAKPOINT;
}
