/**
 * Claude Code Workflow Studio - Roo Code MCP Sync Service
 *
 * Handles MCP server configuration sync to {workspace}/.roo/mcp.json
 * for Roo Code execution.
 *
 * Note: Roo Code uses JSON format for MCP configuration:
 * - Config path: {workspace}/.roo/mcp.json
 * - MCP servers section: mcpServers.{server_name}
 *
 * @beta This is a PoC feature for Roo Code integration
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getMcpServerConfig } from './mcp-config-reader';

/**
 * Roo Code mcp.json structure
 */
interface RooCodeMcpConfig {
  mcpServers?: Record<string, RooCodeMcpServerEntry>;
}

/**
 * MCP server configuration entry for Roo Code
 */
interface RooCodeMcpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

/**
 * Preview result for MCP server sync
 */
export interface RooCodeMcpSyncPreviewResult {
  /** Server IDs that would be added to .roo/mcp.json */
  serversToAdd: string[];
  /** Server IDs that already exist in .roo/mcp.json */
  existingServers: string[];
  /** Server IDs not found in any Claude Code config */
  missingServers: string[];
}

/**
 * Get the Roo Code MCP config file path
 */
function getRooCodeMcpConfigPath(workspacePath: string): string {
  return path.join(workspacePath, '.roo', 'mcp.json');
}

/**
 * Read existing Roo Code MCP config
 */
async function readRooCodeMcpConfig(workspacePath: string): Promise<RooCodeMcpConfig> {
  const configPath = getRooCodeMcpConfigPath(workspacePath);

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as RooCodeMcpConfig;
  } catch {
    // File doesn't exist or invalid JSON
    return { mcpServers: {} };
  }
}

/**
 * Write Roo Code MCP config to file
 *
 * @param workspacePath - Workspace path
 * @param config - Config to write
 */
async function writeRooCodeMcpConfig(
  workspacePath: string,
  config: RooCodeMcpConfig
): Promise<void> {
  const configPath = getRooCodeMcpConfigPath(workspacePath);
  const configDir = path.dirname(configPath);

  // Ensure .roo directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Serialize config to JSON
  const jsonContent = JSON.stringify(config, null, 2);
  await fs.writeFile(configPath, jsonContent);
}

/**
 * Preview which MCP servers would be synced to .roo/mcp.json
 *
 * This function checks without actually writing, allowing for confirmation dialogs.
 *
 * @param serverIds - Server IDs to sync
 * @param workspacePath - Workspace path for resolving project-scoped configs
 * @returns Preview of servers to add, existing, and missing
 */
export async function previewMcpSyncForRooCode(
  serverIds: string[],
  workspacePath: string
): Promise<RooCodeMcpSyncPreviewResult> {
  if (serverIds.length === 0) {
    return { serversToAdd: [], existingServers: [], missingServers: [] };
  }

  const existingConfig = await readRooCodeMcpConfig(workspacePath);
  const existingServersMap = existingConfig.mcpServers || {};

  const serversToAdd: string[] = [];
  const existingServers: string[] = [];
  const missingServers: string[] = [];

  for (const serverId of serverIds) {
    if (existingServersMap[serverId]) {
      existingServers.push(serverId);
    } else {
      // Check if server config exists in Claude Code
      const serverConfig = getMcpServerConfig(serverId, workspacePath);
      if (serverConfig) {
        serversToAdd.push(serverId);
      } else {
        missingServers.push(serverId);
      }
    }
  }

  return { serversToAdd, existingServers, missingServers };
}

/**
 * Sync MCP server configurations to .roo/mcp.json for Roo Code
 *
 * Reads MCP server configs from all Claude Code scopes (project, local, user)
 * and writes them to .roo/mcp.json in JSON format.
 * Only adds servers that don't already exist in the config file.
 *
 * JSON output format:
 * ```json
 * {
 *   "mcpServers": {
 *     "server-name": {
 *       "command": "npx",
 *       "args": ["-y", "@some/mcp-server"],
 *       "env": { "API_KEY": "xxx" }
 *     }
 *   }
 * }
 * ```
 *
 * @param serverIds - Server IDs to sync
 * @param workspacePath - Workspace path for resolving project-scoped configs
 * @returns Array of synced server IDs
 */
export async function syncMcpConfigForRooCode(
  serverIds: string[],
  workspacePath: string
): Promise<string[]> {
  if (serverIds.length === 0) {
    return [];
  }

  // Read existing config
  const config = await readRooCodeMcpConfig(workspacePath);

  if (!config.mcpServers) {
    config.mcpServers = {};
  }

  // Sync servers from all Claude Code scopes (project, local, user)
  const syncedServers: string[] = [];
  for (const serverId of serverIds) {
    // Skip if already exists in config
    if (config.mcpServers[serverId]) {
      continue;
    }

    // Get server config from Claude Code (searches all scopes)
    const serverConfig = getMcpServerConfig(serverId, workspacePath);
    if (!serverConfig) {
      continue;
    }

    // Convert to Roo Code format
    const rooCodeEntry: RooCodeMcpServerEntry = {};

    if (serverConfig.command) {
      rooCodeEntry.command = serverConfig.command;
    }
    if (serverConfig.args && serverConfig.args.length > 0) {
      rooCodeEntry.args = serverConfig.args;
    }
    if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
      rooCodeEntry.env = serverConfig.env;
    }
    if (serverConfig.url) {
      rooCodeEntry.url = serverConfig.url;
    }

    config.mcpServers[serverId] = rooCodeEntry;
    syncedServers.push(serverId);
  }

  // Write updated config if any servers were added
  if (syncedServers.length > 0) {
    await writeRooCodeMcpConfig(workspacePath, config);
  }

  return syncedServers;
}
