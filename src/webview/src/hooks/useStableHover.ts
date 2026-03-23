/**
 * useStableHover - Robust hover detection for animated expand/collapse toggles.
 *
 * Problem: When a CSS width transition is in progress, the element boundary
 * moves under the cursor. The browser may never fire a mouseleave event
 * because, from its perspective, the cursor never crossed the element edge
 * — the edge moved away from the cursor instead.
 *
 * Solution: Instead of relying on mouseleave, we attach a document-level
 * pointermove listener while hovered. On every move we hit-test the cursor
 * against the element's current bounding rect. If the cursor is outside,
 * we unhover — regardless of whether mouseleave fired.
 *
 * A small margin (default 4px) prevents flicker at exact boundaries.
 * Polling is throttled via requestAnimationFrame to avoid layout thrash.
 */

import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';

interface UseStableHoverReturn {
  /** Attach this ref to the hoverable element */
  ref: RefObject<HTMLDivElement | null>;
  isHovered: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}

/** Margin in px — cursor must be this far outside before we unhover */
const LEAVE_MARGIN = 4;

export function useStableHover(): UseStableHoverReturn {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isHovered, setIsHovered] = useState(false);
  const isHoveredRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  // Track the latest pointer position so we can check it on transitionend too
  const pointerPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const checkBounds = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const { x, y } = pointerPos.current;
    const outside =
      x < rect.left - LEAVE_MARGIN ||
      x > rect.right + LEAVE_MARGIN ||
      y < rect.top - LEAVE_MARGIN ||
      y > rect.bottom + LEAVE_MARGIN;
    if (outside && isHoveredRef.current) {
      isHoveredRef.current = false;
      setIsHovered(false);
    }
  }, []);

  useEffect(() => {
    if (!isHovered) return;

    const handlePointerMove = (e: PointerEvent) => {
      pointerPos.current = { x: e.clientX, y: e.clientY };
      if (rafRef.current !== null) return; // already scheduled
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        checkBounds();
      });
    };

    // Also check on transitionend — the element may have shrunk away from
    // a stationary cursor without any pointer movement.
    const handleTransitionEnd = () => {
      checkBounds();
    };

    document.addEventListener('pointermove', handlePointerMove);
    const el = ref.current;
    el?.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      document.removeEventListener('pointermove', handlePointerMove);
      el?.removeEventListener('transitionend', handleTransitionEnd);
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [isHovered, checkBounds]);

  const onMouseEnter = useCallback(() => {
    isHoveredRef.current = true;
    setIsHovered(true);
  }, []);

  // Still listen for mouseleave as the fast path — works in the common case
  const onMouseLeave = useCallback(() => {
    isHoveredRef.current = false;
    setIsHovered(false);
  }, []);

  return { ref, isHovered, onMouseEnter, onMouseLeave };
}
