/**
 * Antigravity Skill Export — facade over the core planner.
 *
 * SKILL.md content generation and the file plan live in
 * `@cc-wf-studio/core` (`planAgentSkillFiles('antigravity', …)`). This module
 * exists only to preserve the existing public API surface for the VSCode
 * extension's command handlers.
 */

import type { Workflow } from '@cc-wf-studio/core';
import { generateAgentSkillContent } from '@cc-wf-studio/core';
import {
  type AgentSkillIoResult,
  checkExistingAgentSkill,
  exportWorkflowAsAgentSkill,
} from './agent-skill-export-helper';
import type { FileService } from './file-service';

export type AntigravitySkillExportResult = AgentSkillIoResult;

export function generateAntigravitySkillContent(
  workflow: Workflow,
  options?: { highlightEnabled?: boolean }
): string {
  return generateAgentSkillContent(workflow, 'antigravity', options);
}

export function checkExistingAntigravitySkill(
  workflow: Workflow,
  fileService: FileService
): Promise<string | null> {
  return checkExistingAgentSkill(workflow, 'antigravity', fileService);
}

export function exportWorkflowAsAntigravitySkill(
  workflow: Workflow,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<AntigravitySkillExportResult> {
  return exportWorkflowAsAgentSkill(workflow, 'antigravity', fileService, options);
}
