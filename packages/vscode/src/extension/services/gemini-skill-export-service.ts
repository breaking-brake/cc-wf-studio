/**
 * Gemini Skill Export — facade over the core planner.
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

export type GeminiSkillExportResult = AgentSkillIoResult;

export function generateGeminiSkillContent(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): string {
  return generateAgentSkillContent(workflow, 'gemini', options);
}

export function checkExistingGeminiSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  return checkExistingAgentSkill(workflow, 'gemini', fileService);
}

export function exportWorkflowAsGeminiSkill(
  workflow: Workflow,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<GeminiSkillExportResult> {
  return exportWorkflowAsAgentSkill(workflow, 'gemini', fileService, options);
}
