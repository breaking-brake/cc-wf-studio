/**
 * Factory for an `McpServer` pre-loaded with the cc-wf-studio workflow tools.
 *
 * Callers own the transport: VSCode binds an `StreamableHTTPServerTransport`
 * around it (port 6282), the standalone bin binds a `StdioServerTransport`.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWorkflowTools } from './tools.js';
import type { WorkflowIoAdapter } from './types.js';

export interface CreateWorkflowMcpServerOptions {
  /**
   * Optional server identity override. Defaults match the values the existing
   * in-process MCP server has been advertising.
   */
  name?: string;
  version?: string;
}

const DEFAULT_SERVER_NAME = 'cc-workflow-studio';
const DEFAULT_SERVER_VERSION = '1.0.0';

/**
 * Build a configured `McpServer` for the given IO adapter.
 *
 * The returned instance has all 6 workflow tools registered. It is not
 * connected to a transport yet — call `server.connect(transport)` separately.
 */
export function createWorkflowMcpServer(
  adapter: WorkflowIoAdapter,
  options: CreateWorkflowMcpServerOptions = {}
): McpServer {
  const server = new McpServer(
    {
      name: options.name ?? DEFAULT_SERVER_NAME,
      version: options.version ?? DEFAULT_SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  registerWorkflowTools(server, adapter);
  return server;
}
