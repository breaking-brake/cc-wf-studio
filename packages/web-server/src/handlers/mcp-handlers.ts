/**
 * MCP Handlers - Web Server
 *
 * Handles MCP server management, tool discovery, and AI agent launch.
 * Ported from src/extension/commands/mcp-handlers.ts
 */

import path from 'node:path';
import { log, type McpServerManager } from '@cc-wf-studio/core';
import type { WebSocketMessageTransport } from '../adapters/ws-message-transport.js';

type Reply = (type: string, payload?: unknown) => void;

// In-memory MCP cache
const mcpCache = {
  servers: null as unknown[] | null,
  serversCachedAt: 0,
  tools: new Map<string, { data: unknown[]; cachedAt: number }>(),
  schemas: new Map<string, { data: unknown; cachedAt: number }>(),
  TTL_SERVERS: 30_000,
  TTL_TOOLS: 30_000,
  TTL_SCHEMAS: 60_000,
};

/**
 * Handle LIST_MCP_SERVERS
 */
export async function handleListMcpServersWeb(
  _payload: Record<string, unknown>,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    // Check cache
    if (mcpCache.servers && Date.now() - mcpCache.serversCachedAt < mcpCache.TTL_SERVERS) {
      reply('MCP_SERVERS_LIST', { servers: mcpCache.servers });
      return;
    }

    // Read MCP config files to discover servers
    const servers = await discoverMcpServers();
    mcpCache.servers = servers;
    mcpCache.serversCachedAt = Date.now();

    reply('MCP_SERVERS_LIST', { servers });
  } catch (error) {
    log('ERROR', 'Failed to list MCP servers', {
      error: error instanceof Error ? error.message : String(error),
    });
    reply('MCP_SERVERS_LIST', { servers: [] });
  }
}

/**
 * Handle GET_MCP_TOOLS
 */
export async function handleGetMcpToolsWeb(
  payload: { serverId: string },
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const { serverId } = payload;

    // Check cache
    const cached = mcpCache.tools.get(serverId);
    if (cached && Date.now() - cached.cachedAt < mcpCache.TTL_TOOLS) {
      reply('MCP_TOOLS_LIST', { serverId, tools: cached.data });
      return;
    }

    // TODO: Connect to MCP server and list tools using SDK
    const tools: unknown[] = [];
    mcpCache.tools.set(serverId, { data: tools, cachedAt: Date.now() });

    reply('MCP_TOOLS_LIST', { serverId, tools });
  } catch (error) {
    reply('MCP_TOOLS_FAILED', {
      serverId: payload.serverId,
      errorCode: 'CONNECTION_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to get tools',
    });
  }
}

/**
 * Handle GET_MCP_TOOL_SCHEMA
 */
export async function handleGetMcpToolSchemaWeb(
  payload: { serverId: string; toolName: string },
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const { serverId, toolName } = payload;
    const cacheKey = `${serverId}:${toolName}`;

    // Check cache
    const cached = mcpCache.schemas.get(cacheKey);
    if (cached && Date.now() - cached.cachedAt < mcpCache.TTL_SCHEMAS) {
      reply('MCP_TOOL_SCHEMA', { serverId, toolName, schema: cached.data });
      return;
    }

    // TODO: Connect to MCP server and get tool schema
    const schema = {};
    mcpCache.schemas.set(cacheKey, { data: schema, cachedAt: Date.now() });

    reply('MCP_TOOL_SCHEMA', { serverId, toolName, schema });
  } catch (error) {
    reply('MCP_TOOL_SCHEMA_FAILED', {
      serverId: payload.serverId,
      toolName: payload.toolName,
      errorCode: 'SCHEMA_FETCH_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to get schema',
    });
  }
}

/**
 * Handle REFRESH_MCP_CACHE
 */
export async function handleRefreshMcpCacheWeb(
  payload: Record<string, unknown>,
  requestId: string | undefined,
  reply: Reply
): Promise<void> {
  mcpCache.servers = null;
  mcpCache.serversCachedAt = 0;
  mcpCache.tools.clear();
  mcpCache.schemas.clear();

  // Re-fetch servers
  await handleListMcpServersWeb(payload, requestId, reply);
}

/**
 * Handle START_MCP_SERVER
 */
export async function handleStartMcpServerWeb(
  existingManager: McpServerManager | null,
  transport: WebSocketMessageTransport,
  _workspacePath: string,
  _payload: { configTargets?: string[] } | undefined,
  _requestId: string | undefined,
  reply: Reply
): Promise<McpServerManager | null> {
  try {
    // Use existing or create new McpServerManager
    let manager = existingManager;
    if (!manager) {
      // Import McpServerManager from core
      const { McpServerManager: Mgr } = await import('@cc-wf-studio/core');
      manager = new Mgr();
      manager.setTransport(transport);
    }

    // Find the extension/core path that has the MCP server CLI
    const corePath = path.resolve(
      import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
      '../../../core'
    );

    const port = await manager.start(corePath);

    log('INFO', 'MCP Server started via web UI', { port });

    reply('MCP_SERVER_STATUS', {
      running: true,
      port,
      configsWritten: [],
      reviewBeforeApply: manager.getReviewBeforeApply(),
    });

    return manager;
  } catch (error) {
    log('ERROR', 'Failed to start MCP server', {
      error: error instanceof Error ? error.message : String(error),
    });
    reply('MCP_SERVER_STATUS', {
      running: false,
      port: null,
      configsWritten: [],
      reviewBeforeApply: true,
    });
    return existingManager;
  }
}

/**
 * Handle STOP_MCP_SERVER
 */
export async function handleStopMcpServerWeb(
  manager: McpServerManager | null,
  _workspacePath: string,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    if (manager) {
      await manager.stop();
    }

    reply('MCP_SERVER_STATUS', {
      running: false,
      port: null,
      configsWritten: [],
      reviewBeforeApply: manager?.getReviewBeforeApply() ?? true,
    });
  } catch (error) {
    log('ERROR', 'Failed to stop MCP server', {
      error: error instanceof Error ? error.message : String(error),
    });
    reply('MCP_SERVER_STATUS', {
      running: false,
      port: null,
      configsWritten: [],
      reviewBeforeApply: true,
    });
  }
}

// ============================================================================
// Internal helpers
// ============================================================================

async function discoverMcpServers(): Promise<unknown[]> {
  // Discover MCP servers from known config locations
  const servers: unknown[] = [];
  const fs = await import('node:fs/promises');
  const os = await import('node:os');

  const configPaths = [
    // Claude Code
    path.join(os.default.homedir(), '.claude', 'mcp_servers.json'),
    path.join(process.cwd(), '.claude', 'mcp_servers.json'),
    // VSCode Copilot
    path.join(os.default.homedir(), '.vscode', 'mcp.json'),
  ];

  for (const configPath of configPaths) {
    try {
      const content = await fs.readFile(configPath, 'utf-8');
      const config = JSON.parse(content);

      if (config && typeof config === 'object') {
        const mcpServers = config.mcpServers || config;
        for (const [name, serverConfig] of Object.entries(mcpServers)) {
          servers.push({
            id: name,
            name,
            config: serverConfig,
            source: configPath,
          });
        }
      }
    } catch {
      // Config file doesn't exist — skip
    }
  }

  return servers;
}
