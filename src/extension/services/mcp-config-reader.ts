/**
 * MCP Configuration Reader Service
 *
 * Feature: 001-mcp-node
 * Purpose: Read MCP server configurations from .claude.json
 *
 * This service reads MCP server configurations directly from the user's
 * .claude.json file instead of using 'claude mcp get' CLI command.
 */

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
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
 * Get the path to .claude.json
 *
 * @returns Absolute path to .claude.json
 */
function getClaudeConfigPath(): string {
  return path.join(os.homedir(), '.claude.json');
}

/**
 * Read .claude.json file
 *
 * @returns Parsed configuration object
 */
function readClaudeConfig(): {
  mcpServers?: Record<string, McpServerConfig>;
  [key: string]: unknown;
} {
  const configPath = getClaudeConfigPath();

  try {
    const content = fs.readFileSync(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    log('ERROR', 'Failed to read .claude.json', {
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });

    throw new Error(`Failed to read Claude Code configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get MCP server configuration by server ID
 *
 * @param serverId - Server identifier from 'claude mcp list'
 * @returns Server configuration or null if not found
 */
export function getMcpServerConfig(serverId: string): McpServerConfig | null {
  try {
    const config = readClaudeConfig();

    if (!config.mcpServers || !config.mcpServers[serverId]) {
      log('WARN', 'MCP server not found in configuration', {
        serverId,
        availableServers: config.mcpServers ? Object.keys(config.mcpServers) : [],
      });

      return null;
    }

    const serverConfig = config.mcpServers[serverId];

    log('INFO', 'Retrieved MCP server configuration', {
      serverId,
      type: serverConfig.type,
      hasCommand: !!serverConfig.command,
      hasUrl: !!serverConfig.url,
    });

    return serverConfig;
  } catch (error) {
    log('ERROR', 'Failed to get MCP server configuration', {
      serverId,
      error: error instanceof Error ? error.message : String(error),
    });

    return null;
  }
}

/**
 * Get all MCP server IDs from configuration
 *
 * @returns Array of server IDs
 */
export function getAllMcpServerIds(): string[] {
  try {
    const config = readClaudeConfig();

    if (!config.mcpServers) {
      return [];
    }

    return Object.keys(config.mcpServers);
  } catch (error) {
    log('ERROR', 'Failed to get MCP server list', {
      error: error instanceof Error ? error.message : String(error),
    });

    return [];
  }
}
