/**
 * Human-readable identity for a workflow node in user-facing messages
 * (validation errors, export warnings).
 */

import type { WorkflowNode } from '../types/workflow-definition.js';

/**
 * Returns the name a user knows a node by: its canvas display label
 * (`data.label`), then its `name`, then its id as the last resort.
 *
 * Tolerates corrupted input — validators call this before `data` has been
 * checked, so a missing or non-object `data` must not throw.
 */
export function getNodeDisplayName(node: WorkflowNode): string {
  const data: unknown = node.data;
  const label =
    typeof data === 'object' && data !== null && !Array.isArray(data)
      ? (data as { label?: unknown }).label
      : undefined;
  const candidate = [label, node.name].find(
    (value): value is string => typeof value === 'string' && value.trim().length > 0
  );
  return (candidate ?? String(node.id)).trim();
}
