/**
 * Factory for an `McpServer` pre-loaded with the cc-wf-studio workflow tools.
 *
 * Callers own the transport: VSCode binds an `StreamableHTTPServerTransport`
 * around it (port 6282), the standalone bin binds a `StdioServerTransport`.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerWorkflowTools, type WorkflowMcpMode } from './tools.js';
import type { WorkflowIoAdapter } from './types.js';

export interface CreateWorkflowMcpServerOptions {
  /**
   * Optional server identity override. Defaults match the values the existing
   * in-process MCP server has been advertising.
   */
  name?: string;
  version?: string;
  /**
   * Which surface the adapter edits — selects the tool description/error
   * text. `'canvas'` (default) keeps the historical canvas-oriented wording;
   * `'file'` describes the workflow file instead (no editor, no review
   * dialog, no sub-agent auto-creation).
   */
  mode?: WorkflowMcpMode;
}

const DEFAULT_SERVER_NAME = 'cc-workflow-studio';
const DEFAULT_SERVER_VERSION = '1.0.0';

/**
 * Build a configured `McpServer` for the given IO adapter.
 *
 * The returned instance has all workflow tools registered (tools backed by
 * optional adapter capabilities — `export_workflow` — appear only when the
 * adapter implements them). It is not connected to a transport yet — call
 * `server.connect(transport)` separately.
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

  registerWorkflowTools(server, adapter, { mode: options.mode });
  return server;
}
