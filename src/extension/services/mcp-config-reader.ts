/**
 * MCP Configuration Reader Service
 *
 * Feature: 001-mcp-node
 * Purpose: Read MCP server configurations from .claude.json
 *
 * This service reads MCP server configurations directly from the user's
 * .claude.json file instead of using 'claude mcp get' CLI command.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { log } from '../extension';

/**
 * MCP server configuration from .claude.json
 */
export interface McpServerConfig {
  type: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
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
 * Read mcp.json file
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

        return serverConfig;
      }
    }

    // Priority 2: Local scope - .claude.json[<workspace>].mcpServers
    if (legacyConfig && workspacePath) {
      const localConfig = legacyConfig[workspacePath] as
        | { mcpServers?: Record<string, McpServerConfig> }
        | undefined;
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

        return serverConfig;
      }
    }

    // Priority 3: User scope - .claude.json.mcpServers (top-level)
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

      return serverConfig;
    }

    // Server not found in any configuration
    log('WARN', 'MCP server not found in any configuration', {
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
 * Get all MCP server IDs from all configuration sources
 *
 * @param workspacePath - Optional workspace path for project-scoped servers
 * @returns Array of unique server IDs
 */
export function getAllMcpServerIds(workspacePath?: string): string[] {
  try {
    const serverIds = new Set<string>();

    // Collect from project-scope .mcp.json (<workspace>/.mcp.json)
    if (workspacePath) {
      const projectMcpConfig = readMcpConfig(getProjectMcpConfigPath(workspacePath));
      if (projectMcpConfig?.mcpServers) {
        for (const id of Object.keys(projectMcpConfig.mcpServers)) {
          serverIds.add(id);
        }
      }
    }

    // Collect from .claude.json
    const legacyConfig = readLegacyClaudeConfig();
    if (legacyConfig) {
      // Local scope (project-specific)
      if (workspacePath) {
        const localConfig = legacyConfig[workspacePath] as
          | { mcpServers?: Record<string, McpServerConfig> }
          | undefined;
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

    return Array.from(serverIds);
  } catch (error) {
    log('ERROR', 'Failed to get MCP server list', {
      error: error instanceof Error ? error.message : String(error),
    });

    return [];
  }
}
