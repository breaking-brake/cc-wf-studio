/**
 * Claude Code Workflow Studio - Minimap Container Component
 *
 * Simple container that wraps the MiniMap with a border frame.
 * Visibility is controlled by the Canvas Toolbar toggle and scroll events.
 */

import type React from 'react';

interface MinimapContainerProps {
  children: React.ReactNode;
}

/**
 * MinimapContainer Component
 *
 * Wraps MiniMap with a bordered container.
 */
export const MinimapContainer: React.FC<MinimapContainerProps> = ({ children }) => {
  return (
    <div
      style={{
        position: 'relative',
        border: '1px solid color-mix(in srgb, var(--vscode-panel-border) 30%, transparent)',
        borderRadius: '6px',
        backgroundColor: 'color-mix(in srgb, var(--vscode-editor-background) 20%, transparent)',
        padding: '2px 8px 2px 0px',
      }}
    >
      {children}
    </div>
  );
};
