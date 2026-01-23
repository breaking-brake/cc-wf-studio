/**
 * Skill Service - File I/O Operations for Skills
 *
 * Feature: 001-skill-node
 * Purpose: Scan, validate, and create SKILL.md files
 *
 * Based on: specs/001-skill-node/research.md Section 2
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { CreateSkillPayload, SkillReference } from '../../shared/types/messages';
import {
  getGithubSkillsDir,
  getInstalledPluginsJsonPath,
  getKnownMarketplacesJsonPath,
  getProjectSkillsDir,
  getUserSkillsDir,
  getWorkspaceRoot,
  toRelativePath,
} from '../utils/path-utils';
import { generateSkillFileContent } from './skill-file-generator';
import { parseSkillFrontmatter, type SkillMetadata } from './yaml-parser';

/**
 * Scan a Skills directory and return available Skills
 *
 * @param baseDir - Base directory to scan (e.g., ~/.claude/skills/)
 * @param scope - Skill scope ('user', 'project', or 'local')
 * @param source - Source directory type for project skills ('claude' or 'copilot')
 * @returns Array of Skill references
 *
 * @example
 * ```typescript
 * const userSkills = await scanSkills('/Users/alice/.claude/skills', 'user');
 * // [{ name: 'my-skill', description: '...', scope: 'user', ... }]
 * ```
 */
export async function scanSkills(
  baseDir: string,
  scope: 'user' | 'project' | 'local',
  source?: 'claude' | 'copilot'
): Promise<SkillReference[]> {
  const skills: SkillReference[] = [];

  try {
    const subdirs = await fs.readdir(baseDir, { withFileTypes: true });

    for (const dirent of subdirs) {
      if (!dirent.isDirectory()) {
        continue; // Skip non-directories
      }

      const skillPath = path.join(baseDir, dirent.name, 'SKILL.md');

      try {
        const content = await fs.readFile(skillPath, 'utf-8');
        const metadata = parseSkillFrontmatter(content);

        if (metadata) {
          // Convert to relative path for project Skills (T020)
          const pathToStore = scope === 'project' ? toRelativePath(skillPath, scope) : skillPath;

          skills.push({
            skillPath: pathToStore,
            name: metadata.name,
            description: metadata.description,
            scope,
            validationStatus: 'valid',
            allowedTools: metadata.allowedTools,
            source, // Track source for project skills (claude or github)
          });
        } else {
          // Invalid frontmatter - log and skip
          console.warn(`[Skill Service] Invalid YAML frontmatter in ${skillPath}`);
        }
      } catch (err) {
        // File not found or read error - skip this Skill
        console.warn(`[Skill Service] Failed to read ${skillPath}:`, err);
      }
    }
  } catch (_err) {
    // Directory doesn't exist - return empty array
    console.warn(`[Skill Service] Skill directory not found: ${baseDir}`);
  }

  return skills;
}

/**
 * Structure of ~/.claude/plugins/installed_plugins.json
 */
interface InstalledPluginsJson {
  version?: number;
  plugins?: Record<
    string,
    Array<{
      scope?: string;
      installPath?: string;
      projectPath?: string; // Only for project scope - indicates which project this plugin belongs to
      version?: string;
    }>
  >;
}

/**
 * Structure of ~/.claude/plugins/known_marketplaces.json
 */
interface KnownMarketplaces {
  [marketplaceName: string]: {
    source?: {
      source?: string;
      url?: string;
      repo?: string;
      path?: string;
    };
    installLocation?: string;
  };
}

/**
 * Structure of .claude-plugin/marketplace.json
 */
interface MarketplaceConfig {
  name?: string;
  plugins?: Array<{
    name?: string;
    skills?: string[];
  }>;
}

/**
 * Load known marketplaces from known_marketplaces.json
 */
async function loadKnownMarketplaces(): Promise<KnownMarketplaces> {
  const marketplacesPath = getKnownMarketplacesJsonPath();

  try {
    const content = await fs.readFile(marketplacesPath, 'utf-8');
    return JSON.parse(content) as KnownMarketplaces;
  } catch {
    return {};
  }
}

/**
 * Parse plugin ID to extract plugin name and marketplace name
 * Format: "{plugin-name}@{marketplace-name}"
 */
function parsePluginId(pluginId: string): { pluginName: string; marketplaceName: string } | null {
  const atIndex = pluginId.lastIndexOf('@');
  if (atIndex === -1) return null;

  return {
    pluginName: pluginId.substring(0, atIndex),
    marketplaceName: pluginId.substring(atIndex + 1),
  };
}

/**
 * Map plugin scope string to SkillReference scope
 */
function mapPluginScope(pluginScope: string | undefined): 'user' | 'project' | 'local' {
  switch (pluginScope) {
    case 'user':
      return 'user';
    case 'project':
      return 'project';
    case 'local':
      return 'local';
    default:
      // Default to 'user' if scope is undefined or unknown
      return 'user';
  }
}

