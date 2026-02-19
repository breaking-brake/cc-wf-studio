/**
 * Claude Code Workflow Studio - Copilot Skill Export Service
 *
 * Handles workflow export to GitHub Copilot Skills format (.github/skills/name/SKILL.md)
 * Skills format enables Copilot CLI to execute workflows as slash commands.
 */

import * as path from 'node:path';
import type { Workflow } from '../../shared/types/workflow-definition';
import { nodeNameToFileName } from './export-service';
import type { FileService } from './file-service';
import {
  generateExecutionInstructions,
  generateMermaidFlowchart,
} from './workflow-prompt-generator';

/**
 * Skill export result
 */
export interface SkillExportResult {
  success: boolean;
  skillPath: string;
  skillName: string;
  errors?: string[];
}

/**
 * Generate SKILL.md content from workflow
 *
 * @param workflow - Workflow to convert
 * @returns SKILL.md content as string
 */
export function generateSkillContent(workflow: Workflow): string {
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
    provider: 'copilot-cli',
  });

  // Compose SKILL.md body
  // Note: mermaidContent already includes ```mermaid and ``` wrapper
  const body = `# ${workflow.name}

## Workflow Diagram

${mermaidContent}

## Execution Instructions

${instructions}`;

  return `${frontmatter}\n\n${body}`;
}

/**
 * Check if skill already exists
 *
 * @param workflow - Workflow to check
 * @param fileService - File service instance
 * @returns Path to existing skill file, or null if not exists
 */
export async function checkExistingSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  const workspacePath = fileService.getWorkspacePath();
  const skillName = nodeNameToFileName(workflow.name);
  const skillPath = path.join(workspacePath, '.github', 'skills', skillName, 'SKILL.md');

  if (await fileService.fileExists(skillPath)) {
    return skillPath;
  }
  return null;
}

/**
 * Export workflow as Copilot Skill
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Export result
 */
export async function exportWorkflowAsSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<SkillExportResult> {
  try {
    const workspacePath = fileService.getWorkspacePath();
    const skillName = nodeNameToFileName(workflow.name);
    const skillDir = path.join(workspacePath, '.github', 'skills', skillName);
    const skillPath = path.join(skillDir, 'SKILL.md');

    // Ensure directory exists
    await fileService.createDirectory(skillDir);

    // Generate and write SKILL.md content
    const content = generateSkillContent(workflow);
    await fileService.writeFile(skillPath, content);

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
