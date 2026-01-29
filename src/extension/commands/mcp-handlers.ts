/**
 * MCP Operations - Extension Host Message Handlers
 *
 * Feature: 001-mcp-node
 * Purpose: Handle Webview requests for MCP server and tool operations
 *
 * Based on: specs/001-mcp-node/contracts/extension-webview-messages.schema.json
 *
 * Feature: 001-mcp-natural-language-mode
 * Enhancement: T046 - Updated handleGetMcpTools to use getTools() with built-in caching
 */

import * as vscode from 'vscode';
import type {
  GetMcpToolSchemaPayload,
  GetMcpToolsPayload,
  ListMcpServersPayload,
  McpCacheRefreshedPayload,
  McpServersResultPayload,
  McpToolSchemaResultPayload,
  McpToolsResultPayload,
  RefreshMcpCachePayload,
} from '../../shared/types/messages';
import { log } from '../extension';
import {
  getCachedServerList,
  invalidateAllCache,
  setCachedServerList,
} from '../services/mcp-cache-service';
import { getToolSchema, getTools, listServers } from '../services/mcp-cli-service';
import {
  getAllMcpServersWithSource,
  type McpServerWithSource,
} from '../services/mcp-config-reader';

/**
 * Handle LIST_MCP_SERVERS request from Webview (T018)
 *
 * Executes 'claude mcp list' CLI command to retrieve all configured MCP servers.
 * Supports optional scope filtering and cache optimization.
 *
 * @param payload - Server list request payload
 * @param webview - VSCode Webview instance
 * @param requestId - Request ID for response matching
 */
export async function handleListMcpServers(
  payload: ListMcpServersPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'LIST_MCP_SERVERS request started', {
    requestId,
    filterByScope: payload.options?.filterByScope,
  });

  try {
    // Get workspace folder for project-scoped MCP servers
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Check cache first
    const cached = getCachedServerList();
    if (cached) {
      const executionTimeMs = Date.now() - startTime;
      log('INFO', 'LIST_MCP_SERVERS cache hit', {
        requestId,
        serverCount: cached.length,
        executionTimeMs,
      });

      // Apply scope filter if specified
      const filteredServers = payload.options?.filterByScope
        ? cached.filter((server) => payload.options?.filterByScope?.includes(server.scope))
        : cached;

      const resultPayload: McpServersResultPayload = {
        success: true,
        servers: filteredServers,
        timestamp: new Date().toISOString(),
        executionTimeMs,
      };

      webview.postMessage({
        type: 'MCP_SERVERS_RESULT',
        requestId,
        payload: resultPayload,
      });
      return;
    }

    // Cache miss - execute CLI command with workspace folder
    const result = await listServers(workspaceFolder);

    // Get servers from all config sources (Claude Code, Copilot CLI, Codex CLI)
    const configServers = getAllMcpServersWithSource(workspaceFolder);

    // Convert McpServerWithSource to McpServerReference
    // Note: status is omitted because config readers can't determine connection status
    const convertToServerReference = (
      server: McpServerWithSource
    ): import('../../shared/types/mcp-node').McpServerReference => ({
      id: server.id,
      name: server.id, // Use ID as name since config files don't have separate name
      scope: 'user', // Config file servers are always user scope
      // status is intentionally omitted - only Claude Code CLI can determine connection status
      command: server.command || '',
      args: server.args || [],
      type: server.type || 'stdio',
      environment: server.env,
      source: server.source,
    });

    // Combine CLI results and config file servers
    // Use id + source combination as unique key to allow same server ID from different sources
    const mergedServers: import('../../shared/types/mcp-node').McpServerReference[] = [];
    const seenServerKeys = new Set<string>();

    // Helper to create unique key from id and source
    const getServerKey = (id: string, source: string | undefined) => `${source || 'claude'}:${id}`;

    if (result.success && result.data) {
      // Add CLI results first (they have accurate status info)
      for (const server of result.data) {
        const key = getServerKey(server.id, server.source);
        if (!seenServerKeys.has(key)) {
          mergedServers.push(server);
          seenServerKeys.add(key);
        }
      }
    }

    // Add servers from config files (Copilot CLI, Codex CLI, etc.)
    // Same ID from different sources will be included
    for (const configServer of configServers) {
      const key = getServerKey(configServer.id, configServer.source);
      if (!seenServerKeys.has(key)) {
        mergedServers.push(convertToServerReference(configServer));
        seenServerKeys.add(key);
      }
    }

    const executionTimeMs = Date.now() - startTime;

    // If no servers found at all, report error
    if (mergedServers.length === 0 && !result.success) {
      log('ERROR', 'LIST_MCP_SERVERS failed', {
        requestId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        errorDetails: result.error?.details,
        executionTimeMs,
      });

      const errorPayload: McpServersResultPayload = {
        success: false,
        error: result.error,
        timestamp: new Date().toISOString(),
        executionTimeMs,
      };

      webview.postMessage({
        type: 'MCP_SERVERS_RESULT',
        requestId,
        payload: errorPayload,
      });
      return;
    }

    // Success - cache and return
    setCachedServerList(mergedServers);

    log('INFO', 'LIST_MCP_SERVERS completed successfully', {
      requestId,
      serverCount: mergedServers.length,
      cliServerCount: result.data?.length ?? 0,
      configServerCount: configServers.length,
      executionTimeMs,
    });

    // Apply scope filter if specified
    const filteredServers = payload.options?.filterByScope
      ? mergedServers.filter((server) => payload.options?.filterByScope?.includes(server.scope))
      : mergedServers;

    const successPayload: McpServersResultPayload = {
      success: true,
      servers: filteredServers,
      timestamp: new Date().toISOString(),
      executionTimeMs,
    };

    webview.postMessage({
      type: 'MCP_SERVERS_RESULT',
      requestId,
      payload: successPayload,
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'LIST_MCP_SERVERS unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs,
    });

    const errorPayload: McpServersResultPayload = {
      success: false,
      error: {
        code: 'MCP_UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
      executionTimeMs,
    };

    webview.postMessage({
      type: 'MCP_SERVERS_RESULT',
      requestId,
      payload: errorPayload,
    });
  }
}

