/**
 * MCP Operations - Extension Host Message Handlers
 *
 * Feature: 001-mcp-node
 * Purpose: Handle Webview requests for MCP server and tool operations
 *
 * Based on: specs/001-mcp-node/contracts/extension-webview-messages.schema.json
 */

import type * as vscode from 'vscode';
import type {
  GetMcpToolsPayload,
  ListMcpServersPayload,
  McpServersResultPayload,
  McpToolsResultPayload,
} from '../../shared/types/messages';
import { log } from '../extension';
import {
  getCachedServerList,
  getCachedTools,
  setCachedServerList,
  setCachedTools,
} from '../services/mcp-cache-service';
import { listServers, listTools } from '../services/mcp-cli-service';

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

    // Cache miss - execute CLI command
    const result = await listServers();
    const executionTimeMs = Date.now() - startTime;

    if (!result.success || !result.data) {
      log('ERROR', 'LIST_MCP_SERVERS failed', {
        requestId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
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
    setCachedServerList(result.data);

    log('INFO', 'LIST_MCP_SERVERS completed successfully', {
      requestId,
      serverCount: result.data.length,
      executionTimeMs,
    });

    // Apply scope filter if specified
    const filteredServers = payload.options?.filterByScope
      ? result.data.filter((server) => payload.options?.filterByScope?.includes(server.scope))
      : result.data;

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
 * Handle GET_MCP_TOOLS request from Webview (T019)
 *
 * Executes 'claude mcp list-tools <server-name>' CLI command to retrieve tools from a specific MCP server.
 * Supports cache optimization.
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
    // Check cache first
    const cached = getCachedTools(payload.serverId);
    if (cached) {
      const executionTimeMs = Date.now() - startTime;
      log('INFO', 'GET_MCP_TOOLS cache hit', {
        requestId,
        serverId: payload.serverId,
        toolCount: cached.length,
        executionTimeMs,
      });

      const resultPayload: McpToolsResultPayload = {
        success: true,
        serverId: payload.serverId,
        tools: cached,
        timestamp: new Date().toISOString(),
        executionTimeMs,
      };

      webview.postMessage({
        type: 'MCP_TOOLS_RESULT',
        requestId,
        payload: resultPayload,
      });
      return;
    }

    // Cache miss - execute CLI command
    const result = await listTools(payload.serverId);
    const executionTimeMs = Date.now() - startTime;

    if (!result.success || !result.data) {
      log('ERROR', 'GET_MCP_TOOLS failed', {
        requestId,
        serverId: payload.serverId,
        errorCode: result.error?.code,
        errorMessage: result.error?.message,
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

    // Success - cache and return
    setCachedTools(payload.serverId, result.data);

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
