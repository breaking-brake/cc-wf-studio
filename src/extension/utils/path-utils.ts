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
 * Get the user-scope Skills directory path
 *
 * @returns Absolute path to ~/.claude/skills/
 *
 * @example
 * // Unix: /Users/username/.claude/skills
 * // Windows: C:\Users\username\.claude\skills
 */
export function getUserSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills');
}

/**
 * @deprecated Use getUserSkillsDir() instead. Kept for backward compatibility.
 */
export function getPersonalSkillsDir(): string {
  return getUserSkillsDir();
}

/**
 * Get the current workspace root path
 *
 * @returns Absolute path to workspace root, or null if no workspace is open
 *
 * @example
 * // Unix: /workspace/myproject
 * // Windows: C:\workspace\myproject
 */
export function getWorkspaceRoot(): string | null {
  return vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? null;
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
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }
  return path.join(workspaceRoot, '.claude', 'skills');
}

/**
 * Get the GitHub Skills directory path
 *
 * @returns Absolute path to .github/skills/ in workspace root, or null if no workspace
 *
 * @example
 * // Unix: /workspace/myproject/.github/skills
 * // Windows: C:\workspace\myproject\.github\skills
 */
export function getGithubSkillsDir(): string | null {
  const workspaceRoot = getWorkspaceRoot();
  if (!workspaceRoot) {
    return null;
  }
  return path.join(workspaceRoot, '.github', 'skills');
}

/**
 * Get the installed plugins JSON path
 *
 * @returns Absolute path to ~/.claude/plugins/installed_plugins.json
 *
 * @example
 * // Unix: /Users/username/.claude/plugins/installed_plugins.json
 * // Windows: C:\Users\username\.claude\plugins\installed_plugins.json
 */
export function getInstalledPluginsJsonPath(): string {
  return path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
}

/**
 * Get the Claude settings JSON path
 *
 * @returns Absolute path to ~/.claude/settings.json
 *
 * @example
 * // Unix: /Users/username/.claude/settings.json
 * // Windows: C:\Users\username\.claude\settings.json
 */
export function getClaudeSettingsJsonPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

/**
 * Get the known marketplaces JSON path
 *
 * @returns Absolute path to ~/.claude/plugins/known_marketplaces.json
 *
 * @example
 * // Unix: /Users/username/.claude/plugins/known_marketplaces.json
 * // Windows: C:\Users\username\.claude\plugins\known_marketplaces.json
 */
export function getKnownMarketplacesJsonPath(): string {
  return path.join(os.homedir(), '.claude', 'plugins', 'known_marketplaces.json');
}

/**
 * Resolve a Skill path to absolute path
 *
 * @param skillPath - Skill path (absolute for user/local, relative for project)
 * @param scope - Skill scope ('user', 'project', or 'local')
 * @returns Absolute path to SKILL.md file
 * @throws Error if scope is 'project' but no workspace folder exists
 *
 * @example
 * // User Skill (already absolute)
 * resolveSkillPath('/Users/alice/.claude/skills/my-skill/SKILL.md', 'user');
 * // => '/Users/alice/.claude/skills/my-skill/SKILL.md'
 *
 * // Project Skill (relative → absolute)
 * resolveSkillPath('.claude/skills/team-skill/SKILL.md', 'project');
 * // => '/workspace/myproject/.claude/skills/team-skill/SKILL.md'
 *
 * // Local Skill (already absolute, from plugin)
 * resolveSkillPath('/path/to/plugin/skills/my-skill/SKILL.md', 'local');
 * // => '/path/to/plugin/skills/my-skill/SKILL.md'
 */
export function resolveSkillPath(skillPath: string, scope: 'user' | 'project' | 'local'): string {
  if (scope === 'user' || scope === 'local') {
    // User and Local Skills use absolute paths
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
 * @param scope - Skill scope ('user', 'project', or 'local')
 * @returns Relative path for project Skills, absolute path for user/local Skills
 *
 * @example
 * // Project Skill (absolute → relative)
 * toRelativePath('/workspace/myproject/.claude/skills/team-skill/SKILL.md', 'project');
 * // => '.claude/skills/team-skill/SKILL.md'
 *
 * // User Skill (keep absolute)
 * toRelativePath('/Users/alice/.claude/skills/my-skill/SKILL.md', 'user');
 * // => '/Users/alice/.claude/skills/my-skill/SKILL.md'
 *
 * // Local Skill (keep absolute, from plugin)
 * toRelativePath('/path/to/plugin/skills/my-skill/SKILL.md', 'local');
 * // => '/path/to/plugin/skills/my-skill/SKILL.md'
 */
export function toRelativePath(absolutePath: string, scope: 'user' | 'project' | 'local'): string {
  if (scope === 'user' || scope === 'local') {
    // User and Local Skills always use absolute paths
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
