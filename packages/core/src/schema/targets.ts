/**
 * Export-target vocabulary for node property scoping (issue #803).
 *
 * A "target" is the AI-agent runtime a workflow is exported to. Each node
 * property declares the targets it applies to (see {@link ./field.js}); the UI
 * scopes fields and exporters derive "ignored by target X" warnings from the
 * same declaration, so they can never drift apart.
 *
 * This is the single canonical vocabulary. The pre-existing `ExportProvider`
 * (workflow-prompt-generator) and `AgentSkillProvider` (agent-skill-export)
 * enums are intentionally left as-is for now; the mapping helpers below
 * reconcile them with this vocabulary at the one place that needs to.
 */

import type { AgentSkillProvider } from '../services/agent-skill-export.js';
import type { ExportProvider } from '../services/workflow-prompt-generator.js';

/** Every AI-agent runtime a workflow can be exported to. */
export const EXPORT_TARGETS = [
  'claudeCode',
  'adk',
  'copilot',
  'copilot-cli',
  'codex',
  'gemini',
  'roo-code',
  'antigravity',
  'cursor',
] as const;

export type ExportTarget = (typeof EXPORT_TARGETS)[number];

/** Sentinel meaning "this field applies to every target". */
export const TARGET_ALL = 'all' as const;

/** A field's target scope: an explicit list, or {@link TARGET_ALL}. */
export type FieldTargets = readonly ExportTarget[] | typeof TARGET_ALL;

/**
 * Map a prompt-generator `ExportProvider` to an {@link ExportTarget}.
 * Only `'claude-code'` differs in spelling; every other value is identical.
 */
export function exportProviderToTarget(provider: ExportProvider): ExportTarget {
  return provider === 'claude-code' ? 'claudeCode' : provider;
}

/**
 * Map an `AgentSkillProvider` to an {@link ExportTarget}. The agent-skill
 * provider ids are already a subset of {@link EXPORT_TARGETS}.
 */
export function agentSkillProviderToTarget(provider: AgentSkillProvider): ExportTarget {
  return provider;
}
