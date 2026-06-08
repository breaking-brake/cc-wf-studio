/**
 * Reusable workflow overview view (header + Mermaid flow + per-node Markdown
 * instructions). Container-agnostic: used by full-screen Overview mode and by
 * dialog-embedded previews.
 *
 * The split ratio is persisted in localStorage under a caller-provided key so
 * that different host containers can keep independent layout preferences.
 */

import type { AiEditingProvider, Workflow } from '@shared/types/messages';
import { GraduationCap } from 'lucide-react';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTourKeyboardNav } from '../../hooks/useTourKeyboardNav';
import { useTranslation } from '../../i18n/i18n-context';
import { GenerateTourPopover } from '../GenerateTourPopover';
import { TourStepCard } from '../TourStepCard';
import { InstructionsPanel, type InstructionsPanelHandle } from './InstructionsPanel';
import { MermaidDiagram } from './MermaidDiagram';
import { OverviewEmptyState } from './OverviewEmptyState';
import { OverviewHeader } from './OverviewHeader';

interface WorkflowOverviewProps {
  workflow: Workflow | null;
  isHistoricalVersion?: boolean;
  hasGitChanges?: boolean;
  /** When omitted, the back-to-edit toggle in the header is hidden. */
  onSwitchToEdit?: () => void;
  /**
   * Switch to Edit mode and focus a specific node on the canvas. Receives
   * the original (un-sanitized) node id. Omit in read-only contexts.
   */
  onEditNode?: (nodeId: string) => void;
  /**
   * Optional one-shot focus request: when this prop changes (different
   * object identity), the right pane scrolls to the matching section.
   */
  focusRequest?: { nodeId: string; key: number } | null;
  /** When non-null, renders a parse-error banner instead of the panes. */
  parseError?: string | null;
  /**
   * localStorage key for the split-pane ratio. Different host containers
   * (full-screen mode, dialog preview, etc.) should pass distinct keys so
   * user-tuned ratios don't bleed across contexts.
   */
  splitRatioStorageKey?: string;
  /** Hide the header entirely (e.g. when the host renders its own title bar). */
  hideHeader?: boolean;
  /**
   * Launch guided-tour generation for this workflow. Provided only by hosts
   * that can generate (the VSCode editor); omitted in read-only contexts like
   * `ccwf preview`, where generation isn't possible.
   */
  onGenerateTour?: (provider: AiEditingProvider) => Promise<void> | void;
}

const DEFAULT_RATIO_STORAGE_KEY = 'cc-wf-studio.overviewMermaidPanelRatio';
const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;
const DEFAULT_RATIO = 0.5;

const FLOATING_PILL_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: '24px',
  right: '24px',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  fontSize: '12px',
  backgroundColor: 'var(--vscode-button-background)',
  color: 'var(--vscode-button-foreground)',
  border: 'none',
  borderRadius: '20px',
  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.3)',
  cursor: 'pointer',
  zIndex: 40,
};

function loadStoredRatio(storageKey: string): number {
  try {
    const v = localStorage.getItem(storageKey);
    if (!v) return DEFAULT_RATIO;
    const n = Number.parseFloat(v);
    if (!Number.isFinite(n)) return DEFAULT_RATIO;
    return Math.min(MAX_RATIO, Math.max(MIN_RATIO, n));
  } catch {
    return DEFAULT_RATIO;
  }
}

function isInstructionalWorkflow(workflow: Workflow): boolean {
  return workflow.nodes.some((n) => {
    const t = n.type as string;
    return t !== 'start' && t !== 'end' && t !== 'group';
  });
}

