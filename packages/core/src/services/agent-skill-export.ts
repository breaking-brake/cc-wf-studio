/**
 * Per-agent skill (`SKILL.md`) export.
 *
 * Each non-Claude agent expects the workflow to be expressed as a single
 * `<root>/skills/<skill-name>/SKILL.md` file (Mermaid + execution-instructions
 * Markdown wrapped in YAML frontmatter). Cursor is the only provider that
 * additionally mirrors the workflow's Sub-Agent nodes into `.cursor/agents/`.
 *
 * This module hosts both the pure SKILL.md generator and the unified
 * `planAgentSkillFiles` planner that the VSCode extension and the CLI both
 * consume. Claude Code's own workflow export is handled by
 * `planWorkflowExportFiles` in `./workflow-export.ts`.
 */

import { BUILT_IN_SUB_AGENTS } from '../constants/built-in-sub-agents.js';
import type { SubAgentFlowNode, SubAgentNode, Workflow } from '../types/workflow-definition.js';
import {
  type PlannedExportFile,
  generateSubAgentFile,
  generateSubAgentFlowAgentFile,
  nodeNameToFileName,
} from './workflow-export.js';
import {
  type ExportProvider,
  generateExecutionInstructions,
  generateMermaidFlowchart,
} from './workflow-prompt-generator.js';

/**
 * Supported non-Claude agents. Claude Code uses `planWorkflowExportFiles`
 * (which targets `.claude/agents/` + `.claude/skills/<workflow>.md`).
 */
export type AgentSkillProvider =
  | 'antigravity'
  | 'codex'
  | 'copilot'
  | 'cursor'
  | 'gemini'
  // Targets Zoo Code, the maintained fork of the sunset Roo Code extension.
  // The ID stays 'roo-code' because Zoo Code still reads `.roo/skills/`.
  | 'roo-code';

interface AgentSkillSpec {
  /** Directory the SKILL.md lives under, relative to project root. */
  skillsDir: string;
  /** `ExportProvider` value handed to `generateExecutionInstructions`. */
  exportProvider: ExportProvider;
  /**
   * If set, Sub-Agent + SubAgentFlow files are also emitted under this dir
   * (Cursor is the only provider that does this today).
   */
  agentsDir?: string;
  /**
   * Provider-specific tweaks to `generateExecutionInstructions` options.
   * Cursor passes the parent workflow name + sub-agent flows so its
   * instructions render the inter-agent invocations correctly.
   */
  passSubAgentFlowsToInstructions?: boolean;
}

const AGENT_SKILL_SPECS: Record<AgentSkillProvider, AgentSkillSpec> = {
  antigravity: { skillsDir: '.agent/skills', exportProvider: 'antigravity' },
  codex: { skillsDir: '.codex/skills', exportProvider: 'codex' },
  copilot: { skillsDir: '.github/skills', exportProvider: 'copilot-cli' },
  cursor: {
    skillsDir: '.cursor/skills',
    exportProvider: 'cursor',
    agentsDir: '.cursor/agents',
    passSubAgentFlowsToInstructions: true,
  },
  gemini: { skillsDir: '.gemini/skills', exportProvider: 'gemini' },
  'roo-code': { skillsDir: '.roo/skills', exportProvider: 'roo-code' },
};

export interface AgentSkillExportOptions {
  highlightEnabled?: boolean;
}

/** Default description used when the workflow has no metadata description. */
function defaultSkillDescription(workflow: Workflow): string {
  return `Execute the "${workflow.name}" workflow. This skill guides through a structured workflow with defined steps and decision points.`;
}

/**
 * Generate the `SKILL.md` body for a given non-Claude agent.
 *
 * Identical structure across providers (YAML frontmatter + Mermaid +
 * execution instructions); only the `provider` passed to
 * `generateExecutionInstructions` and a couple of optional flags differ.
 */
