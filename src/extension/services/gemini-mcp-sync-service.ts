/**
 * Claude Code Workflow Studio - Gemini CLI MCP Sync Service
 *
 * Handles MCP server configuration sync to ~/.gemini/settings.json
 * for Google Gemini CLI execution.
 *
 * Note: Gemini CLI uses JSON format for configuration:
 * - Config path: ~/.gemini/settings.json
 * - MCP servers section: mcpServers key
 *
 * @beta This is a PoC feature for Google Gemini CLI integration
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { getMcpServerConfig } from './mcp-config-reader';

/**
 * Gemini CLI settings.json structure
 */
interface GeminiConfig {
  mcpServers?: Record<string, GeminiMcpServerEntry>;
  [key: string]: unknown;
}

/**
 * MCP server configuration entry for Gemini CLI
 */
interface GeminiMcpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

/**
 * Preview result for MCP server sync
 */
export interface GeminiMcpSyncPreviewResult {
  /** Server IDs that would be added to ~/.gemini/settings.json */
  serversToAdd: string[];
  /** Server IDs that already exist in ~/.gemini/settings.json */
  existingServers: string[];
  /** Server IDs not found in any Claude Code config */
  missingServers: string[];
}

/**
 * Get the Gemini CLI config file path
 */
function getGeminiConfigPath(): string {
  return path.join(os.homedir(), '.gemini', 'settings.json');
}

/**
 * Read existing Gemini CLI config
 */
async function readGeminiConfig(): Promise<GeminiConfig> {
  const configPath = getGeminiConfigPath();

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content) as GeminiConfig;
  } catch {
    // File doesn't exist or invalid JSON
    return { mcpServers: {} };
  }
}

/**
 * Write Gemini CLI config to file
 *
 * @param config - Config to write
 */
async function writeGeminiConfig(config: GeminiConfig): Promise<void> {
  const configPath = getGeminiConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure ~/.gemini directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Serialize config to JSON
  await fs.writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Preview which MCP servers would be synced to ~/.gemini/settings.json
 *
 * This function checks without actually writing, allowing for confirmation dialogs.
 *
 * @param serverIds - Server IDs to sync
 * @param workspacePath - Workspace path for resolving project-scoped configs
 * @returns Preview of servers to add, existing, and missing
 */
export async function previewMcpSyncForGeminiCli(
  serverIds: string[],
  workspacePath: string
): Promise<GeminiMcpSyncPreviewResult> {
  if (serverIds.length === 0) {
    return { serversToAdd: [], existingServers: [], missingServers: [] };
  }

  const existingConfig = await readGeminiConfig();
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
 * Sync MCP server configurations to ~/.gemini/settings.json for Gemini CLI
 *
 * Reads MCP server configs from all Claude Code scopes (project, local, user)
 * and writes them to ~/.gemini/settings.json in JSON format.
 * Only adds servers that don't already exist in the config file.
 *
 * JSON output format:
 * ```json
 * {
 *   "mcpServers": {
 *     "my-server": {
 *       "command": "npx",
 *       "args": ["-y", "@my-mcp/server"],
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
export async function syncMcpConfigForGeminiCli(
  serverIds: string[],
  workspacePath: string
): Promise<string[]> {
  if (serverIds.length === 0) {
    return [];
  }

  // Read existing config
  const config = await readGeminiConfig();

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

    // Convert to Gemini format
    const geminiEntry: GeminiMcpServerEntry = {};

    if (serverConfig.command) {
      geminiEntry.command = serverConfig.command;
    }
    if (serverConfig.args && serverConfig.args.length > 0) {
      geminiEntry.args = serverConfig.args;
    }
    if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
      geminiEntry.env = serverConfig.env;
    }
    if (serverConfig.url) {
      geminiEntry.url = serverConfig.url;
    }

    config.mcpServers[serverId] = geminiEntry;
    syncedServers.push(serverId);
  }

  // Write updated config if any servers were added
  if (syncedServers.length > 0) {
    await writeGeminiConfig(config);
  }

  return syncedServers;
}
