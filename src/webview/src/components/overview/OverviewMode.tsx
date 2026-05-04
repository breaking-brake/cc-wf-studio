/**
 * Full-screen Overview mode entry point.
 *
 * Thin wrapper that adapts the canvas-page-level concerns (Git diff context,
 * mode switching) onto the reusable WorkflowOverview view.
 */

import type { Workflow } from '@shared/types/messages';
import type React from 'react';
import { WorkflowOverview } from './WorkflowOverview';

interface OverviewModeProps {
  workflow: Workflow | null;
  isHistoricalVersion: boolean;
  hasGitChanges: boolean;
  onSwitchToEdit?: () => void;
  /**
   * Switch to Edit mode and focus a specific node on the canvas. Receives
   * the original (un-sanitized) node id.
   */
  onEditNode?: (nodeId: string) => void;
  /**
   * Optional one-shot focus request: when this prop changes (different
   * object identity), Overview scrolls the right pane to the matching
   * section, which in turn drives the Mermaid follow-mode pan. Use a
   * fresh object on every request so repeated requests for the same node
   * still fire.
   */
  focusRequest?: { nodeId: string; key: number } | null;
  /** When non-null, View renders a parse-error banner instead of the panes. */
  parseError?: string | null;
}

export const OverviewMode: React.FC<OverviewModeProps> = (props) => <WorkflowOverview {...props} />;