export const WorkflowOverview: React.FC<WorkflowOverviewProps> = ({
  workflow,
  isHistoricalVersion = false,
  hasGitChanges = false,
  onSwitchToEdit,
  onEditNode,
  focusRequest,
  parseError,
  splitRatioStorageKey = DEFAULT_RATIO_STORAGE_KEY,
  hideHeader = false,
  onGenerateTour,
}) => {
  const { t } = useTranslation();
  const [ratio, setRatio] = useState<number>(() => loadStoredRatio(splitRatioStorageKey));
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const cleanupDragRef = useRef<(() => void) | null>(null);
  const instructionsRef = useRef<InstructionsPanelHandle>(null);
  const [activeSanitizedNodeId, setActiveSanitizedNodeId] = useState<string | null>(null);

  // Guided tour (read-only player). Steps come from the workflow itself, so
  // both `ccwf preview` and the in-editor Overview mode play tours.
  const tour = useMemo(() => workflow?.tour ?? [], [workflow]);
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  // Reset the tour whenever the workflow changes identity.
  // biome-ignore lint/correctness/useExhaustiveDependencies: reset only on workflow change
  useEffect(() => {
    setIsTourActive(false);
    setTourStepIndex(0);
  }, [workflow]);

  // Spotlight the current tour step by scrolling its first node into view —
  // this reuses the same path as `focusRequest` (InstructionsPanel scroll →
  // Mermaid follow / section glow).
  useEffect(() => {
    if (!isTourActive) return;
    const stepNodeId = tour[tourStepIndex]?.nodeIds[0];
    if (!stepNodeId) return;
    const handle = requestAnimationFrame(() => {
      instructionsRef.current?.scrollToNode(stepNodeId);
    });
    return () => cancelAnimationFrame(handle);
  }, [isTourActive, tourStepIndex, tour]);

  // ← / → navigate steps while the tour is playing.
  const goPrevTourStep = useCallback(() => setTourStepIndex((i) => Math.max(0, i - 1)), []);
  const goNextTourStep = useCallback(
    () => setTourStepIndex((i) => Math.min(Math.max(tour.length - 1, 0), i + 1)),
    [tour.length]
  );
  useTourKeyboardNav(isTourActive, goPrevTourStep, goNextTourStep);

  useEffect(() => {
    try {
      localStorage.setItem(splitRatioStorageKey, ratio.toString());
    } catch {
      // ignore quota errors
    }
  }, [ratio, splitRatioStorageKey]);

  useEffect(() => {
    if (!focusRequest) return;
    const id = focusRequest.nodeId;
    const handle = requestAnimationFrame(() => {
      instructionsRef.current?.scrollToNode(id);
    });
    return () => cancelAnimationFrame(handle);
  }, [focusRequest]);

  // Drop any in-flight document drag listeners if we unmount mid-drag
  // (e.g. dialog overlay closes while the splitter is being dragged).
  useEffect(() => {
    return () => {
      cleanupDragRef.current?.();
      cleanupDragRef.current = null;
      isResizingRef.current = false;
    };
  }, []);

  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;

    const handleMove = (moveEvent: MouseEvent) => {
      if (!isResizingRef.current) return;
      const container = splitContainerRef.current;
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const next = (moveEvent.clientX - rect.left) / rect.width;
      setRatio(Math.min(MAX_RATIO, Math.max(MIN_RATIO, next)));
    };
    const detach = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
    const handleUp = () => {
      detach();
      cleanupDragRef.current = null;
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
    cleanupDragRef.current = detach;
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    instructionsRef.current?.scrollToNode(nodeId);
  }, []);

  const handleSplitterKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const STEP = 0.05;
    switch (e.key) {
      case 'ArrowLeft':
        e.preventDefault();
        setRatio((r) => Math.max(MIN_RATIO, r - STEP));
        break;
      case 'ArrowRight':
        e.preventDefault();
        setRatio((r) => Math.min(MAX_RATIO, r + STEP));
        break;
      case 'Home':
        e.preventDefault();
        setRatio(MIN_RATIO);
        break;
      case 'End':
        e.preventDefault();
        setRatio(MAX_RATIO);
        break;
    }
  }, []);

  const hasContent = useMemo(
    () => (workflow ? isInstructionalWorkflow(workflow) : false),
    [workflow]
  );

  if (parseError) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          gap: '8px',
          color: 'var(--vscode-errorForeground)',
          backgroundColor: 'var(--vscode-editor-background)',
        }}
        role="alert"
      >
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>{t('overview.parseError')}</h3>
        <pre
          style={{
            margin: 0,
            maxWidth: '720px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontFamily: 'var(--vscode-editor-font-family)',
            fontSize: '12px',
            color: 'var(--vscode-descriptionForeground)',
          }}
        >
          {parseError}
        </pre>
      </div>
    );
  }
  if (!workflow) {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--vscode-descriptionForeground)',
          fontSize: '12px',
        }}
      >
        {t('overview.loading')}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--vscode-editor-background)',
      }}
    >
      {!hideHeader && (
        <OverviewHeader
          workflow={workflow}
          isHistoricalVersion={isHistoricalVersion}
          hasGitChanges={hasGitChanges}
          onSwitchToEdit={onSwitchToEdit}
        />
      )}
      <div
        ref={splitContainerRef}
        style={{
          display: 'flex',
          flex: 1,
          minHeight: 0,
          width: '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            flexBasis: `${ratio * 100}%`,
            minWidth: 0,
            overflow: 'hidden',
            display: 'flex',
            backgroundColor: 'var(--vscode-editor-background)',
          }}
        >
          <MermaidDiagram
            workflow={workflow}
            onNodeClick={handleNodeClick}
            activeSanitizedNodeId={activeSanitizedNodeId}
          />
        </div>
        <div
          role="slider"
          aria-orientation="horizontal"
          aria-label="Resize Overview panels"
          aria-valuemin={Math.round(MIN_RATIO * 100)}
          aria-valuemax={Math.round(MAX_RATIO * 100)}
          aria-valuenow={Math.round(ratio * 100)}
          tabIndex={0}
          onMouseDown={handleSplitterMouseDown}
          onKeyDown={handleSplitterKeyDown}
          style={{
            width: '6px',
            cursor: 'ew-resize',
            backgroundColor: 'var(--vscode-panel-border)',
            flexShrink: 0,
            userSelect: 'none',
          }}
        />
        <div
          style={{
            flexBasis: `${(1 - ratio) * 100}%`,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'var(--vscode-sideBar-background)',
            borderLeft: '1px solid var(--vscode-panel-border)',
          }}
        >
          <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
            {hasContent ? (
              <InstructionsPanel
                ref={instructionsRef}
                workflow={workflow}
                onActiveSectionChange={setActiveSanitizedNodeId}
                onEditNode={onEditNode}
              />
            ) : (
              <OverviewEmptyState />
            )}
          </div>
          {/* Docked tour area: sits at the bottom of the right pane so it never
              covers the instructions. */}
          {isTourActive && tour[tourStepIndex] && (
            <TourStepCard
              variant="docked"
              step={tour[tourStepIndex]}
              index={tourStepIndex}
              total={tour.length}
              onPrev={() => setTourStepIndex((i) => Math.max(0, i - 1))}
              onNext={() => setTourStepIndex((i) => Math.min(tour.length - 1, i + 1))}
              onClose={() => setIsTourActive(false)}
              onRegenerate={onGenerateTour}
            />
          )}
        </div>
      </div>

      {/* Floating tour control (hidden while a tour is playing) */}
      {!isTourActive &&
        (tour.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setTourStepIndex(0);
              setIsTourActive(true);
            }}
            title={`Start workflow tour (${tour.length} steps)`}
            style={FLOATING_PILL_STYLE}
          >
            <GraduationCap size={14} />
            Start Workflow Tour
          </button>
        ) : onGenerateTour ? (
          <GenerateTourPopover onGenerate={onGenerateTour}>
            <button type="button" title="Generate a workflow tour" style={FLOATING_PILL_STYLE}>
              <GraduationCap size={14} />
              Generate Workflow Tour
            </button>
          </GenerateTourPopover>
        ) : (
          // Read-only context (e.g. ccwf preview): generation isn't available
          // here — passive hint only.
          <div
            title="This workflow has no guided tour."
            style={{
              ...FLOATING_PILL_STYLE,
              backgroundColor: 'var(--vscode-badge-background)',
              color: 'var(--vscode-badge-foreground)',
              boxShadow: 'none',
              cursor: 'default',
              opacity: 0.8,
            }}
          >
            <GraduationCap size={14} />
            No workflow tour
          </div>
        ))}
    </div>
  );
};
