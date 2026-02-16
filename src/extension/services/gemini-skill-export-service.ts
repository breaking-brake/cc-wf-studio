/**
 * Claude Code Workflow Studio - Gemini Skill Export Service
 *
 * Handles workflow export to Google Gemini CLI Skills format (.gemini/skills/name/SKILL.md)
 *
 * @beta This is a PoC feature for Google Gemini CLI integration
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
 * Gemini skill export result
 */
export interface GeminiSkillExportResult {
  success: boolean;
  skillPath: string;
  skillName: string;
  errors?: string[];
}

/**
 * Generate SKILL.md content from workflow for Gemini CLI
 *
 * @param workflow - Workflow to convert
 * @returns SKILL.md content as string
 */
export function generateGeminiSkillContent(workflow: Workflow): string {
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
 * Check if Gemini skill already exists
 *
 * @param workflow - Workflow to check
 * @param fileService - File service instance
 * @returns Path to existing skill file, or null if not exists
 */
export async function checkExistingGeminiSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  const workspacePath = fileService.getWorkspacePath();
  const skillName = nodeNameToFileName(workflow.name);
  const skillPath = path.join(workspacePath, '.gemini', 'skills', skillName, 'SKILL.md');

  if (await fileService.fileExists(skillPath)) {
    return skillPath;
  }
  return null;
}

/**
 * Export workflow as Gemini Skill
 *
 * Exports to .gemini/skills/{name}/SKILL.md
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Export result
 */
export async function exportWorkflowAsGeminiSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<GeminiSkillExportResult> {
  try {
    const workspacePath = fileService.getWorkspacePath();
    const skillName = nodeNameToFileName(workflow.name);
    const skillDir = path.join(workspacePath, '.gemini', 'skills', skillName);
    const skillPath = path.join(skillDir, 'SKILL.md');

    // Ensure directory exists
    await fileService.createDirectory(skillDir);

    // Generate and write SKILL.md content
    const content = generateGeminiSkillContent(workflow);
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
