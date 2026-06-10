/**
 * Start / Generate Workflow Tour Button (canvas toolbar)
 *
 * Always visible while a workflow is open (improves discoverability):
 *   - workflow has a tour  → "Start Workflow Tour" (plays it)
 *   - workflow has no tour  → opens a popover offering to generate one with the
 *     AI agent (Claude Code by default; other agents via the AI Edit panel)
 * Hidden only while a tour is actively playing (the player UI is showing).
 *
 * Named "Workflow Tour" to distinguish it from the extension's onboarding tour.
 */

import { GraduationCap } from 'lucide-react';
import type React from 'react';
import { generateTour } from '../services/vscode-bridge';
import { useWorkflowStore } from '../stores/workflow-store';
import { StyledTooltipItem, StyledTooltipProvider } from './common/StyledTooltip';
import { GenerateTourPopover } from './GenerateTourPopover';

const ROUND_BUTTON_STYLE: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: 'var(--vscode-editor-background)',
  border: '1px solid var(--vscode-panel-border)',
  borderRadius: '20px',
  width: '34px',
  height: '34px',
  opacity: 0.85,
  cursor: 'pointer',
  boxSizing: 'border-box',
};

export const StartTourButton: React.FC = () => {
  const hasWorkflow = useWorkflowStore((s) => !!s.activeWorkflow);
  const tourLength = useWorkflowStore((s) => s.activeWorkflow?.tour?.length ?? 0);
  const isTourActive = useWorkflowStore((s) => s.isTourActive);
  const startTour = useWorkflowStore((s) => s.startTour);

  // Hidden while the player is showing or when there is no workflow to tour.
  if (isTourActive || !hasWorkflow) return null;

  // Tour exists → simple "Start Workflow Tour" button.
  if (tourLength > 0) {
    return (
      <StyledTooltipProvider>
        <StyledTooltipItem content={`Start workflow tour (${tourLength} steps)`}>
          <div
            onClick={() => startTour()}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                startTour();
              }
            }}
            role="button"
            tabIndex={0}
            aria-label="Start workflow tour"
            style={ROUND_BUTTON_STYLE}
          >
            <GraduationCap size={14} style={{ color: 'var(--vscode-foreground)' }} />
          </div>
        </StyledTooltipItem>
      </StyledTooltipProvider>
    );
  }

  // No tour → popover offering to generate one (with agent selection).
  return (
    <GenerateTourPopover onGenerate={(provider) => generateTour(provider)}>
      <button
        type="button"
        aria-label="Generate a workflow tour"
        title="Generate a workflow tour"
        style={{ ...ROUND_BUTTON_STYLE, padding: 0, opacity: 0.7 }}
      >
        <GraduationCap size={14} style={{ color: 'var(--vscode-foreground)' }} />
      </button>
    </GenerateTourPopover>
  );
};
