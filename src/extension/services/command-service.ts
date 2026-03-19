/**
 * Command Service - File I/O Operations for Claude Code Commands
 *
 * Feature: 636 - Sub-Agent "Use Existing Command" support
 * Purpose: Scan .claude/agents/*.md files for reuse in Sub-Agent nodes
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { CommandReference } from '../../shared/types/messages';
import {
  getInstalledPluginsJsonPath,
  getKnownMarketplacesJsonPath,
  getProjectCommandsDir,
  getUserCommandsDir,
  getWorkspaceRoot,
} from '../utils/path-utils';

/**
 * Extract description from agent file content.
 * Prefers the YAML frontmatter `description:` field.
 * Falls back to the first non-empty line of the body.
 */
function extractDescription(content: string): string {
  // Try YAML frontmatter description
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (fmMatch) {
    const descMatch = fmMatch[1].match(/^description:\s*(.+)$/m);
    if (descMatch) {
      const desc = descMatch[1].trim();
      return desc.length > 100 ? `${desc.substring(0, 97)}...` : desc;
    }
  }

  // Fallback: first non-empty line
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.replace(/^#+\s*/, '').trim();
    if (trimmed.length > 0) {
      return trimmed.length > 100 ? `${trimmed.substring(0, 97)}...` : trimmed;
    }
  }
  return '';
}

/**
 * Scan a commands directory and return available commands
 *
 * @param baseDir - Base directory to scan (e.g., ~/.claude/agents/)
 * @param scope - Command scope ('user' or 'project')
 * @returns Array of command references
 */
export async function scanCommands(
  baseDir: string,
  scope: 'user' | 'project'
): Promise<CommandReference[]> {
  const commands: CommandReference[] = [];

  try {
    const entries = await fs.readdir(baseDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) {
        continue;
      }

      const commandPath = path.join(baseDir, entry.name);
      try {
        const content = await fs.readFile(commandPath, 'utf-8');
        const name = entry.name.replace(/\.md$/, '');

        commands.push({
          name,
          description: extractDescription(content),
          commandPath,
          scope,
          promptContent: content,
        });
      } catch (err) {
        console.warn(`[Command Service] Failed to read ${commandPath}:`, err);
      }
    }
  } catch (_err) {
    // Directory doesn't exist - return empty array
  }

  return commands;
}

// ============================================================================
// Plugin Agent Support
// ============================================================================

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
      projectPath?: string;
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
    agents?: string[];
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
 * Map plugin scope string to CommandReference scope
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
      return 'user';
  }
}

/**
 * Scan agents from a flat directory (agents/{name}.md pattern)
 */
async function scanAgentsDirectory(
  agentsDir: string,
  scope: 'user' | 'project' | 'local',
  commands: CommandReference[],
  pluginName?: string
): Promise<boolean> {
  try {
    const entries = await fs.readdir(agentsDir, { withFileTypes: true });
    let found = false;

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const commandPath = path.join(agentsDir, entry.name);
      try {
        const content = await fs.readFile(commandPath, 'utf-8');
        const name = entry.name.replace(/\.md$/, '');

        // Skip if agent with same name already exists
        if (commands.some((c) => c.name === name && c.pluginName === pluginName)) continue;

        commands.push({
          name,
          description: extractDescription(content),
          commandPath,
          scope,
          promptContent: content,
          pluginName,
        });
        found = true;
      } catch {
        // File read error - skip
      }
    }

    return found;
  } catch {
    // Directory doesn't exist
    return false;
  }
}

/**
 * Scan agents from a specific plugin within a marketplace
 */
async function scanMarketplacePluginAgents(
  marketplaceLocation: string,
  pluginName: string,
  scope: 'user' | 'project' | 'local',
  commands: CommandReference[],
  installPath?: string
): Promise<void> {
  const marketplaceJsonPath = path.join(marketplaceLocation, '.claude-plugin', 'marketplace.json');

  try {
    const marketplaceContent = await fs.readFile(marketplaceJsonPath, 'utf-8');
    const marketplace: MarketplaceConfig = JSON.parse(marketplaceContent);

    // Find the specific plugin in marketplace.json
    const pluginConfig = marketplace.plugins?.find((p) => p.name === pluginName);

    if (pluginConfig?.agents && Array.isArray(pluginConfig.agents)) {
      // Scan agents listed in plugin config (relative paths to .md files)
      for (const agentRelPath of pluginConfig.agents) {
        const agentPath = path.resolve(marketplaceLocation, agentRelPath);

        try {
          const content = await fs.readFile(agentPath, 'utf-8');
          const name = path.basename(agentPath, '.md');

          if (commands.some((c) => c.name === name && c.pluginName === pluginName)) continue;

          commands.push({
            name,
            description: extractDescription(content),
            commandPath: agentPath,
            scope,
            promptContent: content,
            pluginName,
          });
        } catch {
          // Agent file not found or invalid - skip
        }
      }
    } else {
      // Fallback 1: scan default 'agents/' directory in marketplace
      const defaultAgentsDir = path.join(marketplaceLocation, 'agents');
      const foundAgents = await scanAgentsDirectory(defaultAgentsDir, scope, commands, pluginName);

      // Fallback 2: scan 'agents/' directory in plugin installPath
      if (!foundAgents && installPath) {
        const installPathAgentsDir = path.join(installPath, 'agents');
        if (path.normalize(installPathAgentsDir) !== path.normalize(defaultAgentsDir)) {
          await scanAgentsDirectory(installPathAgentsDir, scope, commands, pluginName);
        }
      }
    }
  } catch {
    // No marketplace.json or invalid - skip
  }
}

