/**
 * usePopoverHover - Hover state management for trigger + portal popover pairs.
 *
 * Since Radix Popover content is rendered in a portal (outside the trigger's
 * DOM tree), standard hover detection on a wrapper div doesn't work.
 * This hook tracks mouse presence on both the trigger and the popover content
 * independently. The popover stays open as long as the mouse is over either one.
 * A short delay bridges the gap when moving between them.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

interface UsePopoverHoverReturn {
  isHovered: boolean;
  triggerProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
  contentProps: {
    onMouseEnter: () => void;
    onMouseLeave: () => void;
  };
}

const CLOSE_DELAY = 30;

export function usePopoverHover(): UsePopoverHoverReturn {
  const [isHovered, setIsHovered] = useState(false);
  const inTrigger = useRef(false);
  const inContent = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPendingClose = useCallback(() => {
    if (timeoutRef.current !== null) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const scheduleClose = useCallback(() => {
    clearPendingClose();
    timeoutRef.current = setTimeout(() => {
      if (!inTrigger.current && !inContent.current) {
        setIsHovered(false);
      }
      timeoutRef.current = null;
    }, CLOSE_DELAY);
  }, [clearPendingClose]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const triggerEnter = useCallback(() => {
    inTrigger.current = true;
    clearPendingClose();
    setIsHovered(true);
  }, [clearPendingClose]);

  const triggerLeave = useCallback(() => {
    inTrigger.current = false;
    scheduleClose();
  }, [scheduleClose]);

  const contentEnter = useCallback(() => {
    inContent.current = true;
    clearPendingClose();
  }, [clearPendingClose]);

  const contentLeave = useCallback(() => {
    inContent.current = false;
    scheduleClose();
  }, [scheduleClose]);

  return {
    isHovered,
    triggerProps: { onMouseEnter: triggerEnter, onMouseLeave: triggerLeave },
    contentProps: { onMouseEnter: contentEnter, onMouseLeave: contentLeave },
  };
}
