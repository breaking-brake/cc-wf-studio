/**
 * Claude Code Workflow Studio - Cursor Skill Export Service
 *
 * Handles workflow export to Cursor Skills format (.cursor/skills/name/SKILL.md)
 * Cursor reads skills from .cursor/skills/ directory.
 */

import * as path from 'node:path';
import type {
  SubAgentFlowNode,
  SubAgentNode,
  Workflow,
} from '../../shared/types/workflow-definition';
import {
  generateSubAgentFile,
  generateSubAgentFlowAgentFile,
  nodeNameToFileName,
} from './export-service';
import type { FileService } from './file-service';
import {
  generateExecutionInstructions,
  generateMermaidFlowchart,
} from './workflow-prompt-generator';

/**
 * Cursor skill export result
 */
export interface CursorSkillExportResult {
  success: boolean;
  skillPath: string;
  skillName: string;
  errors?: string[];
}

/**
 * Generate SKILL.md content from workflow for Cursor
 *
 * @param workflow - Workflow to convert
 * @returns SKILL.md content as string
 */
export function generateCursorSkillContent(workflow: Workflow): string {
  const skillName = nodeNameToFileName(workflow.name);

  // Generate description from workflow metadata or create default
  const description =
    workflow.metadata?.description ||
    `Execute the "${workflow.name}" workflow. This skill guides through a structured workflow with defined steps and decision points.`;

  // Generate YAML frontmatter
  const frontmatter = `---
name: ${skillName}
description: ${description}
---`;

  // Generate Mermaid flowchart
  const mermaidContent = generateMermaidFlowchart({
    nodes: workflow.nodes,
    connections: workflow.connections,
  });

  // Generate execution instructions
  const instructions = generateExecutionInstructions(workflow, {
    provider: 'cursor',
    parentWorkflowName: nodeNameToFileName(workflow.name),
    subAgentFlows: workflow.subAgentFlows,
  });

  // Compose SKILL.md body
  const body = `# ${workflow.name}

## Workflow Diagram

${mermaidContent}

## Execution Instructions

${instructions}`;

  return `${frontmatter}\n\n${body}`;
}

/**
 * Check if Cursor skill already exists
 *
 * @param workflow - Workflow to check
 * @param fileService - File service instance
 * @returns Path to existing skill file, or null if not exists
 */
export async function checkExistingCursorSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  const workspacePath = fileService.getWorkspacePath();
  const skillName = nodeNameToFileName(workflow.name);
  const skillPath = path.join(workspacePath, '.cursor', 'skills', skillName, 'SKILL.md');

  if (await fileService.fileExists(skillPath)) {
    return skillPath;
  }

  // Check Sub-Agent files in .cursor/agents/
  const agentsDir = path.join(workspacePath, '.cursor', 'agents');
  const subAgentNodes = workflow.nodes.filter((n) => n.type === 'subAgent');
  for (const node of subAgentNodes) {
    const fileName = nodeNameToFileName(node.name);
    const filePath = path.join(agentsDir, `${fileName}.md`);
    if (await fileService.fileExists(filePath)) {
      return filePath;
    }
  }

  // Check SubAgentFlow agent files
  if (workflow.subAgentFlows && workflow.subAgentFlows.length > 0) {
    const workflowBaseName = nodeNameToFileName(workflow.name);
    for (const flow of workflow.subAgentFlows) {
      const flowFileName = nodeNameToFileName(flow.name);
      const fileName = `${workflowBaseName}_${flowFileName}`;
      const filePath = path.join(agentsDir, `${fileName}.md`);
      if (await fileService.fileExists(filePath)) {
        return filePath;
      }
    }
  }

  return null;
}

/**
 * Export workflow as Cursor Skill
 *
 * Exports to .cursor/skills/{name}/SKILL.md
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Export result
 */
export async function exportWorkflowAsCursorSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<CursorSkillExportResult> {
  try {
    const workspacePath = fileService.getWorkspacePath();
    const skillName = nodeNameToFileName(workflow.name);
    const skillDir = path.join(workspacePath, '.cursor', 'skills', skillName);
    const skillPath = path.join(skillDir, 'SKILL.md');

    // Ensure directory exists
    await fileService.createDirectory(skillDir);

    // Generate and write SKILL.md content
    const content = generateCursorSkillContent(workflow);
    await fileService.writeFile(skillPath, content);

    // Export Sub-Agent node files to .cursor/agents/
    const subAgentNodes = workflow.nodes.filter((n) => n.type === 'subAgent') as SubAgentNode[];
    if (subAgentNodes.length > 0 || (workflow.subAgentFlows && workflow.subAgentFlows.length > 0)) {
      const agentsDir = path.join(workspacePath, '.cursor', 'agents');
      await fileService.createDirectory(agentsDir);

      // SubAgent nodes
      for (const node of subAgentNodes) {
        const fileName = nodeNameToFileName(node.name);
        const filePath = path.join(agentsDir, `${fileName}.md`);
        const agentContent = generateSubAgentFile(node);
        await fileService.writeFile(filePath, agentContent);
      }

      // SubAgentFlow nodes
      if (workflow.subAgentFlows && workflow.subAgentFlows.length > 0) {
        const workflowBaseName = nodeNameToFileName(workflow.name);
        const subAgentFlowNodes = workflow.nodes.filter(
          (n) => n.type === 'subAgentFlow'
        ) as SubAgentFlowNode[];

        for (const flow of workflow.subAgentFlows) {
          const flowFileName = nodeNameToFileName(flow.name);
          const fileName = `${workflowBaseName}_${flowFileName}`;
          const filePath = path.join(agentsDir, `${fileName}.md`);
          const referencingNode = subAgentFlowNodes.find((n) => n.data.subAgentFlowId === flow.id);
          const agentContent = generateSubAgentFlowAgentFile(flow, fileName, referencingNode);
          await fileService.writeFile(filePath, agentContent);
        }
      }
    }

    return {
      success: true,
      skillPath,
      skillName,
    };
  } catch (error) {
    return {
      success: false,
      skillPath: '',
      skillName: '',
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
