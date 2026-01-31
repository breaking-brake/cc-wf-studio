/**
 * BetaBadge Component
 *
 * A reusable badge component for indicating beta features.
 * Used in toolbar menus, node palette, and other UI elements.
 */

import type React from 'react';

interface BetaBadgeProps {
  /** Optional custom style overrides */
  style?: React.CSSProperties;
}

/**
 * BetaBadge displays a small "Beta" label badge.
 * Uses VSCode theme colors for consistency.
 */
export const BetaBadge: React.FC<BetaBadgeProps> = ({ style }) => {
  return (
    <span
      style={{
        fontSize: '9px',
        padding: '1px 4px',
        backgroundColor: 'var(--vscode-badge-background)',
        color: 'var(--vscode-badge-foreground)',
        borderRadius: '2px',
        ...style,
      }}
    >
      Beta
    </span>
  );
};
