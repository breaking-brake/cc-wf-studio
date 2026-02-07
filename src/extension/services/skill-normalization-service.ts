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
  '.copilot/skills/', // GitHub Copilot CLI (alternative)
  '.codex/skills/', // OpenAI Codex CLI
  '.roo/skills/', // Roo Code
  // Future: '.gemini/skills/', '.cursor/skills/', etc.
] as const;

/**
 * Source type for skill directories
 */
export type SkillSourceType = 'github' | 'copilot' | 'codex' | 'roo-code' | 'other';

/**
 * Target CLI for workflow execution
 *
 * Each CLI has its own "native" skill directory that should be considered standard:
 * - 'claude': Only .claude/skills/ is standard (default for export/Claude Code)
 * - 'copilot': .claude/skills/, .github/skills/, AND .copilot/skills/ are standard
 * - 'codex': .claude/skills/ AND .codex/skills/ are standard
 */
export type TargetCli = 'claude' | 'copilot' | 'codex' | 'roo-code';

/**
 * Get the list of skill directory patterns that are considered "standard" for a given CLI
 *
 * @param targetCli - Target CLI for execution
 * @returns Array of directory patterns that are standard for this CLI
 */
function getStandardSkillPatterns(targetCli: TargetCli): string[] {
  // .claude/skills/ is always standard for all CLIs
  const patterns = ['.claude/skills/'];

  switch (targetCli) {
    case 'copilot':
      // Copilot CLI considers .github/skills/ and .copilot/skills/ as native
      patterns.push('.github/skills/', '.copilot/skills/');
      break;
    case 'codex':
      // Codex CLI considers .codex/skills/ as native
      patterns.push('.codex/skills/');
      break;
    case 'roo-code':
      // Roo Code considers .roo/skills/ as native
      patterns.push('.roo/skills/');
      break;
    // case 'claude' falls through to default
    // Claude Code only uses .claude/skills/
  }

  return patterns;
}

/**
 * Check if a skill path is from a standard directory for the given target CLI
 *
 * @param skillPath - Path to check (relative or absolute)
 * @param targetCli - Target CLI for execution
 * @returns True if the skill is from a standard directory for this CLI
 */
function isSkillFromStandardDir(skillPath: string, targetCli: TargetCli): boolean {
  const normalizedPath = skillPath.replace(/\\/g, '/');
  const standardPatterns = getStandardSkillPatterns(targetCli);

  return standardPatterns.some((pattern) => normalizedPath.includes(pattern));
}

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
  if (normalizedPath.includes('.copilot/skills/')) {
    return 'copilot';
  }
  if (normalizedPath.includes('.codex/skills/')) {
    return 'codex';
  }
  if (normalizedPath.includes('.roo/skills/')) {
    return 'roo-code';
  }
  return 'other';
}

/**
 * Get the source directory path for a given source type
 *
 * NOTE: Currently unused. Kept for potential future use.
 * This function only supports project-scope paths, not user-scope paths (~/.copilot/skills/).
 * For user-scope skills, use path.dirname(skillPath) directly.
 *
 * @param sourceType - Source type
 * @returns Absolute path to the source skills directory, or null if no workspace
 */
function _getSourceSkillsDir(sourceType: SkillSourceType): string | null {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }

  switch (sourceType) {
    case 'github':
      return path.join(workspaceRoot, '.github', 'skills');
    case 'copilot':
      return path.join(workspaceRoot, '.copilot', 'skills');
    case 'codex':
      return path.join(workspaceRoot, '.codex', 'skills');
    case 'roo-code':
      return path.join(workspaceRoot, '.roo', 'skills');
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
 * Check which skills need to be normalized (copied from non-standard directories to .claude/skills/)
 *
 * @param workflow - Workflow to check
 * @param targetCli - Target CLI for execution (default: 'claude')
 * @returns Check result with skills to normalize and overwrite information
 */
export async function checkSkillsToNormalize(
  workflow: Workflow,
  targetCli: TargetCli = 'claude'
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

    // Skip skills from standard directories for the target CLI
    if (isSkillFromStandardDir(skillPath, targetCli)) {
      skippedSkills.push(skillName);
      continue;
    }

    // Determine source type for metadata
    const sourceType = getSourceType(skillPath);

    // Use the actual skill directory from skillPath
    // path.resolve() handles both absolute paths (user-scope: ~/.copilot/skills/) and
    // relative paths (project-scope: .github/skills/) by resolving against workspaceRoot
    const sourcePath = path.resolve(workspaceRoot, path.dirname(skillPath));
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
  if (sources.has('roo-code')) {
    descriptions.push('.roo/skills/');
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
 * @param targetCli - Target CLI for execution (default: 'claude')
 * @returns Normalization result
 */
export async function promptAndNormalizeSkills(
  workflow: Workflow,
  targetCli: TargetCli = 'claude'
): Promise<SkillNormalizationResult> {
  const checkResult = await checkSkillsToNormalize(workflow, targetCli);

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
  return normalizeSkillsWithoutPrompt(workflow, targetCli);
}

/**
 * Normalize skills without prompting (for programmatic use or after user confirmation)
 *
 * @param workflow - Workflow to normalize skills for
 * @param targetCli - Target CLI for execution (default: 'claude')
 * @returns Normalization result
 */
export async function normalizeSkillsWithoutPrompt(
  workflow: Workflow,
  targetCli: TargetCli = 'claude'
): Promise<SkillNormalizationResult> {
  const checkResult = await checkSkillsToNormalize(workflow, targetCli);

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
 * Check if workflow has any skills from non-standard directories for the target CLI
 *
 * @param workflow - Workflow to check
 * @param targetCli - Target CLI for execution (default: 'claude')
 * @returns True if workflow has skills from non-standard directories for this CLI
 */
export function hasNonStandardSkills(workflow: Workflow, targetCli: TargetCli = 'claude'): boolean {
  const skillNodes = extractSkillNodes(workflow);
  return skillNodes.some((node) => !isSkillFromStandardDir(node.data.skillPath, targetCli));
}

// ============================================================================
// Backward Compatibility Aliases (deprecated)
// ============================================================================

/**
 * @deprecated Use hasNonStandardSkills() instead
 */
export function hasGithubSkills(workflow: Workflow, targetCli: TargetCli = 'claude'): boolean {
  return hasNonStandardSkills(workflow, targetCli);
}

/**
 * @deprecated Use promptAndNormalizeSkills() instead
 */
export async function promptAndCopyGithubSkills(
  workflow: Workflow,
  targetCli: TargetCli = 'claude'
): Promise<SkillNormalizationResult> {
  return promptAndNormalizeSkills(workflow, targetCli);
}

/**
 * @deprecated Use checkSkillsToNormalize() instead
 */
export async function checkSkillsToCopy(
  workflow: Workflow,
  targetCli: TargetCli = 'claude'
): Promise<SkillNormalizationCheckResult> {
  return checkSkillsToNormalize(workflow, targetCli);
}