export function generateAgentSkillContent(
  workflow: Workflow,
  agent: AgentSkillProvider,
  options?: AgentSkillExportOptions
): string {
  const spec = AGENT_SKILL_SPECS[agent];
  const skillName = nodeNameToFileName(workflow.name);
  const description = workflow.metadata?.description || defaultSkillDescription(workflow);

  const frontmatter = `---
name: ${skillName}
description: ${description}
---`;

  const mermaidContent = generateMermaidFlowchart({
    nodes: workflow.nodes,
    connections: workflow.connections,
  });

  const instructions = generateExecutionInstructions(workflow, {
    provider: spec.exportProvider,
    highlightEnabled: options?.highlightEnabled,
    ...(spec.passSubAgentFlowsToInstructions
      ? { parentWorkflowName: skillName, subAgentFlows: workflow.subAgentFlows }
      : {}),
  });

  const body = `# ${workflow.name}

## Workflow Diagram

${mermaidContent}

## Execution Instructions

${instructions}`;

  return `${frontmatter}\n\n${body}`;
}

/**
 * Return the absolute relative path of the SKILL.md for a given agent + workflow.
 * Exposed so the VSCode extension's "checkExisting<Provider>Skill" helpers can
 * resolve the same path the planner emits.
 */
export function agentSkillFilePath(workflow: Workflow, agent: AgentSkillProvider): string {
  const spec = AGENT_SKILL_SPECS[agent];
  const skillName = nodeNameToFileName(workflow.name);
  return `${spec.skillsDir}/${skillName}/SKILL.md`;
}

/**
 * Plan the file set `ccwf export --agent <agent>` (and the VSCode extension's
 * per-provider export) needs to write.
 *
 * Returned paths use forward slashes and are relative to the project root.
 */
export function planAgentSkillFiles(
  workflow: Workflow,
  agent: AgentSkillProvider,
  options?: AgentSkillExportOptions
): PlannedExportFile[] {
  const spec = AGENT_SKILL_SPECS[agent];
  const planned: PlannedExportFile[] = [];

  // Main SKILL.md
  planned.push({
    relativePath: agentSkillFilePath(workflow, agent),
    contents: generateAgentSkillContent(workflow, agent, options),
    kind: 'subAgentFlow', // closest existing kind label for "workflow-as-skill"
    sourceName: workflow.name,
  });

  // Cursor (and future providers with agentsDir set) mirror Sub-Agent files.
  if (spec.agentsDir) {
    const subAgentNodes = workflow.nodes.filter(
      (n): n is SubAgentNode => n.type === 'subAgent'
    );
    for (const node of subAgentNodes) {
      const preset = node.data.builtInType
        ? BUILT_IN_SUB_AGENTS.find((p) => p.type === node.data.builtInType)
        : undefined;
      const fileName = nodeNameToFileName(node.name);
      planned.push({
        relativePath: `${spec.agentsDir}/${fileName}.md`,
        contents: generateSubAgentFile(node, {
          readonly: preset?.readonly,
          omitModel: node.data.model === 'haiku',
        }),
        kind: 'subAgent',
        sourceName: node.name,
      });
    }

    if (workflow.subAgentFlows && workflow.subAgentFlows.length > 0) {
      const subAgentFlowNodes = workflow.nodes.filter(
        (n): n is SubAgentFlowNode => n.type === 'subAgentFlow'
      );
      const workflowBaseName = nodeNameToFileName(workflow.name);
      for (const flow of workflow.subAgentFlows) {
        const flowFileName = nodeNameToFileName(flow.name);
        const fileName = `${workflowBaseName}_${flowFileName}`;
        const referencingNode = subAgentFlowNodes.find(
          (n) => n.data.subAgentFlowId === flow.id
        );
        planned.push({
          relativePath: `${spec.agentsDir}/${fileName}.md`,
          contents: generateSubAgentFlowAgentFile(flow, fileName, referencingNode, options),
          kind: 'subAgentFlow',
          sourceName: flow.name,
        });
      }
    }
  }

  return planned;
}
