/**
 * Cross-Platform Path Utilities for Skill Management
 *
 * Feature: 001-skill-node
 * Purpose: Handle Windows/Unix path differences for Skill directories
 *
 * Based on: specs/001-skill-node/research.md Section 3
 */

import os from 'node:os';
import path from 'node:path';
import * as vscode from 'vscode';

/**
 * Get the personal Skills directory path
 *
 * @returns Absolute path to ~/.claude/skills/
 *
 * @example
 * // Unix: /Users/username/.claude/skills
 * // Windows: C:\Users\username\.claude\skills
 */
export function getPersonalSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills');
}

/**
 * Get the project Skills directory path
 *
 * @returns Absolute path to .claude/skills/ in workspace root, or null if no workspace
 *
 * @example
 * // Unix: /workspace/myproject/.claude/skills
 * // Windows: C:\workspace\myproject\.claude\skills
 */
export function getProjectSkillsDir(): string | null {
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    return null;
  }
  return path.join(workspaceRoot, '.claude', 'skills');
}

/**
 * Resolve a Skill path to absolute path
 *
 * @param skillPath - Skill path (absolute for personal, relative for project)
 * @param scope - Skill scope ('personal' or 'project')
 * @returns Absolute path to SKILL.md file
 * @throws Error if scope is 'project' but no workspace folder exists
 *
 * @example
 * // Personal Skill (already absolute)
 * resolveSkillPath('/Users/alice/.claude/skills/my-skill/SKILL.md', 'personal');
 * // => '/Users/alice/.claude/skills/my-skill/SKILL.md'
 *
 * // Project Skill (relative → absolute)
 * resolveSkillPath('.claude/skills/team-skill/SKILL.md', 'project');
 * // => '/workspace/myproject/.claude/skills/team-skill/SKILL.md'
 */
export function resolveSkillPath(skillPath: string, scope: 'personal' | 'project'): string {
  if (scope === 'personal') {
    // Personal Skills use absolute paths
    return skillPath;
  }

  // Project Skills: convert relative path to absolute
  const projectDir = getProjectSkillsDir();
  if (!projectDir) {
    throw new Error('No workspace folder found for project Skill resolution');
  }

  // If skillPath is already absolute, return as-is (backward compatibility)
  if (path.isAbsolute(skillPath)) {
    return skillPath;
  }

  // Resolve relative path from workspace root
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    throw new Error('No workspace folder found for Skill path resolution');
  }
  return path.resolve(workspaceRoot, skillPath);
}

/**
 * Convert absolute Skill path to relative path (for project Skills)
 *
 * @param absolutePath - Absolute path to SKILL.md file
 * @param scope - Skill scope ('personal' or 'project')
 * @returns Relative path for project Skills, absolute path for personal Skills
 *
 * @example
 * // Project Skill (absolute → relative)
 * toRelativePath('/workspace/myproject/.claude/skills/team-skill/SKILL.md', 'project');
 * // => '.claude/skills/team-skill/SKILL.md'
 *
 * // Personal Skill (keep absolute)
 * toRelativePath('/Users/alice/.claude/skills/my-skill/SKILL.md', 'personal');
 * // => '/Users/alice/.claude/skills/my-skill/SKILL.md'
 */
export function toRelativePath(absolutePath: string, scope: 'personal' | 'project'): string {
  if (scope === 'personal') {
    // Personal Skills always use absolute paths
    return absolutePath;
  }

  // Project Skills: convert to relative path from workspace root
  const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
  if (!workspaceRoot) {
    // No workspace: keep absolute (edge case)
    return absolutePath;
  }

  return path.relative(workspaceRoot, absolutePath);
}
