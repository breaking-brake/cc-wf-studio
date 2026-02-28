import os from 'node:os';
import path from 'node:path';

export function getUserSkillsDir(): string {
  return path.join(os.homedir(), '.claude', 'skills');
}

/** @deprecated Use getUserSkillsDir() instead. */
export function getPersonalSkillsDir(): string {
  return getUserSkillsDir();
}

export function getProjectSkillsDirFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.claude', 'skills');
}

export function getGithubSkillsDirFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.github', 'skills');
}

export function getCopilotUserSkillsDir(): string {
  return path.join(os.homedir(), '.copilot', 'skills');
}

export function getCodexUserSkillsDir(): string {
  return path.join(os.homedir(), '.codex', 'skills');
}

export function getCodexProjectSkillsDirFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.codex', 'skills');
}

export function getRooUserSkillsDir(): string {
  return path.join(os.homedir(), '.roo', 'skills');
}

export function getRooProjectSkillsDirFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.roo', 'skills');
}

export function getGeminiUserSkillsDir(): string {
  return path.join(os.homedir(), '.gemini', 'skills');
}

export function getGeminiProjectSkillsDirFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.gemini', 'skills');
}

export function getAntigravityUserSkillsDir(): string {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'skills');
}

export function getAntigravityProjectSkillsDirFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.agent', 'skills');
}

export function getCursorUserSkillsDir(): string {
  return path.join(os.homedir(), '.cursor', 'skills');
}

export function getCursorProjectSkillsDirFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.cursor', 'skills');
}

// MCP Configuration Paths

export function getCopilotUserMcpConfigPath(): string {
  return path.join(os.homedir(), '.copilot', 'mcp-config.json');
}

export function getVSCodeMcpConfigPathFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.vscode', 'mcp.json');
}

export function getCodexUserMcpConfigPath(): string {
  return path.join(os.homedir(), '.codex', 'config.toml');
}

export function getGeminiUserMcpConfigPath(): string {
  return path.join(os.homedir(), '.gemini', 'settings.json');
}

export function getGeminiProjectMcpConfigPathFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.gemini', 'settings.json');
}

export function getAntigravityUserMcpConfigPath(): string {
  return path.join(os.homedir(), '.gemini', 'antigravity', 'mcp_config.json');
}

export function getCursorUserMcpConfigPath(): string {
  return path.join(os.homedir(), '.cursor', 'mcp.json');
}

export function getRooProjectMcpConfigPathFromRoot(workspaceRoot: string): string {
  return path.join(workspaceRoot, '.roo', 'mcp.json');
}

export function getInstalledPluginsJsonPath(): string {
  return path.join(os.homedir(), '.claude', 'plugins', 'installed_plugins.json');
}

export function getClaudeSettingsJsonPath(): string {
  return path.join(os.homedir(), '.claude', 'settings.json');
}

export function getKnownMarketplacesJsonPath(): string {
  return path.join(os.homedir(), '.claude', 'plugins', 'known_marketplaces.json');
}

export function resolveSkillPathWithRoot(
  skillPath: string,
  scope: 'user' | 'project' | 'local',
  workspaceRoot?: string
): string {
  if (scope === 'user' || scope === 'local') {
    return skillPath;
  }
  if (!workspaceRoot) {
    throw new Error('No workspace folder found for project Skill resolution');
  }
  if (path.isAbsolute(skillPath)) {
    return skillPath;
  }
  return path.resolve(workspaceRoot, skillPath);
}

export function toRelativePathWithRoot(
  absolutePath: string,
  scope: 'user' | 'project' | 'local',
  workspaceRoot?: string
): string {
  if (scope === 'user' || scope === 'local') {
    return absolutePath;
  }
  if (!workspaceRoot) {
    return absolutePath;
  }
  return path.relative(workspaceRoot, absolutePath);
}
