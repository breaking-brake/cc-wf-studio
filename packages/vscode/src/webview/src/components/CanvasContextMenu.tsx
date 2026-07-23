/**
 * Canvas Context Menu
 *
 * Right-click menu for the workflow canvas exposing the clipboard verbs
 * (Copy/Cut/Paste/Duplicate/Delete/Select All) that are otherwise
 * keyboard-only. Positioned at the cursor inside the canvas container;
 * closes on outside click, Escape, or pan/zoom (handled by the parent).
 */

import type React from 'react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface CanvasContextMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Shortcut hint rendered right-aligned (e.g. "Ctrl+C" / "⌘C") */
  shortcut?: string;
  disabled?: boolean;
  onSelect: () => void;
}

export type CanvasContextMenuEntry = CanvasContextMenuItem | 'separator';

interface CanvasContextMenuProps {
  /** Position relative to the canvas container (the menu's offset parent) */
  x: number;
  y: number;
  entries: CanvasContextMenuEntry[];
  onClose: () => void;
}

export const CanvasContextMenu: React.FC<CanvasContextMenuProps> = ({ x, y, entries, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ x, y });

  // Keep the menu inside the canvas container (flip/clamp near edges)
  useLayoutEffect(() => {
    const menu = menuRef.current;
    const container = menu?.parentElement;
    if (!menu || !container) {
      setPosition({ x, y });
      return;
    }
    const menuRect = menu.getBoundingClientRect();
    const maxX = container.clientWidth - menuRect.width - 4;
    const maxY = container.clientHeight - menuRect.height - 4;
    setPosition({
      x: Math.max(0, Math.min(x, maxX)),
      y: Math.max(0, Math.min(y, maxY)),
    });
  }, [x, y]);

  useEffect(() => {
    const handleMouseDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        onClose();
      }
    };
    // Capture phase so a click that opens another UI still closes the menu
    window.addEventListener('mousedown', handleMouseDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('mousedown', handleMouseDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      role="menu"
      style={{
        position: 'absolute',
        left: position.x,
        top: position.y,
        zIndex: 9999,
        backgroundColor: 'var(--vscode-dropdown-background)',
        border: '1px solid var(--vscode-dropdown-border)',
        borderRadius: '4px',
        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.3)',
        minWidth: '180px',
        padding: '4px',
      }}
      // A right-click on the menu itself must not bubble into the canvas
      onContextMenu={(event) => event.preventDefault()}
    >
      {entries.map((entry, index) =>
        entry === 'separator' ? (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: separators are positional
            key={`separator-${index}`}
            style={{
              height: '1px',
              backgroundColor: 'var(--vscode-panel-border)',
              margin: '4px 0',
            }}
          />
        ) : (
          <button
            key={entry.key}
            type="button"
            role="menuitem"
            disabled={entry.disabled}
            onClick={() => {
              if (entry.disabled) return;
              onClose();
              entry.onSelect();
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '6px 12px',
              backgroundColor: 'transparent',
              border: 'none',
              borderRadius: '2px',
              color: 'var(--vscode-foreground)',
              fontSize: '12px',
              textAlign: 'left',
              cursor: entry.disabled ? 'default' : 'pointer',
              opacity: entry.disabled ? 0.45 : 1,
            }}
            onMouseEnter={(event) => {
              if (!entry.disabled) {
                event.currentTarget.style.backgroundColor = 'var(--vscode-list-hoverBackground)';
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            {entry.icon}
            <span style={{ flex: 1 }}>{entry.label}</span>
            {entry.shortcut && (
              <span style={{ opacity: 0.6, fontSize: '11px' }}>{entry.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>
  );
};
