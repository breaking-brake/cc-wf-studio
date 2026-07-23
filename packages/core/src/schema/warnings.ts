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

import type { AgentSkillProvider } from '../services/agent-skill-export.js';
import { NodeType, type Workflow } from '../types/workflow-definition.js';
import { describeClaudeCodeOnlyNodes } from './claude-code-only.js';
import { NODE_PROPERTY_SCHEMAS } from './node-schema-registry.js';
import { getIgnoredFields } from './queries.js';
import { type ExportTarget, agentSkillProviderToTarget } from './targets.js';

/**
 * Agent names a workflow can be preflighted/exported for: Claude Code plus
 * every {@link AgentSkillProvider}. This is the user-facing vocabulary used
 * by `ccwf export --agent` / `ccwf validate --agent` and the MCP
 * `validate_workflow` tool.
 */
export const WORKFLOW_TARGET_AGENTS = [
  'claude-code',
  'antigravity',
  'codex',
  'copilot',
  'cursor',
  'gemini',
  'roo-code',
] as const;

export type WorkflowTargetAgent = (typeof WORKFLOW_TARGET_AGENTS)[number];

/**
 * Target-compatibility warnings for exporting `workflow` to `agent`:
 * Claude Code-only nodes the agent cannot execute, plus every configured
 * node field the target ignores. Callers should only pass schema-valid
 * workflows — malformed node data would produce garbage reports.
 */
export function collectAgentCompatibilityWarnings(
  workflow: Workflow,
  agent: WorkflowTargetAgent
): string[] {
  const warnings: string[] = [];
  const claudeOnlyNodes = describeClaudeCodeOnlyNodes(workflow);
  if (agent !== 'claude-code' && claudeOnlyNodes.length > 0) {
    warnings.push(
      `this workflow contains Claude Code-only node(s) that ${agent} cannot execute: ${claudeOnlyNodes.join(', ')}.`
    );
  }
  const target: ExportTarget =
    agent === 'claude-code'
      ? 'claudeCode'
      : agentSkillProviderToTarget(agent satisfies AgentSkillProvider);
  warnings.push(...collectIgnoredFieldWarnings(workflow, target));
  return warnings;
}

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