/**
 * Scan all Plugin Agents using marketplaces path
 *
 * Follows the same pattern as scanPluginSkills() in skill-service.ts.
 * Agents use flat file structure: agents/{name}.md
 */
export async function scanPluginAgents(): Promise<CommandReference[]> {
  const installedPluginsPath = getInstalledPluginsJsonPath();
  const commands: CommandReference[] = [];
  const currentWorkspace = getWorkspaceRoot();

  try {
    const [knownMarketplaces, installedPluginsContent] = await Promise.all([
      loadKnownMarketplaces(),
      fs.readFile(installedPluginsPath, 'utf-8'),
    ]);

    const installedPlugins: InstalledPluginsJson = JSON.parse(installedPluginsContent);

    if (!installedPlugins.plugins) {
      return commands;
    }

    for (const pluginId of Object.keys(installedPlugins.plugins)) {
      const installations = installedPlugins.plugins[pluginId];
      if (!installations || installations.length === 0) continue;

      // Find the best matching installation for current workspace
      let selectedInstallation = installations[0];
      let commandScope = mapPluginScope(selectedInstallation.scope);

      for (const installation of installations) {
        const installScope = mapPluginScope(installation.scope);

        if (installScope === 'project') {
          if (installation.projectPath && currentWorkspace) {
            const normalizedProjectPath = path.normalize(installation.projectPath);
            const normalizedWorkspace = path.normalize(currentWorkspace);

            if (normalizedProjectPath === normalizedWorkspace) {
              selectedInstallation = installation;
              commandScope = 'project';
              break;
            }
          }
          continue;
        }

        if (installScope === 'local' && commandScope === 'user') {
          selectedInstallation = installation;
          commandScope = 'local';
        }
      }

      // Skip project-scoped installations that don't match current workspace
      if (commandScope === 'project' && selectedInstallation.projectPath) {
        if (!currentWorkspace) continue;
        const normalizedProjectPath = path.normalize(selectedInstallation.projectPath);
        const normalizedWorkspace = path.normalize(currentWorkspace);
        if (normalizedProjectPath !== normalizedWorkspace) continue;
      }

      const parsed = parsePluginId(pluginId);
      if (!parsed) continue;

      const marketplace = knownMarketplaces[parsed.marketplaceName];
      if (!marketplace?.installLocation) continue;

      await scanMarketplacePluginAgents(
        marketplace.installLocation,
        parsed.pluginName,
        commandScope,
        commands,
        selectedInstallation.installPath
      );
    }
  } catch (_err) {
    console.warn(
      `[Command Service] Could not read installed_plugins.json: ${installedPluginsPath}`
    );
  }

  return commands;
}

/**
 * Scan all command directories (user + project + plugin) in parallel
 *
 * @returns Object containing user, project, and local (plugin) commands
 */
export async function scanAllCommands(): Promise<{
  user: CommandReference[];
  project: CommandReference[];
  local: CommandReference[];
}> {
  const userDir = getUserCommandsDir();
  const projectDir = getProjectCommandsDir();

  const [user, project, pluginAgents] = await Promise.all([
    scanCommands(userDir, 'user'),
    projectDir ? scanCommands(projectDir, 'project') : Promise.resolve([]),
    scanPluginAgents(),
  ]);

  // Separate plugin agents by their scope
  const local: CommandReference[] = [];
  for (const agent of pluginAgents) {
    if (agent.scope === 'local') {
      local.push(agent);
    } else if (agent.scope === 'user') {
      if (!user.some((c) => c.name === agent.name)) {
        user.push(agent);
      }
    } else if (agent.scope === 'project') {
      if (!project.some((c) => c.name === agent.name)) {
        project.push(agent);
      }
    }
  }

  return { user, project, local };
}
