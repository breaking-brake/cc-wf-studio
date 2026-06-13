/**
 * Export-warning derivation (issue #803).
 *
 * Exporters call {@link collectIgnoredSubAgentWarnings} to report SubAgent
 * fields that the chosen target silently drops (e.g. `model`/`tools`/`memory`
 * when exporting to ADK/Gemini). Derived from the same schema the UI uses, so
 * the two never disagree.
 *
 * Wiring exporters to this helper is incremental: the ADK exporter plugs in
 * after `feat/export-adk` rebases onto this branch (export-adk is not present
 * on `main`). The core exporters (workflow-export, agent-skill-export,
 * workflow-prompt-generator) can adopt it later via `exportProviderToTarget` /
 * `agentSkillProviderToTarget`.
 */

import { NodeType, type Workflow } from '../types/workflow-definition.js';
import { getIgnoredFields } from './queries.js';
import { subAgentPropertySchema } from './sub-agent-schema.js';
import type { ExportTarget } from './targets.js';

/** One human-readable warning per SubAgent field that `target` ignores. */
export function collectIgnoredSubAgentWarnings(workflow: Workflow, target: ExportTarget): string[] {
  const warnings: string[] = [];
  for (const node of workflow.nodes) {
    if (node.type !== NodeType.SubAgent) {
      continue;
    }
    const data = node.data as unknown as Record<string, unknown>;
    for (const ignored of getIgnoredFields(data, subAgentPropertySchema, target)) {
      warnings.push(
        `Sub-Agent "${node.name || node.id}": field "${ignored.name}" (=${String(ignored.value)}) is ignored when exporting to ${target}.`,
      );
    }
  }
  return warnings;
}
