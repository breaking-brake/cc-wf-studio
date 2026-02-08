/**
 * CC Workflow Studio - MCP Server Config Writer
 *
 * Writes the built-in MCP server URL to various AI agent configuration files
 * so that external agents can discover and connect to the MCP server.
 *
 * Supported targets:
 * - Claude Code: {workspace}/.mcp.json
 * - Roo Code: {workspace}/.roo/mcp.json
 * - VSCode Copilot: {workspace}/.vscode/mcp.json
 * - Copilot CLI: ~/.copilot/mcp-config.json (global)
 * - Codex CLI: ~/.codex/config.toml (global)
 */

import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import * as TOML from 'smol-toml';
import type { AiEditingProvider, McpConfigTarget } from '../../shared/types/messages';
import { log } from '../extension';

const SERVER_ENTRY_NAME = 'cc-workflow-studio';

interface JsonMcpConfig {
  mcpServers?: Record<string, { url?: string; [key: string]: unknown }>;
  servers?: Record<string, { url?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

interface CodexConfig {
  mcp_servers?: Record<string, { url?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/**
 * Get the config file path for a given target
 */
function getConfigPath(target: McpConfigTarget, workspacePath: string): string {
  switch (target) {
    case 'claude-code':
      return path.join(workspacePath, '.mcp.json');
    case 'roo-code':
      return path.join(workspacePath, '.roo', 'mcp.json');
    case 'copilot-chat':
      return path.join(workspacePath, '.vscode', 'mcp.json');
    case 'copilot-cli':
      return path.join(os.homedir(), '.copilot', 'mcp-config.json');
    case 'codex':
      return path.join(os.homedir(), '.codex', 'config.toml');
  }
}

/**
 * Read a JSON config file, returning empty object on failure
 */
async function readJsonConfig(filePath: string): Promise<JsonMcpConfig> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as JsonMcpConfig;
  } catch {
    return {};
  }
}

/**
 * Write a JSON config file, creating directories as needed
 */
async function writeJsonConfig(filePath: string, config: JsonMcpConfig): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`);
}

/**
 * Read Codex TOML config, returning empty object on failure
 */
async function readCodexConfig(): Promise<CodexConfig> {
  const configPath = path.join(os.homedir(), '.codex', 'config.toml');
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return TOML.parse(content) as CodexConfig;
  } catch {
    return {};
  }
}

/**
 * Write Codex TOML config
 */
async function writeCodexConfig(config: CodexConfig): Promise<void> {
  const configPath = path.join(os.homedir(), '.codex', 'config.toml');
  const dir = path.dirname(configPath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(configPath, TOML.stringify(config));
}

/**
 * Write MCP server URL to a specific AI agent config file
 */
export async function writeAgentConfig(
  target: McpConfigTarget,
  serverUrl: string,
  workspacePath: string
): Promise<void> {
  try {
    if (target === 'codex') {
      const config = await readCodexConfig();
      if (!config.mcp_servers) {
        config.mcp_servers = {};
      }
      config.mcp_servers[SERVER_ENTRY_NAME] = { url: serverUrl };
      await writeCodexConfig(config);
    } else if (target === 'copilot-chat') {
      // VSCode Copilot uses "servers" key with type "http"
      const filePath = getConfigPath(target, workspacePath);
      const config = await readJsonConfig(filePath);
      if (!config.servers) {
        config.servers = {};
      }
      config.servers[SERVER_ENTRY_NAME] = { type: 'http', url: serverUrl };
      await writeJsonConfig(filePath, config);
    } else if (target === 'copilot-cli') {
      // Copilot CLI uses "mcpServers" key with tools: ["*"] (global config)
      const filePath = getConfigPath(target, workspacePath);
      const config = await readJsonConfig(filePath);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      config.mcpServers[SERVER_ENTRY_NAME] = { type: 'http', url: serverUrl, tools: ['*'] };
      await writeJsonConfig(filePath, config);
    } else if (target === 'roo-code') {
      // Roo Code uses "mcpServers" key with type "streamable-http"
      const filePath = getConfigPath(target, workspacePath);
      const config = await readJsonConfig(filePath);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      config.mcpServers[SERVER_ENTRY_NAME] = { type: 'streamable-http', url: serverUrl };
      await writeJsonConfig(filePath, config);
    } else {
      // Claude Code uses "mcpServers" key with type "http"
      const filePath = getConfigPath(target, workspacePath);
      const config = await readJsonConfig(filePath);
      if (!config.mcpServers) {
        config.mcpServers = {};
      }
      config.mcpServers[SERVER_ENTRY_NAME] = { type: 'http', url: serverUrl };
      await writeJsonConfig(filePath, config);
    }

    log('INFO', `MCP Config Writer: Wrote config for ${target}`, { serverUrl });
  } catch (error) {
    log('ERROR', `MCP Config Writer: Failed to write config for ${target}`, {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Remove MCP server entry from a specific AI agent config file
 */
export async function removeAgentConfig(
  target: McpConfigTarget,
  workspacePath: string
): Promise<void> {
  try {
    if (target === 'codex') {
      const config = await readCodexConfig();
      if (config.mcp_servers?.[SERVER_ENTRY_NAME]) {
        delete config.mcp_servers[SERVER_ENTRY_NAME];
        await writeCodexConfig(config);
      }
    } else if (target === 'copilot-chat') {
      const filePath = getConfigPath(target, workspacePath);
      const config = await readJsonConfig(filePath);
      if (config.servers?.[SERVER_ENTRY_NAME]) {
        delete config.servers[SERVER_ENTRY_NAME];
        await writeJsonConfig(filePath, config);
      }
    } else {
      // claude-code, copilot-cli, roo-code all use "mcpServers" key
      const filePath = getConfigPath(target, workspacePath);
      const config = await readJsonConfig(filePath);
      if (config.mcpServers?.[SERVER_ENTRY_NAME]) {
        delete config.mcpServers[SERVER_ENTRY_NAME];
        await writeJsonConfig(filePath, config);
      }
    }

    log('INFO', `MCP Config Writer: Removed config for ${target}`);
  } catch (error) {
    // Best-effort removal, log but don't throw
    log('WARN', `MCP Config Writer: Failed to remove config for ${target}`, {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Write MCP server URL to all specified targets
 */
export async function writeAllAgentConfigs(
  targets: McpConfigTarget[],
  serverUrl: string,
  workspacePath: string
): Promise<McpConfigTarget[]> {
  const written: McpConfigTarget[] = [];

  for (const target of targets) {
    try {
      await writeAgentConfig(target, serverUrl, workspacePath);
      written.push(target);
    } catch {
      // Continue with other targets
    }
  }

  return written;
}

/**
 * Get the config targets required for a given AI editing provider
 */
export function getConfigTargetsForProvider(provider: AiEditingProvider): McpConfigTarget[] {
  switch (provider) {
    case 'claude-code':
      return ['claude-code'];
    case 'copilot-cli':
      return ['copilot-cli'];
    case 'copilot-vscode':
      return ['copilot-chat'];
    case 'codex':
      return ['codex'];
    case 'roo-code':
      return ['roo-code'];
  }
}

/**
 * Remove MCP server entry from all agent config files (best-effort)
 */
export async function removeAllAgentConfigs(workspacePath: string): Promise<void> {
  const allTargets: McpConfigTarget[] = [
    'claude-code',
    'roo-code',
    'copilot-chat',
    'copilot-cli',
    'codex',
  ];

  for (const target of allTargets) {
    await removeAgentConfig(target, workspacePath);
  }
}
