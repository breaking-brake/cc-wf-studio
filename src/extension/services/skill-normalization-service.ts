/**
 * Skill Normalization Service
 *
 * Handles copying skills from non-standard directories (.github/skills/, .codex/skills/, etc.)
 * to .claude/skills/ for Claude Code execution.
 *
 * Background:
 * - Skills are an Anthropic initiative; .claude/skills/ is the standard directory
 * - AI agents (Claude Code, Codex CLI, Copilot CLI) should all read from .claude/skills/
 * - This service ensures compatibility when workflows reference skills from other directories
 *
 * Feature: Refactored from github-skill-copy-service.ts to support multiple source directories
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import * as vscode from 'vscode';
import type { SkillNode, Workflow } from '../../shared/types/workflow-definition';
import { getProjectSkillsDir, getWorkspaceRoot } from '../utils/path-utils';

/**
 * Non-standard skill directory patterns that need normalization
 * These directories are NOT the standard .claude/skills/ location
 *
 * To add a new AI provider's skill directory:
 * 1. Add the pattern here (e.g., '.gemini/skills/')
 * 2. Add the source type to SkillSourceType
 * No changes required in handlers - the service handles it automatically
 */
const NON_STANDARD_SKILL_PATTERNS = [
  '.github/skills/', // GitHub Copilot CLI
  '.codex/skills/', // OpenAI Codex CLI
  // Future: '.gemini/skills/', '.cursor/skills/', etc.
] as const;

/**
 * Source type for skill directories
 */
export type SkillSourceType = 'github' | 'codex' | 'other';

/**
 * Information about a skill that needs to be normalized (copied)
 */
export interface SkillToNormalize {
  /** Skill name (directory name) */
  name: string;
  /** Source path (e.g., .github/skills/{name}/ or .codex/skills/{name}/) */
  sourcePath: string;
  /** Destination path (.claude/skills/{name}/) */
  destinationPath: string;
  /** Original directory type */
  sourceType: SkillSourceType;
  /** Whether this would overwrite an existing skill in .claude/skills/ */
  wouldOverwrite: boolean;
}

/**
 * Result of checking which skills need normalization
 */
export interface SkillNormalizationCheckResult {
  /** Skills that need to be normalized (copied to .claude/skills/) */
  skillsToNormalize: SkillToNormalize[];
  /** Skills that would overwrite existing files in .claude/skills/ */
  skillsToOverwrite: SkillToNormalize[];
  /** Skills skipped (already in .claude/skills/ or user scope) */
  skippedSkills: string[];
}

/**
 * Result of the skill normalization operation
 */
export interface SkillNormalizationResult {
  success: boolean;
  cancelled?: boolean;
  normalizedSkills?: string[];
  error?: string;
}

/**
 * Extract all SkillNode references from a workflow
 *
 * @param workflow - Workflow to extract skill nodes from
 * @returns Array of SkillNode objects
 */
function extractSkillNodes(workflow: Workflow): SkillNode[] {
  const skillNodes: SkillNode[] = [];

  // Extract from main workflow nodes
  for (const node of workflow.nodes) {
    if (node.type === 'skill') {
      skillNodes.push(node as SkillNode);
    }
  }

  // Extract from subAgentFlows if present
  if (workflow.subAgentFlows) {
    for (const subFlow of workflow.subAgentFlows) {
      for (const node of subFlow.nodes) {
        if (node.type === 'skill') {
          skillNodes.push(node as SkillNode);
        }
      }
    }
  }

  return skillNodes;
}

/**
 * Check if a skill path is from a non-standard directory
 *
 * Non-standard directories are any project-level skill directories
 * other than .claude/skills/ (e.g., .github/skills/, .codex/skills/)
 *
 * @param skillPath - Path to check (relative or absolute)
 * @returns True if the skill is from a non-standard directory
 */
export function isNonStandardSkillPath(skillPath: string): boolean {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = skillPath.replace(/\\/g, '/');
  return NON_STANDARD_SKILL_PATTERNS.some((pattern) => normalizedPath.includes(pattern));
}

/**
 * Determine the source type based on skill path
 *
 * @param skillPath - Path to analyze
 * @returns Source type identifier
 */
function getSourceType(skillPath: string): SkillSourceType {
  const normalizedPath = skillPath.replace(/\\/g, '/');

  if (normalizedPath.includes('.github/skills/')) {
    return 'github';
  }
  if (normalizedPath.includes('.codex/skills/')) {
    return 'codex';
  }
  return 'other';
}

