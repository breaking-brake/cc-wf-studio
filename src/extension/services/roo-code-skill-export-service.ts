/**
 * Claude Code Workflow Studio - Roo Code Skill Export Service
 *
 * Handles workflow export to Roo Code Skills format (.roo/skills/name/SKILL.md)
 * Skills format enables Roo Code to execute workflows using :skill command.
 *
 * @beta This is a PoC feature for Roo Code integration
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
 * Roo Code skill export result
 */
export interface RooCodeSkillExportResult {
  success: boolean;
  skillPath: string;
  skillName: string;
  errors?: string[];
}

/**
 * Generate SKILL.md content from workflow for Roo Code
 *
 * @param workflow - Workflow to convert
 * @returns SKILL.md content as string
 */
export function generateRooCodeSkillContent(workflow: Workflow): string {
  const skillName = nodeNameToFileName(workflow.name);

  const description =
    workflow.metadata?.description ||
    `Execute the "${workflow.name}" workflow. This skill guides through a structured workflow with defined steps and decision points.`;

  // Generate YAML frontmatter (Agent Skills specification)
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
  const instructions = generateExecutionInstructions(workflow);

  // Compose SKILL.md body
  const body = `# ${workflow.name}

## Workflow Diagram

${mermaidContent}

## Execution Instructions

${instructions}`;

  return `${frontmatter}\n\n${body}`;
}

/**
 * Check if Roo Code skill already exists
 *
 * @param workflow - Workflow to check
 * @param fileService - File service instance
 * @returns Path to existing skill file, or null if not exists
 */
export async function checkExistingRooCodeSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  const workspacePath = fileService.getWorkspacePath();
  const skillName = nodeNameToFileName(workflow.name);
  const skillPath = path.join(workspacePath, '.roo', 'skills', skillName, 'SKILL.md');

  if (await fileService.fileExists(skillPath)) {
    return skillPath;
  }
  return null;
}

/**
 * Export workflow as Roo Code Skill
 *
 * Exports to .roo/skills/{name}/SKILL.md
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Export result
 */
export async function exportWorkflowAsRooCodeSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<RooCodeSkillExportResult> {
  try {
    const workspacePath = fileService.getWorkspacePath();
    const skillName = nodeNameToFileName(workflow.name);
    const skillDir = path.join(workspacePath, '.roo', 'skills', skillName);
    const skillPath = path.join(skillDir, 'SKILL.md');

    // Ensure directory exists
    await fileService.createDirectory(skillDir);

    // Generate and write SKILL.md content
    const content = generateRooCodeSkillContent(workflow);
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
