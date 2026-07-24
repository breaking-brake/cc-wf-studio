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
import { SearchNodesButton } from './SearchNodesButton';
import { StartTourButton } from './StartTourButton';
import { UndoRedoControls } from './UndoRedoControls';

interface CanvasToolbarProps {
  isEdgeAnimationEnabled: boolean;
  onToggleEdgeAnimation: () => void;
  /** Opens the node search panel; omitted where search is unavailable
   *  (e.g. the sub-agent flow dialog), which hides the button. */
  onOpenSearch?: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isEdgeAnimationEnabled,
  onToggleEdgeAnimation,
  onOpenSearch,
}) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <UndoRedoControls />
      <ScrollModeToggle />
      <InteractionModeToggle />
      <EdgeAnimationToggle isEnabled={isEdgeAnimationEnabled} onToggle={onToggleEdgeAnimation} />
      <HighlightToggle />
      <MinimapToggle />
      {onOpenSearch && <SearchNodesButton onClick={onOpenSearch} />}
      <StartTourButton />
    </div>
  );
};
