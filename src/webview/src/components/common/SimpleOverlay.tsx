/**
 * Simple Overlay Component
 *
 * Displays a semi-transparent overlay without any message.
 * Used for blocking interactions in areas like Node Palette during AI processing.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md Phase 3.10
 */

interface SimpleOverlayProps {
  isVisible: boolean;
}

export function SimpleOverlay({ isVisible }: SimpleOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        zIndex: 1000,
        cursor: 'not-allowed',
      }}
    />
  );
}
