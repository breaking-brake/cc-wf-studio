/**
 * MCP Configuration Reader Service
 *
 * Feature: 001-mcp-node
 * Purpose: Read MCP server configurations from multiple AI coding tools
 *
 * This service reads MCP server configurations from multiple sources:
 *
 * Claude Code:
 * - <workspace>/.mcp.json (project-level)
 * - ~/.mcp.json (user-level)
 * - ~/.claude.json → projects[workspace].mcpServers (legacy, project-level)
 * - ~/.claude.json → mcpServers (legacy, user-level)
 *
 * VSCode Copilot:
 * - <workspace>/.vscode/mcp.json (project-level, uses 'servers' key)
 *
 * Copilot CLI:
 * - <workspace>/.copilot/mcp-config.json (project-level)
 * - ~/.copilot/mcp-config.json (user-level)
 *
 * Codex CLI:
 * - ~/.codex/config.toml (user-level, TOML format with [mcp_servers.*] sections)
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { parse as parseToml } from 'smol-toml';
import type { McpConfigSource } from '../../shared/types/mcp-node';
import { log } from '../extension';
import {
  getCodexUserMcpConfigPath,
  getCopilotUserMcpConfigPath,
  getVSCodeMcpConfigPath,
} from '../utils/path-utils';

/**
 * MCP server configuration from .claude.json
 */
export interface McpServerConfig {
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  /** Source provider (tracked during reading, defaults to 'claude') */
  source?: McpConfigSource;
}

/**
 * Get the path to legacy .claude.json
 *
 * @returns Absolute path to .claude.json
 */
function getLegacyClaudeConfigPath(): string {
  return path.join(os.homedir(), '.claude.json');
}

/**
 * Get the path to project-scope .mcp.json
 *
 * @param workspacePath - Workspace directory path
 * @returns Absolute path to <workspace>/.mcp.json
 */
function getProjectMcpConfigPath(workspacePath: string): string {
  return path.join(workspacePath, '.mcp.json');
}

/**
 * Get the path to user-level ~/.mcp.json
 *
 * @returns Absolute path to ~/.mcp.json
 */
function getUserMcpConfigPath(): string {
  return path.join(os.homedir(), '.mcp.json');
}

/**
 * Read legacy .claude.json file
 *
 * @returns Parsed configuration object or null if not found
 */
