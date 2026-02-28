/**
 * CC Workflow Studio - Built-in MCP Server Manager (Core)
 *
 * Platform-agnostic MCP server that external AI agents can connect to
 * for workflow CRUD operations.
 *
 * Supports two modes:
 * - UI mode: communicates with canvas via IMessageTransport (VSCode/Electron)
 * - Headless mode: directly operates on files via IWorkflowProvider
 */

import * as http from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type { IMessageTransport } from '../interfaces/message-transport.js';
import type { IWorkflowProvider } from '../interfaces/workflow-provider.js';
import type {
  AiEditingProvider,
  ApplyWorkflowFromMcpResponsePayload,
  GetCurrentWorkflowResponsePayload,
  McpConfigTarget,
} from '../types/messages.js';
import type { Workflow } from '../types/workflow-definition.js';
import { log } from './logger-holder.js';
import { registerMcpTools } from './mcp-server-tools.js';

const REQUEST_TIMEOUT_MS = 10000;
const APPLY_WITH_REVIEW_TIMEOUT_MS = 120000;

interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class McpServerManager {
  private httpServer: http.Server | null = null;
  private port: number | null = null;
  private lastKnownWorkflow: Workflow | null = null;
  private transport: IMessageTransport | null = null;
  private workflowProvider: IWorkflowProvider | null = null;
  private extensionPath: string | null = null;
  private writtenConfigs = new Set<McpConfigTarget>();
  private currentProvider: AiEditingProvider | null = null;
  private reviewBeforeApply = true;

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
          mcpServer = new McpServer({
            name: 'cc-workflow-studio',
            version: '1.0.0',
          });
          registerMcpTools(mcpServer, this);

          const transport = new StreamableHTTPServerTransport({
            sessionIdGenerator: undefined,
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

  setReviewBeforeApply(value: boolean): void {
    this.reviewBeforeApply = value;
  }

  getReviewBeforeApply(): boolean {
    return this.reviewBeforeApply;
  }

  // UI mode: connect to canvas via message transport
  setTransport(transport: IMessageTransport | null): void {
    this.transport = transport;
  }

  // Headless mode: directly operate on filesystem
  setWorkflowProvider(provider: IWorkflowProvider): void {
    this.workflowProvider = provider;
  }

  updateWorkflowCache(workflow: Workflow): void {
    this.lastKnownWorkflow = workflow;
  }

  // Called by MCP tools to get current workflow
  async requestCurrentWorkflow(): Promise<{ workflow: Workflow | null; isStale: boolean }> {
    // UI mode: request fresh data from canvas via transport
    if (this.transport) {
      const correlationId = `mcp-get-${Date.now()}-${Math.random()}`;

      return new Promise<{ workflow: Workflow | null; isStale: boolean }>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingWorkflowRequests.delete(correlationId);
          if (this.lastKnownWorkflow) {
            resolve({ workflow: this.lastKnownWorkflow, isStale: true });
          } else {
            reject(new Error('Timeout waiting for workflow from canvas'));
          }
        }, REQUEST_TIMEOUT_MS);

        this.pendingWorkflowRequests.set(correlationId, { resolve, reject, timer });

        this.transport?.postMessage({
          type: 'GET_CURRENT_WORKFLOW_REQUEST',
          payload: { correlationId },
        });
      });
    }

    // Headless mode: read directly from filesystem
    if (this.workflowProvider) {
      return this.workflowProvider.getCurrentWorkflow();
    }

    // Fallback: return cached workflow
    if (this.lastKnownWorkflow) {
      return { workflow: this.lastKnownWorkflow, isStale: true };
    }

    return { workflow: null, isStale: false };
  }

  // Called by MCP tools to apply workflow to canvas
  async applyWorkflowToCanvas(workflow: Workflow, description?: string): Promise<boolean> {
    // UI mode: send to canvas via transport
    if (this.transport) {
      const requireConfirmation = this.reviewBeforeApply;
      const timeoutMs = requireConfirmation ? APPLY_WITH_REVIEW_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
      const correlationId = `mcp-apply-${Date.now()}-${Math.random()}`;

      return new Promise<boolean>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingApplyRequests.delete(correlationId);
          reject(new Error('Timeout waiting for workflow apply confirmation'));
        }, timeoutMs);

        this.pendingApplyRequests.set(correlationId, { resolve, reject, timer });

        this.transport?.postMessage({
          type: 'APPLY_WORKFLOW_FROM_MCP',
          payload: { correlationId, workflow, requireConfirmation, description },
        });
      });
    }

    // Headless mode: write directly to filesystem
    if (this.workflowProvider) {
      return this.workflowProvider.applyWorkflow(workflow, description);
    }

    throw new Error('No transport or workflow provider available. Please open CC Workflow Studio.');
  }

  // Response handlers called from host (VSCode/Electron)
  handleWorkflowResponse(payload: GetCurrentWorkflowResponsePayload): void {
    const pending = this.pendingWorkflowRequests.get(payload.correlationId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingWorkflowRequests.delete(payload.correlationId);

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
