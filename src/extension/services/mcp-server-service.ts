/**
 * CC Workflow Studio - Built-in MCP Server Manager
 *
 * Provides an MCP server that external AI agents (Claude Code, Roo Code, Copilot, Codex, etc.)
 * can connect to for workflow CRUD operations.
 *
 * Architecture:
 * - HTTP server on 127.0.0.1 (localhost only) with dynamic port
 * - StreamableHTTPServerTransport in stateless mode (no session management)
 * - Webview communication via postMessage for workflow data
 * - lastKnownWorkflow cache for when Webview is closed
 */

import * as http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type * as vscode from 'vscode';
import type {
  AiEditingProvider,
  ApplyWorkflowFromMcpResponsePayload,
  GetCurrentWorkflowResponsePayload,
  McpConfigTarget,
} from '../../shared/types/messages';
import type { Workflow } from '../../shared/types/workflow-definition';
import { log } from '../extension';
import { registerMcpTools } from './mcp-server-tools';

const REQUEST_TIMEOUT_MS = 10000;

interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class McpServerManager {
  private httpServer: http.Server | null = null;
  private port: number | null = null;
  private lastKnownWorkflow: Workflow | null = null;
  private webview: vscode.Webview | null = null;
  private extensionPath: string | null = null;
  private writtenConfigs = new Set<McpConfigTarget>();
  private currentProvider: AiEditingProvider | null = null;

  private pendingWorkflowRequests = new Map<
    string,
    PendingRequest<{ workflow: Workflow | null; isStale: boolean }>
  >();
  private pendingApplyRequests = new Map<string, PendingRequest<boolean>>();

  async start(extensionPath: string): Promise<number> {
    if (this.httpServer) {
      throw new Error('MCP server is already running');
    }

    this.extensionPath = extensionPath;

    // Create HTTP server
    this.httpServer = http.createServer(async (req, res) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);

      if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      // Handle MCP requests
      if (req.method === 'POST' || req.method === 'GET' || req.method === 'DELETE') {
        let mcpServer: McpServer | undefined;
        try {
          // Create a new MCP server + transport per request (stateless mode)
          // McpServer.connect() can only be called once per instance,
          // so we must create a fresh instance for each request.
          mcpServer = new McpServer({
            name: 'cc-workflow-studio',
            version: '1.0.0',
          });
          registerMcpTools(mcpServer, this);

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined, // stateless
          });

          await mcpServer.connect(transport);
          await transport.handleRequest(req, res);
        } catch (error) {
          log('ERROR', 'MCP Server: Failed to handle request', {
            method: req.method,
            error: error instanceof Error ? error.message : String(error),
          });
          if (!res.headersSent) {
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Internal server error' }));
          }
        } finally {
          // Clean up to prevent EventEmitter listener accumulation
          if (mcpServer) {
            await mcpServer.close().catch(() => {});
          }
        }
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    });

    // Start listening on dynamic port, localhost only
    const httpServer = this.httpServer;
    return new Promise<number>((resolve, reject) => {
      httpServer.listen(0, '127.0.0.1', () => {
        const address = httpServer.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
          log('INFO', `MCP Server: Started on port ${this.port}`);
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      httpServer.on('error', (error) => {
        log('ERROR', 'MCP Server: HTTP server error', {
          error: error.message,
        });
        reject(error);
      });
    });
  }

  async stop(): Promise<void> {
    this.writtenConfigs.clear();
    this.currentProvider = null;

    if (this.httpServer) {
      const server = this.httpServer;
      this.httpServer = null;
      this.port = null;

      return new Promise<void>((resolve) => {
        // Force close after timeout to prevent hanging
        const forceCloseTimer = setTimeout(() => {
          log('WARN', 'MCP Server: Force closing after timeout');
          server.closeAllConnections();
          resolve();
        }, 3000);

        server.close(() => {
          clearTimeout(forceCloseTimer);
          log('INFO', 'MCP Server: Stopped');
          resolve();
        });
      });
    }

    this.port = null;
  }

  isRunning(): boolean {
    return !!this.httpServer?.listening;
  }

  getPort(): number | null {
    return this.port;
  }

  getExtensionPath(): string | null {
    return this.extensionPath;
  }

  getWrittenConfigs(): Set<McpConfigTarget> {
    return this.writtenConfigs;
  }

  addWrittenConfigs(targets: McpConfigTarget[]): void {
    for (const t of targets) {
      this.writtenConfigs.add(t);
    }
  }

  setCurrentProvider(provider: AiEditingProvider | null): void {
    this.currentProvider = provider;
  }

  getCurrentProvider(): AiEditingProvider | null {
    return this.currentProvider;
  }

  // Webview lifecycle
  setWebview(webview: vscode.Webview | null): void {
    this.webview = webview;
  }

  updateWorkflowCache(workflow: Workflow): void {
    this.lastKnownWorkflow = workflow;
  }

  // Called by MCP tools to get current workflow
  async requestCurrentWorkflow(): Promise<{ workflow: Workflow | null; isStale: boolean }> {
    // If webview is available, request fresh data
    if (this.webview) {
      const correlationId = `mcp-get-${Date.now()}-${Math.random()}`;

      return new Promise<{ workflow: Workflow | null; isStale: boolean }>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingWorkflowRequests.delete(correlationId);
          // Fallback to cache on timeout
          if (this.lastKnownWorkflow) {
            resolve({ workflow: this.lastKnownWorkflow, isStale: true });
          } else {
            reject(new Error('Timeout waiting for workflow from Webview'));
          }
        }, REQUEST_TIMEOUT_MS);

        this.pendingWorkflowRequests.set(correlationId, { resolve, reject, timer });

        this.webview?.postMessage({
          type: 'GET_CURRENT_WORKFLOW_REQUEST',
          payload: { correlationId },
        });
      });
    }

    // Webview is closed, return cached workflow
    if (this.lastKnownWorkflow) {
      return { workflow: this.lastKnownWorkflow, isStale: true };
    }

    return { workflow: null, isStale: false };
  }

  // Called by MCP tools to apply workflow to canvas
  async applyWorkflowToCanvas(workflow: Workflow): Promise<boolean> {
    if (!this.webview) {
      throw new Error('Webview is not open. Please open CC Workflow Studio first.');
    }

    const correlationId = `mcp-apply-${Date.now()}-${Math.random()}`;

    return new Promise<boolean>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingApplyRequests.delete(correlationId);
        reject(new Error('Timeout waiting for workflow apply confirmation'));
      }, REQUEST_TIMEOUT_MS);

      this.pendingApplyRequests.set(correlationId, { resolve, reject, timer });

      this.webview?.postMessage({
        type: 'APPLY_WORKFLOW_FROM_MCP',
        payload: { correlationId, workflow },
      });
    });
  }

  // Response handlers called from open-editor.ts
  handleWorkflowResponse(payload: GetCurrentWorkflowResponsePayload): void {
    const pending = this.pendingWorkflowRequests.get(payload.correlationId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingWorkflowRequests.delete(payload.correlationId);

      // Update cache
      if (payload.workflow) {
        this.lastKnownWorkflow = payload.workflow;
      }

      pending.resolve({ workflow: payload.workflow, isStale: false });
    }
  }

  handleApplyResponse(payload: ApplyWorkflowFromMcpResponsePayload): void {
    const pending = this.pendingApplyRequests.get(payload.correlationId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingApplyRequests.delete(payload.correlationId);

      if (payload.success) {
        pending.resolve(true);
      } else {
        pending.reject(new Error(payload.error || 'Failed to apply workflow'));
      }
    }
  }
}
