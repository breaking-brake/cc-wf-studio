/**
 * Claude Code Workflow Studio - Copilot CLI MCP Sync Service
 *
 * Handles MCP server configuration sync to $HOME/.copilot/mcp-config.json
 * for GitHub Copilot CLI execution.
 *
 * Note: Copilot CLI uses a different config path and key name than VSCode Copilot:
 * - VSCode Copilot: .vscode/mcp.json with "servers" key
 * - Copilot CLI: $HOME/.copilot/mcp-config.json with "mcpServers" key
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { getMcpServerConfig } from './mcp-config-reader';

/**
 * Copilot CLI MCP configuration format
 */
interface CopilotCliMcpConfig {
  mcpServers?: Record<string, McpServerConfigEntry>;
}

/**
 * MCP server configuration entry for Copilot CLI
 *
 * Note: Copilot CLI requires "tools" field to specify which tools are allowed.
 * Use ["*"] to allow all tools.
 */
interface McpServerConfigEntry {
  type?: 'stdio' | 'http' | 'sse';
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
  /** Tools to allow - use ["*"] to allow all tools (required for Copilot CLI) */
  tools?: string[];
}

/**
 * Preview result for MCP server sync
 */
export interface CopilotCliMcpSyncPreviewResult {
  /** Server IDs that would be added to $HOME/.copilot/mcp-config.json */
  serversToAdd: string[];
  /** Server IDs that already exist in $HOME/.copilot/mcp-config.json */
  existingServers: string[];
  /** Server IDs not found in any Claude Code config */
  missingServers: string[];
}

/**
 * Get the Copilot CLI MCP config file path
 */
function getCopilotCliMcpConfigPath(): string {
  return path.join(os.homedir(), '.copilot', 'mcp-config.json');
}

/**
 * Read existing Copilot CLI MCP config
 */
async function readCopilotCliMcpConfig(): Promise<CopilotCliMcpConfig> {
  const configPath = getCopilotCliMcpConfigPath();

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as CopilotCliMcpConfig;
  } catch {
    // File doesn't exist or invalid JSON
    return { mcpServers: {} };
  }
}

/**
 * Preview which MCP servers would be synced to $HOME/.copilot/mcp-config.json
 *
 * This function checks without actually writing, allowing for confirmation dialogs.
 *
 * @param serverIds - Server IDs to sync
 * @param workspacePath - Workspace path for resolving project-scoped configs
 * @returns Preview of servers to add, existing, and missing
 */
export async function previewMcpSyncForCopilotCli(
  serverIds: string[],
  workspacePath: string
): Promise<CopilotCliMcpSyncPreviewResult> {
  if (serverIds.length === 0) {
    return { serversToAdd: [], existingServers: [], missingServers: [] };
  }

  const existingConfig = await readCopilotCliMcpConfig();
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
 * Sync MCP server configurations to $HOME/.copilot/mcp-config.json for Copilot CLI
 *
 * Reads MCP server configs from all Claude Code scopes (project, local, user)
 * and writes them to $HOME/.copilot/mcp-config.json.
 * Only adds servers that don't already exist in the config file.
 *
 * @param serverIds - Server IDs to sync
 * @param workspacePath - Workspace path for resolving project-scoped configs
 * @returns Array of synced server IDs
 */
export async function syncMcpConfigForCopilotCli(
  serverIds: string[],
  workspacePath: string
): Promise<string[]> {
  if (serverIds.length === 0) {
    return [];
  }

  const configPath = getCopilotCliMcpConfigPath();

  // Read existing config
  const config = await readCopilotCliMcpConfig();

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

    // Add to config with tools: ["*"] to allow all tools (required for Copilot CLI)
    config.mcpServers[serverId] = {
      ...serverConfig,
      tools: ['*'],
    };
    syncedServers.push(serverId);
  }

  // Write updated config if any servers were added
  if (syncedServers.length > 0) {
    // Ensure $HOME/.copilot directory exists
    const copilotDir = path.dirname(configPath);
    await fs.mkdir(copilotDir, { recursive: true });

    await fs.writeFile(configPath, JSON.stringify(config, null, 2));
  }

  return syncedServers;
}
