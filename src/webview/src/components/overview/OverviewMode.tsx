/**
 * Overview Mode root component.
 *
 * Layout: header on top, then a horizontally split body:
 *   - Left:  Mermaid flow diagram
 *   - Right: per-node Markdown instructions (scroll target on click)
 *
 * The split ratio is persisted in localStorage.
 */

import type { Workflow } from '@shared/types/messages';
import type React from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from '../../i18n/i18n-context';
import { InstructionsPanel, type InstructionsPanelHandle } from './InstructionsPanel';
import { MermaidDiagram } from './MermaidDiagram';
import { OverviewEmptyState } from './OverviewEmptyState';
import { OverviewHeader } from './OverviewHeader';

interface OverviewModeProps {
  workflow: Workflow | null;
  isHistoricalVersion: boolean;
  hasGitChanges: boolean;
  onSwitchToEdit?: () => void;
}

const RATIO_STORAGE_KEY = 'cc-wf-studio.overviewMermaidPanelRatio';
const MIN_RATIO = 0.25;
const MAX_RATIO = 0.75;
const DEFAULT_RATIO = 0.5;

function loadStoredRatio(): number {
  try {
    const v = localStorage.getItem(RATIO_STORAGE_KEY);
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

export const OverviewMode: React.FC<OverviewModeProps> = ({
  workflow,
  isHistoricalVersion,
  hasGitChanges,
  onSwitchToEdit,
}) => {
  const { t } = useTranslation();
  const [ratio, setRatio] = useState<number>(() => loadStoredRatio());
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const isResizingRef = useRef(false);
  const instructionsRef = useRef<InstructionsPanelHandle>(null);
  // Sanitized id of the section currently nearest the top of the right pane.
  // Drives the "you are reading this" highlight on the Mermaid flow.
  const [activeSanitizedNodeId, setActiveSanitizedNodeId] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(RATIO_STORAGE_KEY, ratio.toString());
    } catch {
      // ignore quota errors
    }
  }, [ratio]);

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
    const handleUp = () => {
      isResizingRef.current = false;
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);
  }, []);

  const handleNodeClick = useCallback((nodeId: string) => {
    instructionsRef.current?.scrollToNode(nodeId);
  }, []);

  const hasContent = useMemo(
    () => (workflow ? isInstructionalWorkflow(workflow) : false),
    [workflow]
  );

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
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--vscode-editor-background)',
      }}
    >
      <OverviewHeader
        workflow={workflow}
        isHistoricalVersion={isHistoricalVersion}
        hasGitChanges={hasGitChanges}
        onSwitchToEdit={onSwitchToEdit}
      />
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
          aria-orientation="vertical"
          aria-label="Resize Overview panels"
          aria-valuemin={Math.round(MIN_RATIO * 100)}
          aria-valuemax={Math.round(MAX_RATIO * 100)}
          aria-valuenow={Math.round(ratio * 100)}
          tabIndex={0}
          onMouseDown={handleSplitterMouseDown}
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
          {hasContent ? (
            <InstructionsPanel
              ref={instructionsRef}
              workflow={workflow}
              onActiveSectionChange={setActiveSanitizedNodeId}
            />
          ) : (
            <OverviewEmptyState />
          )}
        </div>
      </div>
    </div>
  );
};
