/**
 * Tour Panel (canvas) — right sidebar
 *
 * Guided-tour player shown as a right-side panel (like the AI Edit panel) so it
 * never covers the canvas. Reads steps from `activeWorkflow.tour` (store-driven)
 * and walks the reader through the workflow one step at a time, spotlighting
 * (selecting + centring) the nodes referenced by each step.
 *
 * Visibility/slide is driven by a `<Collapsible>` in App.tsx keyed on
 * `isTourActive`; this component renders its content whenever the workflow has
 * a tour so the slide-out animation has something to animate.
 */

import { ChevronLeft, ChevronRight, GraduationCap, RefreshCw, X } from 'lucide-react';
import { useEffect } from 'react';
import { useTourKeyboardNav } from '../hooks/useTourKeyboardNav';
import { generateTour } from '../services/vscode-bridge';
import { useWorkflowStore } from '../stores/workflow-store';
import { GenerateTourPopover } from './GenerateTourPopover';

const PANEL_WIDTH = 320;

export function TourPanel() {
  const isTourActive = useWorkflowStore((s) => s.isTourActive);
  const tourStepIndex = useWorkflowStore((s) => s.tourStepIndex);
  const tour = useWorkflowStore((s) => s.activeWorkflow?.tour);
  const setTourStepIndex = useWorkflowStore((s) => s.setTourStepIndex);
  const nextTourStep = useWorkflowStore((s) => s.nextTourStep);
  const prevTourStep = useWorkflowStore((s) => s.prevTourStep);
  const endTour = useWorkflowStore((s) => s.endTour);
  const syncSelectedNodeId = useWorkflowStore((s) => s.syncSelectedNodeId);
  const requestFocusNode = useWorkflowStore((s) => s.requestFocusNode);

  const steps = tour ?? [];
  const total = steps.length;
  const step = steps[tourStepIndex];

  // Spotlight the current step's nodes: select the first one (drives the
  // node's highlighted border) and pan the canvas to centre it.
  useEffect(() => {
    if (!isTourActive || !step) return;
    const focusId = step.nodeIds[0];
    if (focusId) {
      syncSelectedNodeId(focusId);
      requestFocusNode(focusId);
    }
  }, [isTourActive, step, syncSelectedNodeId, requestFocusNode]);

  // ← / → navigate steps while the tour is playing.
  useTourKeyboardNav(isTourActive, prevTourStep, nextTourStep);

  if (!step || total === 0) return null;

  const isFirst = tourStepIndex === 0;
  const isLast = tourStepIndex === total - 1;

  const handleClose = () => {
    endTour();
    syncSelectedNodeId(null);
  };

  return (
    <div
      style={{
        width: `${PANEL_WIDTH}px`,
        height: '100%',
        backgroundColor: 'var(--vscode-sideBar-background)',
        borderLeft: '1px solid var(--vscode-panel-border)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 16px',
          borderBottom: '1px solid var(--vscode-panel-border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <GraduationCap size={14} />
          <h2
            style={{
              margin: 0,
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--vscode-foreground)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap',
            }}
          >
            Workflow Tour
          </h2>
          <span style={{ fontSize: '11px', opacity: 0.7, flexShrink: 0 }}>
            {`${tourStepIndex + 1} / ${total}`}
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
          <GenerateTourPopover mode="regenerate" onGenerate={(provider) => generateTour(provider)}>
            <button
              type="button"
              title="Regenerate this tour with an AI agent"
              aria-label="Regenerate workflow tour"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '3px 8px',
                fontSize: '11px',
                backgroundColor: 'var(--vscode-button-secondaryBackground)',
                color: 'var(--vscode-button-secondaryForeground)',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={12} />
              Regenerate
            </button>
          </GenerateTourPopover>
          <button
            type="button"
            onClick={handleClose}
            title="End workflow tour"
            aria-label="End workflow tour"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              padding: '2px',
              background: 'transparent',
              border: 'none',
              color: 'var(--vscode-foreground)',
              cursor: 'pointer',
              opacity: 0.7,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: '3px',
          backgroundColor: 'var(--vscode-panel-border)',
          flexShrink: 0,
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${((tourStepIndex + 1) / total) * 100}%`,
            backgroundColor: 'var(--vscode-progressBar-background, var(--vscode-focusBorder))',
            transition: 'width 0.2s ease',
          }}
        />
      </div>

      {/* Body */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 600 }}>{step.title}</div>
        <div style={{ fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
          {step.description}
        </div>
        {step.languageLesson && (
          <div
            style={{
              fontSize: '12px',
              lineHeight: 1.6,
              padding: '8px 10px',
              borderRadius: '4px',
              backgroundColor: 'var(--vscode-textBlockQuote-background, rgba(127,127,127,0.12))',
              borderLeft: '2px solid var(--vscode-focusBorder)',
              color: 'var(--vscode-descriptionForeground)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {`💡 ${step.languageLesson}`}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid var(--vscode-panel-border)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={() => setTourStepIndex(tourStepIndex - 1)}
          disabled={isFirst}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '6px 12px',
            fontSize: '12px',
            backgroundColor: 'var(--vscode-button-secondaryBackground)',
            color: 'var(--vscode-button-secondaryForeground)',
            border: 'none',
            borderRadius: '3px',
            cursor: isFirst ? 'default' : 'pointer',
            opacity: isFirst ? 0.5 : 1,
          }}
        >
          <ChevronLeft size={14} />
          Prev
        </button>
        <span style={{ marginLeft: 'auto' }} />
        {isLast ? (
          <button
            type="button"
            onClick={handleClose}
            style={{
              padding: '6px 16px',
              fontSize: '12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Finish
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setTourStepIndex(tourStepIndex + 1)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '6px 14px',
              fontSize: '12px',
              backgroundColor: 'var(--vscode-button-background)',
              color: 'var(--vscode-button-foreground)',
              border: 'none',
              borderRadius: '3px',
              cursor: 'pointer',
            }}
          >
            Next
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
