/**
 * Collapsible Panel Custom Hook
 *
 * Provides collapse/expand functionality for sidebar panels with localStorage persistence.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'cc-wf-studio.nodePaletteCollapsed';
const DEFAULT_COLLAPSED = false;

interface UseCollapsiblePanelReturn {
  isCollapsed: boolean;
  toggle: () => void;
  expand: () => void;
  collapse: () => void;
}

/**
 * Custom hook for collapsible panel functionality
 *
 * Features:
 * - Toggle collapse/expand state
 * - localStorage persistence
 *
 * @returns {UseCollapsiblePanelReturn} Collapse state and control functions
 */
export function useCollapsiblePanel(): UseCollapsiblePanelReturn {
  // Initialize state from localStorage or use default
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    return DEFAULT_COLLAPSED;
  });

  // Toggle collapse state
  const toggle = useCallback(() => {
    setIsCollapsed((prev) => !prev);
  }, []);

  // Expand panel
  const expand = useCallback(() => {
    setIsCollapsed(false);
  }, []);

  // Collapse panel
  const collapse = useCallback(() => {
    setIsCollapsed(true);
  }, []);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, isCollapsed.toString());
  }, [isCollapsed]);

  return {
    isCollapsed,
    toggle,
    expand,
    collapse,
  };
}
