/**
 * Export-warning derivation (issue #803).
 *
 * Exporters call {@link collectIgnoredFieldWarnings} to report node fields
 * that the chosen target silently drops (e.g. SubAgent `model`/`tools`/
 * `memory` when exporting to ADK/Gemini). Derived from the same registry the
 * UI renders from, so the two never disagree.
 *
 * Wiring exporters to this helper is incremental: the ADK exporter plugs in
 * after `feat/export-adk` rebases onto this branch (export-adk is not present
 * on `main`). The core exporters (workflow-export, agent-skill-export,
 * workflow-prompt-generator) can adopt it later via `exportProviderToTarget` /
 * `agentSkillProviderToTarget`.
 */

import { NodeType, type Workflow } from '../types/workflow-definition.js';
import { NODE_PROPERTY_SCHEMAS } from './node-schema-registry.js';
import { getIgnoredFields } from './queries.js';
import type { ExportTarget } from './targets.js';

/** One human-readable warning per set-but-ignored field of every node whose
 *  type has a registered property schema. */
export function collectIgnoredFieldWarnings(workflow: Workflow, target: ExportTarget): string[] {
  const warnings: string[] = [];
  for (const node of workflow.nodes) {
    const schema = NODE_PROPERTY_SCHEMAS[node.type as NodeType];
    if (!schema) {
      continue;
    }
    const data = node.data as unknown as Record<string, unknown>;
    for (const ignored of getIgnoredFields(data, schema, target)) {
      warnings.push(
        `Node "${node.name || node.id}" (${node.type}): field "${ignored.name}" (=${String(ignored.value)}) is ignored when exporting to ${target}.`,
      );
    }
  }
  return warnings;
}

/** @deprecated Use {@link collectIgnoredFieldWarnings}; kept for API
 *  stability. Filters to SubAgent nodes and preserves the legacy message
 *  format. */
export function collectIgnoredSubAgentWarnings(workflow: Workflow, target: ExportTarget): string[] {
  const warnings: string[] = [];
  const schema = NODE_PROPERTY_SCHEMAS[NodeType.SubAgent];
  if (!schema) {
    return warnings;
  }
  for (const node of workflow.nodes) {
    if (node.type !== NodeType.SubAgent) {
      continue;
    }
    const data = node.data as unknown as Record<string, unknown>;
    for (const ignored of getIgnoredFields(data, schema, target)) {
      warnings.push(
        `Sub-Agent "${node.name || node.id}": field "${ignored.name}" (=${String(ignored.value)}) is ignored when exporting to ${target}.`,
      );
    }
  }
  return warnings;
}