/**
 * Scan all Plugin Skills using marketplaces path
 *
 * Uses stable marketplaces path instead of cache path to avoid
 * path invalidation when plugins are updated.
 *
 * Flow:
 * 1. Read installed_plugins.json to get installed plugin IDs
 * 2. Read settings.json to filter enabled plugins
 * 3. Read known_marketplaces.json to get marketplace install locations
 * 4. For each enabled plugin, scan skills from marketplaces path
 * 5. Filter project-scoped plugins by projectPath matching current workspace
 *
 * @returns Array of Plugin Skill references with their installation scope
 */
export async function scanPluginSkills(): Promise<SkillReference[]> {
  const installedPluginsPath = getInstalledPluginsJsonPath();
  const skills: SkillReference[] = [];
  const currentWorkspace = getWorkspaceRoot();

  try {
    // Load configuration files
    // Note: enabledPlugins in settings.json is NOT used to filter plugin skills
    // Plugin presence in installed_plugins.json indicates it's installed and available
    const [knownMarketplaces, installedPluginsContent] = await Promise.all([
      loadKnownMarketplaces(),
      fs.readFile(installedPluginsPath, 'utf-8'),
    ]);

    const installedPlugins: InstalledPluginsJson = JSON.parse(installedPluginsContent);

    if (!installedPlugins.plugins) {
      return skills;
    }

    // Process each installed plugin
    for (const pluginId of Object.keys(installedPlugins.plugins)) {
      // Get the plugin's installations (may have multiple with different scopes)
      const installations = installedPlugins.plugins[pluginId];
      if (!installations || installations.length === 0) continue;

      // Find the best matching installation for current workspace
      // Priority: project (matching projectPath) > local > user
      let selectedInstallation = installations[0];
      let skillScope = mapPluginScope(selectedInstallation.scope);

      for (const installation of installations) {
        const installScope = mapPluginScope(installation.scope);

        // For project-scoped installations, check if projectPath matches current workspace
        if (installScope === 'project') {
          if (installation.projectPath && currentWorkspace) {
            // Normalize paths for comparison
            const normalizedProjectPath = path.normalize(installation.projectPath);
            const normalizedWorkspace = path.normalize(currentWorkspace);

            if (normalizedProjectPath === normalizedWorkspace) {
              // Found a project-scoped installation for this workspace
              selectedInstallation = installation;
              skillScope = 'project';
              break; // Project scope has highest priority
            }
          }
          // Skip project-scoped installations that don't match current workspace
          continue;
        }

        // Prefer local over user
        if (installScope === 'local' && skillScope === 'user') {
          selectedInstallation = installation;
          skillScope = 'local';
        }
      }

      // If the selected installation is project-scoped but doesn't match, skip it
      if (skillScope === 'project' && selectedInstallation.projectPath) {
        if (!currentWorkspace) continue;
        const normalizedProjectPath = path.normalize(selectedInstallation.projectPath);
        const normalizedWorkspace = path.normalize(currentWorkspace);
        if (normalizedProjectPath !== normalizedWorkspace) continue;
      }

      // Parse plugin ID to get marketplace name
      const parsed = parsePluginId(pluginId);
      if (!parsed) continue;

      // Get marketplace install location
      const marketplace = knownMarketplaces[parsed.marketplaceName];
      if (!marketplace?.installLocation) continue;

      // Scan skills from marketplace path
      await scanMarketplacePlugin(
        marketplace.installLocation,
        parsed.pluginName,
        skillScope,
        skills
      );
    }
  } catch (_err) {
    console.warn(`[Skill Service] Could not read installed_plugins.json: ${installedPluginsPath}`);
  }

  return skills;
}

/**
 * Scan skills from a specific plugin within a marketplace
 */
async function scanMarketplacePlugin(
  marketplaceLocation: string,
  pluginName: string,
  scope: 'user' | 'project' | 'local',
  skills: SkillReference[]
): Promise<void> {
  const marketplaceJsonPath = path.join(marketplaceLocation, '.claude-plugin', 'marketplace.json');

  try {
    const marketplaceContent = await fs.readFile(marketplaceJsonPath, 'utf-8');
    const marketplace: MarketplaceConfig = JSON.parse(marketplaceContent);

    // Find the specific plugin in marketplace.json
    const pluginConfig = marketplace.plugins?.find((p) => p.name === pluginName);

    if (pluginConfig?.skills && Array.isArray(pluginConfig.skills)) {
      // Scan skills listed in plugin config
      for (const skillRelPath of pluginConfig.skills) {
        const skillDir = path.resolve(marketplaceLocation, skillRelPath);
        const skillPath = path.join(skillDir, 'SKILL.md');

        try {
          const content = await fs.readFile(skillPath, 'utf-8');
          const metadata = parseSkillFrontmatter(content);

          if (metadata) {
            // Skip if skill with same name already exists (name-based dedup)
            if (skills.some((s) => s.name === metadata.name)) continue;

            skills.push({
              skillPath,
              name: metadata.name,
              description: metadata.description,
              scope,
              validationStatus: 'valid',
              allowedTools: metadata.allowedTools,
            });
          }
        } catch {
          // Skill file not found or invalid - skip
        }
      }
    } else {
      // Fallback: scan default 'skills/' directory
      const defaultSkillsDir = path.join(marketplaceLocation, 'skills');
      try {
        const skillDirs = await fs.readdir(defaultSkillsDir, { withFileTypes: true });
        for (const skillDir of skillDirs) {
          if (!skillDir.isDirectory()) continue;

          const skillPath = path.join(defaultSkillsDir, skillDir.name, 'SKILL.md');

          try {
            const content = await fs.readFile(skillPath, 'utf-8');
            const metadata = parseSkillFrontmatter(content);

            if (metadata) {
              if (skills.some((s) => s.name === metadata.name)) continue;

              skills.push({
                skillPath,
                name: metadata.name,
                description: metadata.description,
                scope,
                validationStatus: 'valid',
                allowedTools: metadata.allowedTools,
              });
            }
          } catch {
            // Skill file not found or invalid - skip
          }
        }
      } catch {
        // No default skills directory
      }
    }
  } catch {
    // No marketplace.json or invalid - skip
  }
}