/**
 * Get the source directory path for a given source type
 *
 * @param sourceType - Source type
 * @returns Absolute path to the source skills directory, or null if no workspace
 */
function getSourceSkillsDir(sourceType: SkillSourceType): string | null {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }

  switch (sourceType) {
    case 'github':
      return path.join(workspaceRoot, '.github', 'skills');
    case 'codex':
      return path.join(workspaceRoot, '.codex', 'skills');
    default:
      return null;
  }
}

/**
 * Extract skill directory name from a skill path
 *
 * @param skillPath - Path to SKILL.md file
 * @returns Skill directory name (e.g., "my-skill")
 */
function getSkillName(skillPath: string): string {
  // skillPath is like ".github/skills/my-skill/SKILL.md" or absolute path
  const dir = path.dirname(skillPath);
  return path.basename(dir);
}

/**
 * Check which skills need to be normalized (copied from non-.claude/skills/ to .claude/skills/)
 *
 * @param workflow - Workflow to check
 * @returns Check result with skills to normalize and overwrite information
 */
export async function checkSkillsToNormalize(
  workflow: Workflow
): Promise<SkillNormalizationCheckResult> {
  const skillNodes = extractSkillNodes(workflow);
  const workspaceRoot = getWorkspaceRoot();
  const projectSkillsDir = getProjectSkillsDir();

  const skillsToNormalize: SkillToNormalize[] = [];
  const skillsToOverwrite: SkillToNormalize[] = [];
  const skippedSkills: string[] = [];
  const processedNames = new Set<string>();

  if (!workspaceRoot || !projectSkillsDir) {
    // No workspace - skip all
    return { skillsToNormalize, skillsToOverwrite, skippedSkills };
  }

  for (const skillNode of skillNodes) {
    const skillPath = skillNode.data.skillPath;
    const skillName = getSkillName(skillPath);

    // Skip duplicates (same skill referenced multiple times)
    if (processedNames.has(skillName)) {
      continue;
    }
    processedNames.add(skillName);

    // Only process skills from non-standard directories
    if (!isNonStandardSkillPath(skillPath)) {
      skippedSkills.push(skillName);
      continue;
    }

    // Determine source type and directory
    const sourceType = getSourceType(skillPath);
    const sourceSkillsDir = getSourceSkillsDir(sourceType);

    if (!sourceSkillsDir) {
      skippedSkills.push(skillName);
      continue;
    }

    // Resolve source and destination paths
    const sourcePath = path.join(sourceSkillsDir, skillName);
    const destinationPath = path.join(projectSkillsDir, skillName);

    // Check if destination already exists
    let wouldOverwrite = false;
    try {
      await fs.access(destinationPath);
      wouldOverwrite = true;
    } catch {
      // Destination doesn't exist - good
    }

    const skillInfo: SkillToNormalize = {
      name: skillName,
      sourcePath,
      destinationPath,
      sourceType,
      wouldOverwrite,
    };

    if (wouldOverwrite) {
      skillsToOverwrite.push(skillInfo);
    } else {
      skillsToNormalize.push(skillInfo);
    }
  }

  return { skillsToNormalize, skillsToOverwrite, skippedSkills };
}

/**
 * Copy a skill directory from source to destination
 *
 * @param source - Source directory path
 * @param destination - Destination directory path
 */
async function copySkillDirectory(source: string, destination: string): Promise<void> {
  // Create destination directory
  await fs.mkdir(destination, { recursive: true });

  // Read source directory contents
  const entries = await fs.readdir(source, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);

    if (entry.isDirectory()) {
      // Recursively copy subdirectories
      await copySkillDirectory(srcPath, destPath);
    } else {
      // Copy file
      await fs.copyFile(srcPath, destPath);
    }
  }
}

/**
 * Get human-readable source description for display
 *
 * @param skills - Skills to describe
 * @returns Formatted source description
 */
function getSourceDescription(skills: SkillToNormalize[]): string {
  const sources = new Set(skills.map((s) => s.sourceType));
  const descriptions: string[] = [];

  if (sources.has('github')) {
    descriptions.push('.github/skills/');
  }
  if (sources.has('codex')) {
    descriptions.push('.codex/skills/');
  }
  if (sources.has('other')) {
    descriptions.push('non-standard directories');
  }

  return descriptions.join(' and ');
}

