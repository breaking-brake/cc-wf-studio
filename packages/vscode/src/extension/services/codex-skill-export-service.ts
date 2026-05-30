/**
 * Codex Skill Export — facade over the core planner.
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

export type CodexSkillExportResult = AgentSkillIoResult;

export function generateCodexSkillContent(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): string {
  return generateAgentSkillContent(workflow, 'codex', options);
}

export function checkExistingCodexSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  return checkExistingAgentSkill(workflow, 'codex', fileService);
}

export function exportWorkflowAsCodexSkill(
  workflow: Workflow,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<CodexSkillExportResult> {
  return exportWorkflowAsAgentSkill(workflow, 'codex', fileService, options);
}
