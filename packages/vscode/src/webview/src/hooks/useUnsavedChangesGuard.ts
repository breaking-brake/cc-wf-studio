/**
 * Claude Code Workflow Studio - Unsaved Changes Guard Hook
 *
 * The canvas is explicit-save (see `ccwf canvas` in
 * packages/cli/src/commands/canvas.ts — there is no auto-save), so closing a
 * browser tab mid-edit used to discard the work without a word. This hook:
 *   - warns via `beforeunload` while the canvas is dirty
 *   - reflects the workflow name plus a dirty marker in `document.title`, so
 *     several open canvas tabs stay distinguishable
 *
 * Both effects are meaningful only in the browser canvas: the VSCode webview
 * never fires `beforeunload` when its panel is disposed, and the editor owns
 * its own tab label — there they are simply inert.
 */

import { useEffect, useSyncExternalStore } from 'react';
import {
  hasUnsavedCanvasChanges,
  subscribeToUnsavedChanges,
  useWorkflowStore,
} from '../stores/workflow-store';

const TITLE_SUFFIX = 'cc-wf-studio';
const DIRTY_MARKER = '● ';

export function useUnsavedChangesGuard(): void {
  const isDirty = useSyncExternalStore(subscribeToUnsavedChanges, hasUnsavedCanvasChanges);
  const workflowName = useWorkflowStore((state) => state.workflowName);

  useEffect(() => {
    if (!isDirty) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      // The browser supplies its own wording; preventDefault (plus the legacy
      // returnValue, still required by older engines) is what triggers it.
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    const name = workflowName || 'workflow';
    document.title = `${isDirty ? DIRTY_MARKER : ''}${name} — ${TITLE_SUFFIX}`;
  }, [isDirty, workflowName]);
}
