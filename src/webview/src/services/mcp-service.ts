/**
 * MCP Service - Webview to Extension Communication
 *
 * Feature: 001-mcp-node
 * Purpose: Request MCP operations from Extension Host
 *
 * Based on: specs/001-mcp-node/contracts/extension-webview-messages.schema.json
 */

import type {
  GetMcpToolSchemaPayload,
  GetMcpToolsPayload,
  ListMcpServersPayload,
  McpServersResultPayload,
  McpToolReference,
  McpToolSchemaResultPayload,
  McpToolsResultPayload,
} from '../../../shared/types/messages';

// VSCode API bridge (injected by Extension Host)
declare const vscode: {
  postMessage: (message: unknown) => void;
};

/**
 * Request timeout in milliseconds
 */
const REQUEST_TIMEOUT = 30000; // 30 seconds

/**
 * List all configured MCP servers
 *
 * Sends LIST_MCP_SERVERS message to Extension Host and waits for MCP_SERVERS_RESULT response.
 *
 * @param payload - Server list request options (optional scope filter)
 * @returns Promise resolving to server list result
 *
 * @example
 * ```typescript
 * const result = await listMcpServers({ filterByScope: ['user', 'project'] });
 * if (result.success) {
 *   console.log(`Found ${result.servers.length} MCP servers`);
 * }
 * ```
 */
export async function listMcpServers(
  payload?: ListMcpServersPayload
): Promise<McpServersResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `list-servers-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return; // Not our response
      }

      if (message.type === 'MCP_SERVERS_RESULT') {
        window.removeEventListener('message', handler);
        resolve(message.payload);
      } else if (message.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload?.message || 'MCP server list request failed'));
      }
    };

    window.addEventListener('message', handler);

    // Send request to Extension Host
    vscode.postMessage({
      type: 'LIST_MCP_SERVERS',
      requestId,
      payload: payload || {},
    });

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: LIST_MCP_SERVERS took longer than 30 seconds'));
    }, REQUEST_TIMEOUT);
  });
}

/**
 * Get tools from a specific MCP server
 *
 * Sends GET_MCP_TOOLS message to Extension Host and waits for MCP_TOOLS_RESULT response.
 *
 * @param payload - Tool list request with server ID
 * @returns Promise resolving to tool list result
 *
 * @example
 * ```typescript
 * const result = await getMcpTools({ serverId: 'aws-knowledge-mcp' });
 * if (result.success) {
 *   console.log(`Found ${result.tools.length} tools`);
 * }
 * ```
 */
export async function getMcpTools(payload: GetMcpToolsPayload): Promise<McpToolsResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `get-tools-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return; // Not our response
      }

      if (message.type === 'MCP_TOOLS_RESULT') {
        window.removeEventListener('message', handler);
        resolve(message.payload);
      } else if (message.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload?.message || 'MCP tool list request failed'));
      }
    };

    window.addEventListener('message', handler);

    // Send request to Extension Host
    vscode.postMessage({
      type: 'GET_MCP_TOOLS',
      requestId,
      payload,
    });

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: GET_MCP_TOOLS took longer than 30 seconds'));
    }, REQUEST_TIMEOUT);
  });
}

/**
 * Get detailed schema for a specific MCP tool
 *
 * Sends GET_MCP_TOOL_SCHEMA message to Extension Host and waits for MCP_TOOL_SCHEMA_RESULT response.
 *
 * @param payload - Tool schema request with server ID and tool name
 * @returns Promise resolving to tool schema result
 *
 * @example
 * ```typescript
 * const result = await getMcpToolSchema({ serverId: 'aws-knowledge-mcp', toolName: 'get_regional_availability' });
 * if (result.success && result.schema) {
 *   console.log(`Tool has ${result.schema.parameters?.length || 0} parameters`);
 * }
 * ```
 */
export async function getMcpToolSchema(
  payload: GetMcpToolSchemaPayload
): Promise<McpToolSchemaResultPayload> {
  return new Promise((resolve, reject) => {
    const requestId = `get-tool-schema-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message = event.data;
      if (message.requestId !== requestId) {
        return; // Not our response
      }

      if (message.type === 'MCP_TOOL_SCHEMA_RESULT') {
        window.removeEventListener('message', handler);
        resolve(message.payload);
      } else if (message.type === 'ERROR') {
        window.removeEventListener('message', handler);
        reject(new Error(message.payload?.message || 'MCP tool schema request failed'));
      }
    };

    window.addEventListener('message', handler);

    // Send request to Extension Host
    vscode.postMessage({
      type: 'GET_MCP_TOOL_SCHEMA',
      requestId,
      payload,
    });

    // Timeout handling
    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout: GET_MCP_TOOL_SCHEMA took longer than 30 seconds'));
    }, REQUEST_TIMEOUT);
  });
}

/**
 * Search and filter tools by query
 *
 * Client-side filtering of tool list by name/description keywords.
 *
 * @param tools - Array of tools to filter
 * @param query - Search query string
 * @returns Filtered tool list
 *
 * @example
 * ```typescript
 * const filtered = filterTools(allTools, 'region');
 * // Returns tools with "region" in name or description
 * ```
 */
export function filterTools(tools: McpToolReference[], query: string): McpToolReference[] {
  if (!query.trim()) {
    return tools;
  }

  const lowerQuery = query.toLowerCase();

  return tools.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description?.toLowerCase().includes(lowerQuery)
  );
}
