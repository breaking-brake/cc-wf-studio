/**
 * Shared internal helper that turns the core planner output into actual
 * filesystem writes through the workspace `FileService`.
 *
 * Each per-provider service (`<provider>-skill-export-service.ts`) is a thin
 * facade around this helper — it just supplies the `AgentSkillProvider` value
 * and returns the provider-specific result shape its callers expect.
 */

import * as path from 'node:path';
import type { AgentSkillProvider, Workflow } from '@cc-wf-studio/core';
import { agentSkillFilePath, planAgentSkillFiles } from '@cc-wf-studio/core';
import type { FileService } from './file-service';

export interface AgentSkillIoResult {
  success: boolean;
  /** Absolute path of the SKILL.md (empty on failure). */
  skillPath: string;
  /** Display name of the workflow (empty on failure). */
  skillName: string;
  errors?: string[];
}

export async function checkExistingAgentSkill(
  workflow: Workflow,
  agent: AgentSkillProvider,
  fileService: FileService
): Promise<string | null> {
  const workspacePath = fileService.getWorkspacePath();
  const skillPath = path.join(workspacePath, ...agentSkillFilePath(workflow, agent).split('/'));
  return (await fileService.fileExists(skillPath)) ? skillPath : null;
}

export async function exportWorkflowAsAgentSkill(
  workflow: Workflow,
  agent: AgentSkillProvider,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<AgentSkillIoResult> {
  try {
    const workspacePath = fileService.getWorkspacePath();
    const plan = planAgentSkillFiles(workflow, agent, options);
    const skillFile = plan[0];
    let skillAbsPath = '';

    const ensuredDirs = new Set<string>();
    for (const planned of plan) {
      const absPath = path.join(workspacePath, ...planned.relativePath.split('/'));
      const dir = path.dirname(absPath);
      if (!ensuredDirs.has(dir)) {
        await fileService.createDirectory(dir);
        ensuredDirs.add(dir);
      }
      await fileService.writeFile(absPath, planned.contents);
      if (planned === skillFile) skillAbsPath = absPath;
    }

    return {
      success: true,
      skillPath: skillAbsPath,
      skillName: skillFile?.sourceName ?? workflow.name,
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