/**
 * Prompt user and normalize skills (copy to .claude/skills/)
 *
 * Shows a confirmation dialog listing skills to copy.
 * If any skills would overwrite existing files, shows a warning.
 *
 * @param workflow - Workflow being processed
 * @returns Normalization result
 */
export async function promptAndNormalizeSkills(
  workflow: Workflow
): Promise<SkillNormalizationResult> {
  const checkResult = await checkSkillsToNormalize(workflow);

  const allSkillsToNormalize = [...checkResult.skillsToNormalize, ...checkResult.skillsToOverwrite];

  // No skills need normalization
  if (allSkillsToNormalize.length === 0) {
    return { success: true, normalizedSkills: [] };
  }

  // Build message for confirmation dialog
  const skillList = allSkillsToNormalize.map((s) => `  • ${s.name}`).join('\n');
  const sourceDescription = getSourceDescription(allSkillsToNormalize);

  let message = `This workflow uses ${allSkillsToNormalize.length} skill(s) from ${sourceDescription} that need to be copied to .claude/skills/:\n\n${skillList}`;

  // Add warning for overwrites
  if (checkResult.skillsToOverwrite.length > 0) {
    const overwriteList = checkResult.skillsToOverwrite.map((s) => `  • ${s.name}`).join('\n');
    message += `\n\n⚠️ The following skill(s) will be OVERWRITTEN:\n${overwriteList}`;
  }

  message += '\n\nDo you want to copy these skills?';

  // Show confirmation dialog
  const answer = await vscode.window.showWarningMessage(
    message,
    { modal: true },
    'Copy Skills',
    'Cancel'
  );

  if (answer !== 'Copy Skills') {
    return { success: false, cancelled: true };
  }

  // Execute the normalization
  return normalizeSkillsWithoutPrompt(workflow);
}

/**
 * Normalize skills without prompting (for programmatic use or after user confirmation)
 *
 * @param workflow - Workflow to normalize skills for
 * @returns Normalization result
 */
export async function normalizeSkillsWithoutPrompt(
  workflow: Workflow
): Promise<SkillNormalizationResult> {
  const checkResult = await checkSkillsToNormalize(workflow);

  const allSkillsToNormalize = [...checkResult.skillsToNormalize, ...checkResult.skillsToOverwrite];

  // No skills need normalization
  if (allSkillsToNormalize.length === 0) {
    return { success: true, normalizedSkills: [] };
  }

  // Ensure .claude/skills directory exists
  const projectSkillsDir = getProjectSkillsDir();
  if (!projectSkillsDir) {
    return { success: false, error: 'No workspace folder found' };
  }
  await fs.mkdir(projectSkillsDir, { recursive: true });

  // Copy skills
  const normalizedSkills: string[] = [];
  for (const skill of allSkillsToNormalize) {
    try {
      // Remove existing directory if overwriting
      if (skill.wouldOverwrite) {
        await fs.rm(skill.destinationPath, { recursive: true, force: true });
      }

      await copySkillDirectory(skill.sourcePath, skill.destinationPath);
      normalizedSkills.push(skill.name);
    } catch (err) {
      return {
        success: false,
        error: `Failed to copy skill "${skill.name}": ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { success: true, normalizedSkills };
}

/**
 * Check if workflow has any skills from non-standard directories
 *
 * @param workflow - Workflow to check
 * @returns True if workflow has skills from non-standard directories
 */
export function hasNonStandardSkills(workflow: Workflow): boolean {
  const skillNodes = extractSkillNodes(workflow);
  return skillNodes.some((node) => isNonStandardSkillPath(node.data.skillPath));
}

// ============================================================================
// Backward Compatibility Aliases (deprecated)
// ============================================================================

/**
 * @deprecated Use hasNonStandardSkills() instead
 */
export function hasGithubSkills(workflow: Workflow): boolean {
  return hasNonStandardSkills(workflow);
}

/**
 * @deprecated Use promptAndNormalizeSkills() instead
 */
export async function promptAndCopyGithubSkills(
  workflow: Workflow
): Promise<SkillNormalizationResult> {
  return promptAndNormalizeSkills(workflow);
}

/**
 * @deprecated Use checkSkillsToNormalize() instead
 */
export async function checkSkillsToCopy(
  workflow: Workflow
): Promise<SkillNormalizationCheckResult> {
  return checkSkillsToNormalize(workflow);
}
