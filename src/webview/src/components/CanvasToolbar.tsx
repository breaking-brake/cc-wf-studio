/**
 * Claude Code Workflow Studio - Canvas Toolbar Component
 *
 * Toolbar overlay on the canvas with scroll mode, interaction mode,
 * edge animation, and highlight toggles.
 */

import type React from 'react';
import { EdgeAnimationToggle } from './EdgeAnimationToggle';
import { HighlightToggle } from './HighlightToggle';
import { InteractionModeToggle } from './InteractionModeToggle';
import { MinimapToggle } from './MinimapToggle';
import { ScrollModeToggle } from './ScrollModeToggle';

interface CanvasToolbarProps {
  isEdgeAnimationEnabled: boolean;
  onToggleEdgeAnimation: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isEdgeAnimationEnabled,
  onToggleEdgeAnimation,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <ScrollModeToggle />
      <InteractionModeToggle />
      <EdgeAnimationToggle isEnabled={isEdgeAnimationEnabled} onToggle={onToggleEdgeAnimation} />
      <HighlightToggle />
      <MinimapToggle />
    </div>
  );
};
