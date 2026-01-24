/**
 * Claude Code Workflow Studio - Codex CLI MCP Sync Service
 *
 * Handles MCP server configuration sync to $HOME/.codex/config.toml
 * for OpenAI Codex CLI execution.
 *
 * Note: Codex CLI uses TOML format for configuration:
 * - Config path: $HOME/.codex/config.toml
 * - MCP servers section: [mcp_servers.{server_name}]
 *
 * @beta This is a PoC feature for OpenAI Codex CLI integration
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as TOML from 'smol-toml';
import { getMcpServerConfig } from './mcp-config-reader';

/**
 * Project trust level configuration for Codex CLI
 */
interface CodexProjectConfig {
  trust_level: 'trusted' | 'untrusted';
}

/**
 * Codex CLI config.toml structure
 */
interface CodexConfig {
  mcp_servers?: Record<string, CodexMcpServerEntry>;
  projects?: Record<string, CodexProjectConfig>;
  [key: string]: unknown;
}

/**
 * MCP server configuration entry for Codex CLI
 */
interface CodexMcpServerEntry {
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
}

/**
 * Preview result for MCP server sync
 */
export interface CodexMcpSyncPreviewResult {
  /** Server IDs that would be added to $HOME/.codex/config.toml */
  serversToAdd: string[];
  /** Server IDs that already exist in $HOME/.codex/config.toml */
  existingServers: string[];
  /** Server IDs not found in any Claude Code config */
  missingServers: string[];
}

/**
 * Get the Codex CLI config file path
 */
function getCodexConfigPath(): string {
  return path.join(os.homedir(), '.codex', 'config.toml');
}

/**
 * Read existing Codex CLI config
 */
async function readCodexConfig(): Promise<CodexConfig> {
  const configPath = getCodexConfigPath();

  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return TOML.parse(content) as CodexConfig;
  } catch {
    // File doesn't exist or invalid TOML
    return { mcp_servers: {} };
  }
}

/**
 * Write Codex CLI config to file
 *
 * @param config - Config to write
 */
async function writeCodexConfig(config: CodexConfig): Promise<void> {
  const configPath = getCodexConfigPath();
  const configDir = path.dirname(configPath);

  // Ensure $HOME/.codex directory exists
  await fs.mkdir(configDir, { recursive: true });

  // Serialize config to TOML
  const tomlContent = TOML.stringify(config);
  await fs.writeFile(configPath, tomlContent);
}

/**
 * Preview which MCP servers would be synced to $HOME/.codex/config.toml
 *
 * This function checks without actually writing, allowing for confirmation dialogs.
 *
 * @param serverIds - Server IDs to sync
 * @param workspacePath - Workspace path for resolving project-scoped configs
 * @returns Preview of servers to add, existing, and missing
 */
export async function previewMcpSyncForCodexCli(
  serverIds: string[],
  workspacePath: string
): Promise<CodexMcpSyncPreviewResult> {
  if (serverIds.length === 0) {
    return { serversToAdd: [], existingServers: [], missingServers: [] };
  }

  const existingConfig = await readCodexConfig();
  const existingServersMap = existingConfig.mcp_servers || {};

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
 * Sync MCP server configurations to $HOME/.codex/config.toml for Codex CLI
 *
 * Reads MCP server configs from all Claude Code scopes (project, local, user)
 * and writes them to $HOME/.codex/config.toml in TOML format.
 * Only adds servers that don't already exist in the config file.
 *
 * TOML output format:
 * ```toml
 * [mcp_servers.my-server]
 * command = "npx"
 * args = ["-y", "@my-mcp/server"]
 *
 * [mcp_servers.my-server.env]
 * API_KEY = "xxx"
 * ```
 *
 * @param serverIds - Server IDs to sync
 * @param workspacePath - Workspace path for resolving project-scoped configs
 * @returns Array of synced server IDs
 */
export async function syncMcpConfigForCodexCli(
  serverIds: string[],
  workspacePath: string
): Promise<string[]> {
  if (serverIds.length === 0) {
    return [];
  }

  // Read existing config
  const config = await readCodexConfig();

  if (!config.mcp_servers) {
    config.mcp_servers = {};
  }

  // Sync servers from all Claude Code scopes (project, local, user)
  const syncedServers: string[] = [];
  for (const serverId of serverIds) {
    // Skip if already exists in config
    if (config.mcp_servers[serverId]) {
      continue;
    }

    // Get server config from Claude Code (searches all scopes)
    const serverConfig = getMcpServerConfig(serverId, workspacePath);
    if (!serverConfig) {
      continue;
    }

    // Convert to Codex format
    const codexEntry: CodexMcpServerEntry = {};

    if (serverConfig.command) {
      codexEntry.command = serverConfig.command;
    }
    if (serverConfig.args && serverConfig.args.length > 0) {
      codexEntry.args = serverConfig.args;
    }
    if (serverConfig.env && Object.keys(serverConfig.env).length > 0) {
      codexEntry.env = serverConfig.env;
    }
    if (serverConfig.url) {
      codexEntry.url = serverConfig.url;
    }

    config.mcp_servers[serverId] = codexEntry;
    syncedServers.push(serverId);
  }

  // Write updated config if any servers were added
  if (syncedServers.length > 0) {
    await writeCodexConfig(config);
  }

  return syncedServers;
}

/**
 * Check if project trust needs to be added to Codex config
 *
 * @param workspacePath - Workspace path to check
 * @returns true if trust needs to be added, false if already trusted
 */
export async function needsProjectTrustForCodexCli(workspacePath: string): Promise<boolean> {
  const config = await readCodexConfig();
  return config.projects?.[workspacePath]?.trust_level !== 'trusted';
}

/**
 * Ensure the workspace is marked as trusted in Codex config
 *
 * This is required for Codex CLI to recognize project-level skills.
 *
 * TOML output format:
 * ```toml
 * [projects."/path/to/workspace"]
 * trust_level = "trusted"
 * ```
 *
 * @workaround This is a workaround for openai/codex#9752
 * Remove this when Codex CLI fixes the issue
 *
 * @param workspacePath - Workspace path to mark as trusted
 * @returns true if trust was added, false if already trusted
 */
export async function ensureProjectTrustedForCodexCli(workspacePath: string): Promise<boolean> {
  const config = await readCodexConfig();

  // Check if already trusted
  if (config.projects?.[workspacePath]?.trust_level === 'trusted') {
    return false; // No change needed
  }

  // Add project trust
  if (!config.projects) {
    config.projects = {};
  }
  config.projects[workspacePath] = { trust_level: 'trusted' };

  await writeCodexConfig(config);
  return true; // Changed
}
