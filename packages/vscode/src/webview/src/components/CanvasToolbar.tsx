/**
 * Claude Code Workflow Studio - Canvas Toolbar Component
 *
 * Toolbar overlay on the canvas with scroll mode, interaction mode,
 * edge animation, and highlight toggles.
 */

import type React from 'react';
import { AutoLayoutButton } from './AutoLayoutButton';
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
  /** Auto-arranges the whole canvas; omitted where auto layout is
   *  unavailable (e.g. the sub-agent flow dialog), which hides the button. */
  onAutoLayout?: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isEdgeAnimationEnabled,
  onToggleEdgeAnimation,
  onOpenSearch,
  onAutoLayout,
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
      {onAutoLayout && <AutoLayoutButton onClick={onAutoLayout} />}
      <StartTourButton />
    </div>
  );
};