/**
 * Handle GET_MCP_TOOLS request from Webview (T019, T046)
 *
 * Retrieves tools from a specific MCP server using getTools() with built-in caching.
 *
 * @param payload - Tool list request payload
 * @param webview - VSCode Webview instance
 * @param requestId - Request ID for response matching
 */
export async function handleGetMcpTools(
  payload: GetMcpToolsPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'GET_MCP_TOOLS request started', {
    requestId,
    serverId: payload.serverId,
  });

  try {
    // Get workspace folder for project-scoped MCP servers
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Use getTools() with built-in caching (T045, T046)
    const result = await getTools(payload.serverId, workspaceFolder);
    const executionTimeMs = Date.now() - startTime;

    if (!result.success || !result.data) {
      log('ERROR', 'GET_MCP_TOOLS failed', {
        requestId,
        serverId: payload.serverId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        errorDetails: result.error?.details,
        executionTimeMs,
      });

      const errorPayload: McpToolsResultPayload = {
        success: false,
        serverId: payload.serverId,
        error: result.error,
        timestamp: new Date().toISOString(),
        executionTimeMs,
      };

      webview.postMessage({
        type: 'MCP_TOOLS_RESULT',
        requestId,
        payload: errorPayload,
      });
      return;
    }

    // Success - return tools
    log('INFO', 'GET_MCP_TOOLS completed successfully', {
      requestId,
      serverId: payload.serverId,
      toolCount: result.data.length,
      executionTimeMs,
    });

    const successPayload: McpToolsResultPayload = {
      success: true,
      serverId: payload.serverId,
      tools: result.data,
      timestamp: new Date().toISOString(),
      executionTimeMs,
    };

    webview.postMessage({
      type: 'MCP_TOOLS_RESULT',
      requestId,
      payload: successPayload,
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'GET_MCP_TOOLS unexpected error', {
      requestId,
      serverId: payload.serverId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs,
    });

    const errorPayload: McpToolsResultPayload = {
      success: false,
      serverId: payload.serverId,
      error: {
        code: 'MCP_UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
      executionTimeMs,
    };

    webview.postMessage({
      type: 'MCP_TOOLS_RESULT',
      requestId,
      payload: errorPayload,
    });
  }
}

/**
 * Handle GET_MCP_TOOL_SCHEMA request from Webview (T028)
 *
 * Retrieves detailed schema for a specific MCP tool's parameters.
 * Useful for dynamic form generation with validation.
 *
 * @param payload - Tool schema request payload
 * @param webview - VSCode Webview instance
 * @param requestId - Request ID for response matching
 */
export async function handleGetMcpToolSchema(
  payload: GetMcpToolSchemaPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'GET_MCP_TOOL_SCHEMA request started', {
    requestId,
    serverId: payload.serverId,
    toolName: payload.toolName,
  });

  try {
    // Get workspace folder for project-scoped MCP servers
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

    // Execute tool schema retrieval
    const result = await getToolSchema(payload.serverId, payload.toolName, workspaceFolder);
    const executionTimeMs = Date.now() - startTime;

    if (!result.success || !result.data) {
      log('ERROR', 'GET_MCP_TOOL_SCHEMA failed', {
        requestId,
        serverId: payload.serverId,
        toolName: payload.toolName,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
        errorDetails: result.error?.details,
        executionTimeMs,
      });

      const errorPayload: McpToolSchemaResultPayload = {
        success: false,
        serverId: payload.serverId,
        toolName: payload.toolName,
        error: result.error,
        timestamp: new Date().toISOString(),
        executionTimeMs,
      };

      webview.postMessage({
        type: 'MCP_TOOL_SCHEMA_RESULT',
        requestId,
        payload: errorPayload,
      });
      return;
    }

    // Success - return schema
    log('INFO', 'GET_MCP_TOOL_SCHEMA completed successfully', {
      requestId,
      serverId: payload.serverId,
      toolName: payload.toolName,
      parameterCount: result.data.parameters?.length || 0,
      executionTimeMs,
    });

    const successPayload: McpToolSchemaResultPayload = {
      success: true,
      serverId: payload.serverId,
      toolName: payload.toolName,
      schema: result.data,
      timestamp: new Date().toISOString(),
      executionTimeMs,
    };

    webview.postMessage({
      type: 'MCP_TOOL_SCHEMA_RESULT',
      requestId,
      payload: successPayload,
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'GET_MCP_TOOL_SCHEMA unexpected error', {
      requestId,
      serverId: payload.serverId,
      toolName: payload.toolName,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs,
    });

    const errorPayload: McpToolSchemaResultPayload = {
      success: false,
      serverId: payload.serverId,
      toolName: payload.toolName,
      error: {
        code: 'MCP_UNKNOWN_ERROR',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined,
      },
      timestamp: new Date().toISOString(),
      executionTimeMs,
    };

    webview.postMessage({
      type: 'MCP_TOOL_SCHEMA_RESULT',
      requestId,
      payload: errorPayload,
    });
  }
}

/**
 * Handle REFRESH_MCP_CACHE request from Webview
 *
 * Invalidates all in-memory MCP cache (server list, tools, schemas).
 * Useful when MCP servers are added/removed after initial load.
 *
 * @param payload - Cache refresh request payload
 * @param webview - VSCode Webview instance
 * @param requestId - Request ID for response matching
 */
export async function handleRefreshMcpCache(
  _payload: RefreshMcpCachePayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'REFRESH_MCP_CACHE request started', {
    requestId,
  });

  try {
    // Invalidate all MCP cache
    invalidateAllCache();

    const executionTimeMs = Date.now() - startTime;

    log('INFO', 'REFRESH_MCP_CACHE completed successfully', {
      requestId,
      executionTimeMs,
    });

    const successPayload: McpCacheRefreshedPayload = {
      success: true,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'MCP_CACHE_REFRESHED',
      requestId,
      payload: successPayload,
    });
  } catch (error) {
    const executionTimeMs = Date.now() - startTime;

    log('ERROR', 'REFRESH_MCP_CACHE unexpected error', {
      requestId,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      executionTimeMs,
    });

    const errorPayload: McpCacheRefreshedPayload = {
      success: false,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'MCP_CACHE_REFRESHED',
      requestId,
      payload: errorPayload,
    });
  }
}