function readLegacyClaudeConfig(): {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
} | null {
  const configPath = getLegacyClaudeConfigPath();

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log('WARN', 'Failed to read legacy .claude.json', {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Normalize MCP server configuration by inferring missing type field
 *
 * @param config - Raw server configuration from file
 * @returns Normalized configuration with type field
 */
function normalizeServerConfig(config: Partial<McpServerConfig>): McpServerConfig | null {
  // If type is already specified, use it as-is
  if (config.type) {
    return config as McpServerConfig;
  }

  // Infer type from available fields
  // Rule 1: If command exists, assume stdio transport
  if (config.command) {
    return {
      ...config,
      type: 'stdio',
    } as McpServerConfig;
  }

  // Rule 2: If url exists, cannot infer (http or sse?)
  if (config.url) {
    log('WARN', 'Cannot infer MCP server type from url field', {
      url: config.url,
    });
    return null;
  }

  // No type and no command/url - invalid configuration
  return null;
}

/**
 * Read mcp.json file (Claude Code format)
 *
 * @param configPath - Path to mcp.json
 * @returns MCP servers configuration or null if not found
 */
function readMcpConfig(configPath: string): {
  mcpServers?: Record<string, McpServerConfig>;
} | null {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    log('INFO', 'Successfully read .mcp.json', {
      configPath,
      serverCount: parsed.mcpServers ? Object.keys(parsed.mcpServers).length : 0,
    });

    return parsed;
  } catch (error) {
    // File not found is expected (not all projects have .mcp.json)
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    log('WARN', 'Failed to read .mcp.json', {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Read Copilot MCP config (.copilot/mcp-config.json)
 *
 * Format: { "mcpServers": { ... } }
 *
 * @param configPath - Path to mcp-config.json
 * @returns MCP servers configuration or null if not found
 */
function readCopilotMcpConfig(configPath: string): Record<string, McpServerConfig> | null {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    // Copilot CLI uses same format as Claude Code (mcpServers key)
    const servers = parsed.mcpServers as Record<string, McpServerConfig> | undefined;

    if (servers) {
      log('INFO', 'Successfully read Copilot mcp-config.json', {
        configPath,
        serverCount: Object.keys(servers).length,
      });
      return servers;
    }

    return null;
  } catch (error) {
    // File not found is expected
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    log('WARN', 'Failed to read Copilot mcp-config.json', {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Read VSCode Copilot MCP config (.vscode/mcp.json)
 *
 * Format: { "servers": { ... } }
 * Note: VSCode Copilot uses 'servers' key, not 'mcpServers'
 *
 * @param configPath - Path to .vscode/mcp.json
 * @returns MCP servers configuration (normalized to mcpServers format) or null if not found
 */
function readVSCodeMcpConfig(configPath: string): Record<string, McpServerConfig> | null {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    // VSCode Copilot uses 'servers' key instead of 'mcpServers'
    const servers = parsed.servers as Record<string, McpServerConfig> | undefined;

    if (servers) {
      log('INFO', 'Successfully read VSCode mcp.json', {
        configPath,
        serverCount: Object.keys(servers).length,
      });
      return servers;
    }

    return null;
  } catch (error) {
    // File not found is expected
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    log('WARN', 'Failed to read VSCode mcp.json', {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Codex TOML config structure for mcp_servers section
 */
interface CodexMcpServerTomlConfig {
  enabled?: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  type?: 'stdio' | 'http' | 'sse';
  url?: string;
}

/**
 * Read Codex MCP config (~/.codex/config.toml)
 *
 * Format:
 * [mcp_servers.server-name]
 * enabled = true
 * command = "npx"
 * args = ["-y", "package"]
 *
 * @param configPath - Path to config.toml
 * @returns MCP servers configuration (converted to McpServerConfig format) or null if not found
 */
function readCodexMcpConfig(configPath: string): Record<string, McpServerConfig> | null {
  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    const parsed = parseToml(content);

    // Codex stores MCP servers under [mcp_servers.*] sections
    const mcpServersSection = parsed.mcp_servers as
      | Record<string, CodexMcpServerTomlConfig>
      | undefined;

    if (!mcpServersSection) {
      return null;
    }

    const servers: Record<string, McpServerConfig> = {};

    for (const [serverId, config] of Object.entries(mcpServersSection)) {
      // Skip disabled servers
      if (config.enabled === false) {
        log('INFO', 'Skipping disabled Codex MCP server', { serverId });
        continue;
      }

      // Convert Codex TOML config to McpServerConfig format
      const serverConfig: Partial<McpServerConfig> = {
        command: config.command,
        args: config.args,
        env: config.env,
        type: config.type,
        url: config.url,
      };

      // Normalize (infer type if missing)
      const normalized = normalizeServerConfig(serverConfig);
      if (normalized) {
        servers[serverId] = normalized;
      } else {
        log('WARN', 'Invalid Codex MCP server configuration', {
          serverId,
          configPath,
          config,
        });
      }
    }

    if (Object.keys(servers).length > 0) {
      log('INFO', 'Successfully read Codex config.toml', {
        configPath,
        serverCount: Object.keys(servers).length,
      });
      return servers;
    }

    return null;
  } catch (error) {
    // File not found is expected
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return null;
    }

    log('WARN', 'Failed to read Codex config.toml', {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Get MCP server configuration by server ID
 *
 * @param serverId - Server identifier from 'claude mcp list'
 * @param workspacePath - Optional workspace path for project-scoped servers
 * @returns Server configuration or null if not found
 */
export function getMcpServerConfig(
  serverId: string,
  workspacePath?: string
): McpServerConfig | null {
  try {
    const legacyConfig = readLegacyClaudeConfig();

    // Priority 1: Project-scope .mcp.json (<workspace>/.mcp.json)
    if (workspacePath) {
      const projectMcpConfigPath = getProjectMcpConfigPath(workspacePath);
      const projectMcpConfig = readMcpConfig(projectMcpConfigPath);

      if (projectMcpConfig?.mcpServers?.[serverId]) {
        const rawConfig = projectMcpConfig.mcpServers[serverId];
        const serverConfig = normalizeServerConfig(rawConfig);

        if (!serverConfig) {
          log('WARN', 'Invalid MCP server configuration in project scope', {
            serverId,
            scope: 'project',
            configPath: projectMcpConfigPath,
            rawConfig,
          });
          return null;
        }

        log('INFO', 'Retrieved MCP server configuration from project scope', {
          serverId,
          scope: 'project',
          configPath: projectMcpConfigPath,
          type: serverConfig.type,
          hasCommand: !!serverConfig.command,
          hasUrl: !!serverConfig.url,
        });

        return { ...serverConfig, source: 'claude' };
      }
    }

    // Priority 2: User-level ~/.mcp.json
    const userMcpConfigPath = getUserMcpConfigPath();
    const userMcpConfig = readMcpConfig(userMcpConfigPath);

    if (userMcpConfig?.mcpServers?.[serverId]) {
      const rawConfig = userMcpConfig.mcpServers[serverId];
      const serverConfig = normalizeServerConfig(rawConfig);

      if (!serverConfig) {
        log('WARN', 'Invalid MCP server configuration in user mcp.json', {
          serverId,
          scope: 'user-mcp',
          configPath: userMcpConfigPath,
          rawConfig,
        });
        return null;
      }

      log('INFO', 'Retrieved MCP server configuration from user mcp.json', {
        serverId,
        scope: 'user-mcp',
        configPath: userMcpConfigPath,
        type: serverConfig.type,
        hasCommand: !!serverConfig.command,
        hasUrl: !!serverConfig.url,
      });

      return { ...serverConfig, source: 'claude' };
    }

    // Priority 3: Local scope - .claude.json.projects[<workspace>].mcpServers
    if (legacyConfig && workspacePath) {
      const projectsConfig = legacyConfig.projects as
        | Record<string, { mcpServers?: Record<string, McpServerConfig> }>
        | undefined;
      const localConfig = projectsConfig?.[workspacePath];
      if (localConfig?.mcpServers?.[serverId]) {
        const rawConfig = localConfig.mcpServers[serverId];
        const serverConfig = normalizeServerConfig(rawConfig);

        if (!serverConfig) {
          log('WARN', 'Invalid MCP server configuration in local scope', {
            serverId,
            scope: 'local',
            workspacePath,
            rawConfig,
          });
          return null;
        }

        log('INFO', 'Retrieved MCP server configuration from local scope', {
          serverId,
          scope: 'local',
          workspacePath,
          type: serverConfig.type,
          hasCommand: !!serverConfig.command,
          hasUrl: !!serverConfig.url,
        });

        return { ...serverConfig, source: 'claude' };
      }
    }

    // Priority 4: User scope (legacy) - .claude.json.mcpServers (top-level)
    if (legacyConfig?.mcpServers?.[serverId]) {
      const rawConfig = legacyConfig.mcpServers[serverId];
      const serverConfig = normalizeServerConfig(rawConfig);

      if (!serverConfig) {
        log('WARN', 'Invalid MCP server configuration in user scope', {
          serverId,
          scope: 'user',
          rawConfig,
        });
        return null;
      }

      log('INFO', 'Retrieved MCP server configuration from user scope', {
        serverId,
        scope: 'user',
        type: serverConfig.type,
        hasCommand: !!serverConfig.command,
        hasUrl: !!serverConfig.url,
      });

      return { ...serverConfig, source: 'claude' };
    }

    // =========================================================================
    // Copilot sources (Priority 5-7)
    // =========================================================================

    // Priority 5: VSCode Copilot project-scope (.vscode/mcp.json)
    if (workspacePath) {
      const vscodeMcpConfigPath = getVSCodeMcpConfigPath();
      if (vscodeMcpConfigPath) {
        const vscodeConfig = readVSCodeMcpConfig(vscodeMcpConfigPath);
        if (vscodeConfig?.[serverId]) {
          const serverConfig = normalizeServerConfig(vscodeConfig[serverId]);
          if (serverConfig) {
            log('INFO', 'Retrieved MCP server configuration from VSCode Copilot', {
              serverId,
              scope: 'vscode-copilot',
              configPath: vscodeMcpConfigPath,
              type: serverConfig.type,
            });
            return { ...serverConfig, source: 'copilot' };
          }
        }
      }
    }

    // Priority 6: Copilot CLI user-scope (~/.copilot/mcp-config.json)
    // Note: Copilot CLI only supports user-scope MCP configuration (no project-scope)
    const copilotUserConfigPath = getCopilotUserMcpConfigPath();
    const copilotUserConfig = readCopilotMcpConfig(copilotUserConfigPath);
    if (copilotUserConfig?.[serverId]) {
      const serverConfig = normalizeServerConfig(copilotUserConfig[serverId]);
      if (serverConfig) {
        log('INFO', 'Retrieved MCP server configuration from Copilot CLI user scope', {
          serverId,
          scope: 'copilot-user',
          configPath: copilotUserConfigPath,
          type: serverConfig.type,
        });
        return { ...serverConfig, source: 'copilot' };
      }
    }

    // =========================================================================
    // Codex source (Priority 8)
    // =========================================================================

    // Priority 8: Codex CLI user-scope (~/.codex/config.toml)
    const codexConfigPath = getCodexUserMcpConfigPath();
    const codexConfig = readCodexMcpConfig(codexConfigPath);
    if (codexConfig?.[serverId]) {
      const serverConfig = normalizeServerConfig(codexConfig[serverId]);
      if (serverConfig) {
        log('INFO', 'Retrieved MCP server configuration from Codex CLI', {
          serverId,
          scope: 'codex-user',
          configPath: codexConfigPath,
          type: serverConfig.type,
        });
        return { ...serverConfig, source: 'codex' };
      }
    }

    // Server not found in any configuration (Claude, Copilot, or Codex)
    log('WARN', 'MCP server not found in any configuration (Claude, Copilot, Codex)', {
      serverId,
      workspacePath,
    });

    return null;
  } catch (error) {
    log('ERROR', 'Failed to get MCP server configuration', {
      serverId,
      workspacePath,
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

/**
 * Get all MCP server IDs from all configuration sources (Claude, Copilot, Codex)
 *
 * @param workspacePath - Optional workspace path for project-scoped servers
 * @returns Array of unique server IDs
 */
export function getAllMcpServerIds(workspacePath?: string): string[] {
  try {
    const serverIds = new Set<string>();

    // =========================================================================
    // Claude Code sources
    // =========================================================================

    // Collect from project-scope .mcp.json (<workspace>/.mcp.json)
    if (workspacePath) {
      const projectMcpConfig = readMcpConfig(getProjectMcpConfigPath(workspacePath));
      if (projectMcpConfig?.mcpServers) {
        for (const id of Object.keys(projectMcpConfig.mcpServers)) {
          serverIds.add(id);
        }
      }
    }

    // Collect from user-level ~/.mcp.json
    const userMcpConfig = readMcpConfig(getUserMcpConfigPath());
    if (userMcpConfig?.mcpServers) {
      for (const id of Object.keys(userMcpConfig.mcpServers)) {
        serverIds.add(id);
      }
    }

    // Collect from .claude.json (legacy)
    const legacyConfig = readLegacyClaudeConfig();
    if (legacyConfig) {
      // Local scope (project-specific)
      if (workspacePath) {
        const projectsConfig = legacyConfig.projects as
          | Record<string, { mcpServers?: Record<string, McpServerConfig> }>
          | undefined;
        const localConfig = projectsConfig?.[workspacePath];
        if (localConfig?.mcpServers) {
          for (const id of Object.keys(localConfig.mcpServers)) {
            serverIds.add(id);
          }
        }
      }

      // User scope (top-level)
      if (legacyConfig.mcpServers) {
        for (const id of Object.keys(legacyConfig.mcpServers)) {
          serverIds.add(id);
        }
      }
    }

    // =========================================================================
    // Copilot sources
    // =========================================================================

    // Collect from VSCode Copilot (.vscode/mcp.json)
    if (workspacePath) {
      const vscodeMcpConfigPath = getVSCodeMcpConfigPath();
      if (vscodeMcpConfigPath) {
        const vscodeConfig = readVSCodeMcpConfig(vscodeMcpConfigPath);
        if (vscodeConfig) {
          for (const id of Object.keys(vscodeConfig)) {
            serverIds.add(id);
          }
        }
      }
    }

    // Collect from Copilot CLI user-scope (~/.copilot/mcp-config.json)
    // Note: Copilot CLI only supports user-scope MCP configuration (no project-scope)
    const copilotUserConfig = readCopilotMcpConfig(getCopilotUserMcpConfigPath());
    if (copilotUserConfig) {
      for (const id of Object.keys(copilotUserConfig)) {
        serverIds.add(id);
      }
    }

    // =========================================================================
    // Codex source
    // =========================================================================

    // Collect from Codex CLI user-scope (~/.codex/config.toml)
    const codexConfig = readCodexMcpConfig(getCodexUserMcpConfigPath());
    if (codexConfig) {
      for (const id of Object.keys(codexConfig)) {
        serverIds.add(id);
      }
    }

    return Array.from(serverIds);
  } catch (error) {
    log('ERROR', 'Failed to get MCP server list', {
      error: error instanceof Error ? error.message : String(error),
    });

    return [];
  }
}

/**
 * MCP server with source tracking
 */
export interface McpServerWithSource extends McpServerConfig {
  /** Server identifier */
  id: string;
  /** Source provider */
  source: McpConfigSource;
  /** Path to the config file this server was read from */
  configPath: string;
}

/**
 * Scan all MCP server configurations from all sources
 *
 * This function scans MCP server configurations from all supported AI coding tools:
 * - Claude Code (.mcp.json, .claude.json)
 * - VSCode Copilot (.vscode/mcp.json)
 * - Copilot CLI (.copilot/mcp-config.json)
 * - Codex CLI (~/.codex/config.toml)
 *
 * Priority order (first match wins for duplicate server IDs):
 * 1. Project-scope Claude Code (<workspace>/.mcp.json)
 * 2. Project-scope VSCode Copilot (<workspace>/.vscode/mcp.json)
 * 3. Project-scope Copilot CLI (<workspace>/.copilot/mcp-config.json)
 * 4. User-scope Claude Code (~/.mcp.json)
 * 5. Legacy Claude Code project (~/.claude.json → projects[workspace].mcpServers)
 * 6. Legacy Claude Code user (~/.claude.json → mcpServers)
 * 7. User-scope Copilot CLI (~/.copilot/mcp-config.json)
 * 8. User-scope Codex CLI (~/.codex/config.toml)
 *
 * @param workspacePath - Optional workspace path for project-scoped servers
 * @returns Array of MCP server configurations with source metadata
 */
export function getAllMcpServersWithSource(workspacePath?: string): McpServerWithSource[] {
  const servers: McpServerWithSource[] = [];
  // Use source:id combination as unique key to allow same server ID from different sources
  const seenServerKeys = new Set<string>();

  /**
   * Helper to create unique key from source and id
   */
  function getServerKey(source: McpConfigSource, serverId: string): string {
    return `${source}:${serverId}`;
  }

  /**
   * Helper to add servers if not already seen (same source + id combination)
   */
  function addServers(
    configServers: Record<string, McpServerConfig> | null,
    source: McpConfigSource,
    configPath: string
  ): void {
    if (!configServers) return;

    for (const [serverId, config] of Object.entries(configServers)) {
      const key = getServerKey(source, serverId);
      if (seenServerKeys.has(key)) {
        log('INFO', 'Skipping duplicate MCP server (already found in same source)', {
          serverId,
          source,
          skippedConfigPath: configPath,
        });
        continue;
      }

      const normalized = normalizeServerConfig(config);
      if (normalized) {
        seenServerKeys.add(key);
        servers.push({
          ...normalized,
          id: serverId,
          source,
          configPath,
        });
      }
    }
  }

  try {
    // =========================================================================
    // Project-scope sources (workspace-specific)
    // =========================================================================

    if (workspacePath) {
      // Priority 1: Claude Code project-scope (.mcp.json)
      const projectMcpConfigPath = getProjectMcpConfigPath(workspacePath);
      const projectMcpConfig = readMcpConfig(projectMcpConfigPath);
      addServers(projectMcpConfig?.mcpServers ?? null, 'claude', projectMcpConfigPath);

      // Priority 2: VSCode Copilot (.vscode/mcp.json)
      const vscodeMcpConfigPath = getVSCodeMcpConfigPath();
      if (vscodeMcpConfigPath) {
        const vscodeConfig = readVSCodeMcpConfig(vscodeMcpConfigPath);
        addServers(vscodeConfig, 'copilot', vscodeMcpConfigPath);
      }

      // Note: Copilot CLI project-scope (.copilot/mcp-config.json) is NOT supported
    }

    // =========================================================================
    // User-scope sources (global)
    // =========================================================================

    // Priority 3: Claude Code user-scope (~/.mcp.json)
    const userMcpConfigPath = getUserMcpConfigPath();
    const userMcpConfig = readMcpConfig(userMcpConfigPath);
    addServers(userMcpConfig?.mcpServers ?? null, 'claude', userMcpConfigPath);

    // Priority 4 & 5: Legacy Claude Code (.claude.json)
    const legacyConfig = readLegacyClaudeConfig();
    if (legacyConfig) {
      const legacyConfigPath = path.join(os.homedir(), '.claude.json');

      // Priority 4: Legacy project-scope
      if (workspacePath) {
        const projectsConfig = legacyConfig.projects as
          | Record<string, { mcpServers?: Record<string, McpServerConfig> }>
          | undefined;
        const localConfig = projectsConfig?.[workspacePath];
        addServers(localConfig?.mcpServers ?? null, 'claude', legacyConfigPath);
      }

      // Priority 5: Legacy user-scope
      addServers(legacyConfig.mcpServers ?? null, 'claude', legacyConfigPath);
    }

    // Priority 6: Copilot CLI user-scope (~/.copilot/mcp-config.json)
    // Note: Copilot CLI only supports user-scope MCP configuration (no project-scope)
    const copilotUserConfigPath = getCopilotUserMcpConfigPath();
    const copilotUserConfig = readCopilotMcpConfig(copilotUserConfigPath);
    addServers(copilotUserConfig, 'copilot', copilotUserConfigPath);

    // Priority 7: Codex CLI user-scope (~/.codex/config.toml)
    const codexConfigPath = getCodexUserMcpConfigPath();
    const codexConfig = readCodexMcpConfig(codexConfigPath);
    addServers(codexConfig, 'codex', codexConfigPath);

    log('INFO', 'Scanned all MCP server sources', {
      totalServers: servers.length,
      claudeCount: servers.filter((s) => s.source === 'claude').length,
      copilotCount: servers.filter((s) => s.source === 'copilot').length,
      codexCount: servers.filter((s) => s.source === 'codex').length,
    });

    return servers;
  } catch (error) {
    log('ERROR', 'Failed to scan all MCP server sources', {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}
