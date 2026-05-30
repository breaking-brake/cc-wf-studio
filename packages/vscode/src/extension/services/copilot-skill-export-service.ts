/**
 * Copilot Skill Export — facade over the core planner.
 * See `agent-skill-export-helper.ts` for the I/O implementation.
 */

import type { Workflow } from '@cc-wf-studio/core';
import { generateAgentSkillContent } from '@cc-wf-studio/core';
import {
  type AgentSkillIoResult,
  checkExistingAgentSkill,
  exportWorkflowAsAgentSkill,
} from './agent-skill-export-helper';
import type { FileService } from './file-service';

export type SkillExportResult = AgentSkillIoResult;

export function generateSkillContent(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): string {
  return generateAgentSkillContent(workflow, 'copilot', options);
}

export function checkExistingSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  return checkExistingAgentSkill(workflow, 'copilot', fileService);
}

export function exportWorkflowAsSkill(
  workflow: Workflow,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<SkillExportResult> {
  return exportWorkflowAsAgentSkill(workflow, 'copilot', fileService, options);
}
