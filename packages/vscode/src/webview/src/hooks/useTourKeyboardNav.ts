/**
 * Keyboard navigation for the workflow tour player: ArrowLeft → previous step,
 * ArrowRight → next step. Active only while a tour is playing, and ignored
 * while the user is typing in an input/textarea/select/contenteditable.
 */

import { useEffect } from 'react';

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function useTourKeyboardNav(active: boolean, onPrev: () => void, onNext: () => void): void {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      // Leave modified arrow combos (Ctrl/Alt/Meta/Shift + Arrow) to the
      // browser/editor — don't hijack navigation shortcuts.
      if (e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onNext();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, onPrev, onNext]);
}
