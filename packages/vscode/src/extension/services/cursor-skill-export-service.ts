/**
 * Cursor Skill Export — facade over the core planner.
 *
 * Cursor is the only provider that mirrors Sub-Agent + SubAgentFlow files
 * alongside the main SKILL.md. The planner in core handles that; this facade
 * just walks its output via `FileService`.
 */

import type { Workflow } from '@cc-wf-studio/core';
import { generateAgentSkillContent } from '@cc-wf-studio/core';
import {
  type AgentSkillIoResult,
  checkExistingAgentSkill,
  exportWorkflowAsAgentSkill,
} from './agent-skill-export-helper';
import type { FileService } from './file-service';

export type CursorSkillExportResult = AgentSkillIoResult;

export function generateCursorSkillContent(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): string {
  return generateAgentSkillContent(workflow, 'cursor', options);
}

export function checkExistingCursorSkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  return checkExistingAgentSkill(workflow, 'cursor', fileService);
}

export function exportWorkflowAsCursorSkill(
  workflow: Workflow,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<CursorSkillExportResult> {
  return exportWorkflowAsAgentSkill(workflow, 'cursor', fileService, options);
}
