/**
 * Processing Overlay Component
 *
 * Displays a semi-transparent overlay to block user interactions during AI processing.
 * Based on: /specs/001-ai-workflow-refinement/tasks.md Phase 3.10
 */

interface ProcessingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export function ProcessingOverlay({ isVisible, message }: ProcessingOverlayProps) {
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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {message && (
        <div
          style={{
            padding: '16px 24px',
            backgroundColor: 'var(--vscode-editor-background)',
            color: 'var(--vscode-editor-foreground)',
            borderRadius: '4px',
            border: '1px solid var(--vscode-panel-border)',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}
