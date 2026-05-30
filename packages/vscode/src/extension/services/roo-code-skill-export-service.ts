/**
 * Roo Code Skill Export — facade over the core planner.
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

export type RooCodeSkillExportResult = AgentSkillIoResult;

export function generateRooCodeSkillContent(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): string {
  return generateAgentSkillContent(workflow, 'roo-code', options);
}

export function checkExistingRooCodeSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  return checkExistingAgentSkill(workflow, 'roo-code', fileService);
}

export function exportWorkflowAsRooCodeSkill(
  workflow: Workflow,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<RooCodeSkillExportResult> {
  return exportWorkflowAsAgentSkill(workflow, 'roo-code', fileService, options);
}
