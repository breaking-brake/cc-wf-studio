/**
 * Load-time normalization of array-item IDs on node data.
 *
 * askUserQuestion options and branch/ifElse/switch branches carry optional
 * `id` fields used as stable React keys. Older workflow files (and
 * AI-authored ones) may omit them. The webview backfills them ONCE when a
 * workflow is deserialized — replacing the legacy pattern of normalizing
 * during render, which mutated state in the render phase.
 */

import type { BranchCondition, QuestionOption, SwitchCondition } from '../types/workflow-definition.js';

export function generateOptionId(): string {
  return `opt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function generateBranchId(): string {
  return `branch_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/** Fallbacks when an ifElse node arrives without its two branches. English on
 *  purpose: this is a repair path for malformed data, not the localized
 *  defaults used when creating nodes in the UI. */
const IF_ELSE_FALLBACK: readonly BranchCondition[] = [
  { label: 'True', condition: 'If the condition is true' },
  { label: 'False', condition: 'If the condition is false' },
];

function withItemIds<T extends { id?: string }>(
  items: readonly T[],
  generate: () => string,
): { items: T[]; changed: boolean } {
  let changed = false;
  const result = items.map((item) => {
    if (item.id) return item;
    changed = true;
    return { ...item, id: generate() };
  });
  return { items: result, changed };
}

/**
 * Return `data` with array-item IDs backfilled for the given node type, or
 * the same reference when nothing needed fixing. ifElse branches are also
 * normalized to exactly two entries (legacy behavior, previously applied
 * during render).
 */
export function ensureNodeDataItemIds(
  nodeType: string,
  data: Record<string, unknown>,
): Record<string, unknown> {
  if (nodeType === 'askUserQuestion' && Array.isArray(data.options)) {
    const { items, changed } = withItemIds(data.options as QuestionOption[], generateOptionId);
    return changed ? { ...data, options: items } : data;
  }

  if ((nodeType === 'branch' || nodeType === 'switch') && Array.isArray(data.branches)) {
    const { items, changed } = withItemIds(
      data.branches as (BranchCondition | SwitchCondition)[],
      generateBranchId,
    );
    return changed ? { ...data, branches: items } : data;
  }

  if (nodeType === 'ifElse') {
    const raw = Array.isArray(data.branches) ? (data.branches as BranchCondition[]) : [];
    const padded = [raw[0] ?? IF_ELSE_FALLBACK[0], raw[1] ?? IF_ELSE_FALLBACK[1]];
    const { items, changed } = withItemIds(padded, generateBranchId);
    if (changed || raw.length !== 2) {
      return { ...data, branches: items, outputPorts: 2 };
    }
    return data;
  }

  return data;
}
