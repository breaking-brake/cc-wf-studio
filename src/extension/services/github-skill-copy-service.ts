/**
 * GitHub Skill Copy Service
 *
 * Handles copying skills from .github/skills/ to .claude/skills/
 * when exporting workflows for Claude Code execution.
 *
 * Feature: Issue #493 - Part 2
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import * as vscode from 'vscode';
import type { SkillNode, Workflow } from '../../shared/types/workflow-definition';
import { getGithubSkillsDir, getProjectSkillsDir, getWorkspaceRoot } from '../utils/path-utils';

/**
 * Information about a skill that needs to be copied
 */
export interface SkillToCopy {
  /** Skill name (directory name) */
  name: string;
  /** Source path (.github/skills/{name}/) */
  sourcePath: string;
  /** Destination path (.claude/skills/{name}/) */
  destinationPath: string;
  /** Whether this would overwrite an existing skill */
  wouldOverwrite: boolean;
}

/**
 * Result of the skill copy check
 */
export interface SkillCopyCheckResult {
  /** Skills that need to be copied */
  skillsToCopy: SkillToCopy[];
  /** Skills that would overwrite existing files */
  skillsToOverwrite: SkillToCopy[];
  /** Skills that don't need copying (already in .claude or user scope) */
  skippedSkills: string[];
}

/**
 * Result of the skill copy operation
 */
export interface SkillCopyResult {
  success: boolean;
  cancelled?: boolean;
  copiedSkills?: string[];
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
 * Check if a skill path is from .github/skills/ directory
 *
 * @param skillPath - Path to check (relative or absolute)
 * @returns True if the skill is from .github/skills/
 */
function isGithubSkill(skillPath: string): boolean {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = skillPath.replace(/\\/g, '/');
  return normalizedPath.includes('.github/skills/');
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
 * Check which skills need to be copied from .github/skills/ to .claude/skills/
 *
 * @param workflow - Workflow to check
 * @returns Check result with skills to copy and overwrite information
 */
export async function checkSkillsToCopy(workflow: Workflow): Promise<SkillCopyCheckResult> {
  const skillNodes = extractSkillNodes(workflow);
  const workspaceRoot = getWorkspaceRoot();
  const projectSkillsDir = getProjectSkillsDir();
  const githubSkillsDir = getGithubSkillsDir();

  const skillsToCopy: SkillToCopy[] = [];
  const skillsToOverwrite: SkillToCopy[] = [];
  const skippedSkills: string[] = [];
  const processedNames = new Set<string>();

  if (!workspaceRoot || !projectSkillsDir || !githubSkillsDir) {
    // No workspace - skip all
    return { skillsToCopy, skillsToOverwrite, skippedSkills };
  }

  for (const skillNode of skillNodes) {
    const skillPath = skillNode.data.skillPath;
    const skillName = getSkillName(skillPath);

    // Skip duplicates (same skill referenced multiple times)
    if (processedNames.has(skillName)) {
      continue;
    }
    processedNames.add(skillName);

    // Only process skills from .github/skills/
    if (!isGithubSkill(skillPath)) {
      skippedSkills.push(skillName);
      continue;
    }

    // Resolve source path
    const sourcePath = path.join(githubSkillsDir, skillName);
    const destinationPath = path.join(projectSkillsDir, skillName);

    // Check if destination already exists
    let wouldOverwrite = false;
    try {
      await fs.access(destinationPath);
      wouldOverwrite = true;
    } catch {
      // Destination doesn't exist - good
    }

    const skillInfo: SkillToCopy = {
      name: skillName,
      sourcePath,
      destinationPath,
      wouldOverwrite,
    };

    if (wouldOverwrite) {
      skillsToOverwrite.push(skillInfo);
    } else {
      skillsToCopy.push(skillInfo);
    }
  }

  return { skillsToCopy, skillsToOverwrite, skippedSkills };
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
 * Prompt user and copy skills from .github/skills/ to .claude/skills/
 *
 * Shows a confirmation dialog listing skills to copy.
 * If any skills would overwrite existing files, shows a warning.
 *
 * @param workflow - Workflow being exported
 * @returns Copy result
 */
export async function promptAndCopyGithubSkills(workflow: Workflow): Promise<SkillCopyResult> {
  const checkResult = await checkSkillsToCopy(workflow);

  const allSkillsToCopy = [...checkResult.skillsToCopy, ...checkResult.skillsToOverwrite];

  // No skills need copying
  if (allSkillsToCopy.length === 0) {
    return { success: true, copiedSkills: [] };
  }

  // Build message for confirmation dialog
  const skillList = allSkillsToCopy.map((s) => `  • ${s.name}`).join('\n');
  let message = `This workflow uses ${allSkillsToCopy.length} skill(s) from .github/skills/ that need to be copied to .claude/skills/ for Claude Code:\n\n${skillList}`;

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

  // Ensure .claude/skills directory exists
  const projectSkillsDir = getProjectSkillsDir();
  if (!projectSkillsDir) {
    return { success: false, error: 'No workspace folder found' };
  }
  await fs.mkdir(projectSkillsDir, { recursive: true });

  // Copy skills
  const copiedSkills: string[] = [];
  for (const skill of allSkillsToCopy) {
    try {
      // Remove existing directory if overwriting
      if (skill.wouldOverwrite) {
        await fs.rm(skill.destinationPath, { recursive: true, force: true });
      }

      await copySkillDirectory(skill.sourcePath, skill.destinationPath);
      copiedSkills.push(skill.name);
    } catch (err) {
      return {
        success: false,
        error: `Failed to copy skill "${skill.name}": ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  return { success: true, copiedSkills };
}

/**
 * Check if workflow has any skills from .github/skills/
 *
 * @param workflow - Workflow to check
 * @returns True if workflow has skills from .github/skills/
 */
export function hasGithubSkills(workflow: Workflow): boolean {
  const skillNodes = extractSkillNodes(workflow);
  return skillNodes.some((node) => isGithubSkill(node.data.skillPath));
}