/**
 * Scan user, project, and plugin Skills
 *
 * Scans skills from multiple directories:
 * - User: ~/.claude/skills/
 * - Project: .claude/skills/ (source: 'claude')
 * - Project (alternative): .github/skills/ (source: 'copilot')
 * - Local: Plugin-provided skills
 *
 * Note: Same-named skills from both .claude/skills/ and .github/skills/
 * are both included (no deduplication) so users can see all available skills.
 *
 * @returns Object containing user, project, and local Skills
 */
export async function scanAllSkills(): Promise<{
  user: SkillReference[];
  project: SkillReference[];
  local: SkillReference[];
}> {
  const userDir = getUserSkillsDir();
  const projectDir = getProjectSkillsDir();
  const githubDir = getGithubSkillsDir();

  const [user, claudeProjectSkills, githubProjectSkills, pluginSkills] = await Promise.all([
    scanSkills(userDir, 'user'),
    projectDir ? scanSkills(projectDir, 'project', 'claude') : Promise.resolve([]),
    githubDir ? scanSkills(githubDir, 'project', 'copilot') : Promise.resolve([]),
    scanPluginSkills(),
  ]);

  // Merge project skills: include both .claude/skills/ and .github/skills/
  // (no deduplication - show both even if same-named)
  const project: SkillReference[] = [...claudeProjectSkills, ...githubProjectSkills];

  // Separate plugin skills by their scope
  const local: SkillReference[] = [];
  for (const skill of pluginSkills) {
    if (skill.scope === 'local') {
      local.push(skill);
    } else if (skill.scope === 'user') {
      // Add to user skills, but avoid duplicates by name
      if (!user.some((s) => s.name === skill.name)) {
        user.push(skill);
      }
    } else if (skill.scope === 'project') {
      // Add to project skills, but avoid duplicates by name
      if (!project.some((s) => s.name === skill.name)) {
        project.push(skill);
      }
    }
  }

  return { user, project, local };
}

/**
 * Validate a SKILL.md file and return metadata
 *
 * @param skillPath - Absolute path to SKILL.md file
 * @returns Skill metadata
 * @throws Error if file not found or invalid frontmatter
 */
export async function validateSkillFile(skillPath: string): Promise<SkillMetadata> {
  try {
    const content = await fs.readFile(skillPath, 'utf-8');
    const metadata = parseSkillFrontmatter(content);

    if (!metadata) {
      throw new Error(
        'Invalid SKILL.md frontmatter: missing required fields (name or description)'
      );
    }

    return metadata;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new Error(`SKILL.md file not found at ${skillPath}`);
    }
    throw err;
  }
}

/**
 * Create a new Skill
 *
 * @param payload - Skill creation payload
 * @returns Absolute path to created SKILL.md file
 * @throws Error if validation fails or file write fails
 *
 * Implementation: T024-T025
 */
export async function createSkill(payload: CreateSkillPayload): Promise<string> {
  // 1. Get base directory for scope
  const baseDir = payload.scope === 'user' ? getUserSkillsDir() : getProjectSkillsDir();

  if (!baseDir) {
    throw new Error('No workspace folder is open. Cannot create project Skill.');
  }

  // 2. Check for name collision
  const skillDir = path.join(baseDir, payload.name);
  const skillPath = path.join(skillDir, 'SKILL.md');

  try {
    await fs.access(skillDir);
    // Directory exists - name collision
    throw new Error(
      `A Skill with the name "${payload.name}" already exists in ${baseDir}. Choose a different name.`
    );
  } catch (err) {
    // Directory doesn't exist - this is what we want (continue)
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      // Some other error occurred
      throw err;
    }
  }

  // 3. Create directory
  await fs.mkdir(skillDir, { recursive: true });

  // 4. Generate and write SKILL.md content
  const content = generateSkillFileContent(payload);

  try {
    await fs.writeFile(skillPath, content, 'utf-8');
  } catch (err) {
    // Clean up directory if file write fails
    try {
      await fs.rm(skillDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
    throw new Error(
      `Failed to create SKILL.md file: ${err instanceof Error ? err.message : String(err)}`
    );
  }

  // 5. Return absolute path
  return skillPath;
}
