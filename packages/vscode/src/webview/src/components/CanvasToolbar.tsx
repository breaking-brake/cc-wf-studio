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
import { KeyboardShortcutsButton } from './KeyboardShortcutsButton';
import { MinimapToggle } from './MinimapToggle';
import { ScrollModeToggle } from './ScrollModeToggle';
import { SearchNodesButton } from './SearchNodesButton';
import { StartTourButton } from './StartTourButton';
import { UndoRedoControls } from './UndoRedoControls';
import { WorkflowProblemsButton } from './WorkflowProblemsButton';

interface CanvasToolbarProps {
  isEdgeAnimationEnabled: boolean;
  onToggleEdgeAnimation: () => void;
  /** Opens the node search panel; omitted where search is unavailable
   *  (e.g. the sub-agent flow dialog), which hides the button. */
  onOpenSearch?: () => void;
  /** Auto-arranges the whole canvas; omitted where auto layout is
   *  unavailable (e.g. the sub-agent flow dialog), which hides the button. */
  onAutoLayout?: () => void;
  /** Opens the workflow problems panel; omitted where validation is
   *  unavailable (e.g. the sub-agent flow dialog), which hides the button. */
  onOpenProblems?: () => void;
  /** Opens the keyboard shortcut cheat sheet; omitted where the canvas
   *  shortcuts don't apply (e.g. the sub-agent flow dialog), which hides
   *  the button. */
  onOpenShortcuts?: () => void;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  isEdgeAnimationEnabled,
  onToggleEdgeAnimation,
  onOpenSearch,
  onAutoLayout,
  onOpenProblems,
  onOpenShortcuts,
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
      {onOpenProblems && <WorkflowProblemsButton onClick={onOpenProblems} />}
      {onOpenShortcuts && <KeyboardShortcutsButton onClick={onOpenShortcuts} />}
      <StartTourButton />
    </div>
  );
};
