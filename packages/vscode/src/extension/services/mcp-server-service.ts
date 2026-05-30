/**
 * CC Workflow Studio - Built-in MCP Server Manager (Canvas-mode adapter)
 *
 * Drives the in-process HTTP MCP server (127.0.0.1, default port 6282) and
 * implements `WorkflowIoAdapter` so the `@cc-wf-studio/mcp` factory can wire
 * tool handlers to live webview state via postMessage RPC.
 *
 * Architecture:
 * - HTTP server with `StreamableHTTPServerTransport` in stateless mode
 * - Tool definitions and zod schemas live in `@cc-wf-studio/mcp`
 * - `requestCurrentWorkflow` / `applyWorkflow` send postMessage requests with a
 *   correlation id; responses come back through `handleWorkflowResponse` and
 *   `handleApplyResponse` from `commands/open-editor.ts`
 * - `lastKnownWorkflow` cache is returned when the webview is closed
 */

import * as fs from 'node:fs/promises';
import * as http from 'node:http';
import * as path from 'node:path';
import type { Workflow, WorkflowNode } from '@cc-wf-studio/core';
import {
  type AgentCommandInfo,
  type ApplyWorkflowOptions,
  type ApplyWorkflowResult,
  createWorkflowMcpServer,
  type GetCurrentWorkflowResult,
  type GetWorkflowSchemaResult,
  type HighlightResult,
  type ListAvailableAgentsResult,
  type PlannedSubAgentFile,
  type WorkflowIoAdapter,
} from '@cc-wf-studio/mcp';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import type * as vscode from 'vscode';
import type {
  AiEditingProvider,
  ApplyWorkflowFromMcpResponsePayload,
  GetCurrentWorkflowResponsePayload,
  McpConfigTarget,
} from '../../shared/types/messages';
import { log } from '../extension';
import { getProjectCommandsDir } from '../utils/path-utils';
import { scanAllCommands } from './command-service';
import { generateSubAgentFile, nodeNameToFileName } from './export-service';
import { getDefaultSchemaPath, loadWorkflowSchemaToon } from './schema-loader-service';

const REQUEST_TIMEOUT_MS = 10000;
const APPLY_WITH_REVIEW_TIMEOUT_MS = 120000;

interface PendingRequest<T> {
  resolve: (value: T) => void;
  reject: (reason: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

type PlannedFileWithContent = PlannedSubAgentFile & { content: string };

export class McpServerManager implements WorkflowIoAdapter {
  private httpServer: http.Server | null = null;
  private port: number | null = null;
  private lastKnownWorkflow: Workflow | null = null;
  private webview: vscode.Webview | null = null;
  private extensionPath: string | null = null;
  private writtenConfigs = new Set<McpConfigTarget>();
  private currentProvider: AiEditingProvider | null = null;
  private reviewBeforeApply = true;

  private pendingWorkflowRequests = new Map<
    string,
    PendingRequest<{ workflow: Workflow | null; isStale: boolean; revision: number }>
  >();
  private pendingApplyRequests = new Map<string, PendingRequest<boolean>>();

  async start(extensionPath: string, port?: number): Promise<number> {
    if (this.httpServer) {
      throw new Error('MCP server is already running');
    }

    this.extensionPath = extensionPath;

    this.httpServer = http.createServer(async (req, res) => {
      // DNS rebinding protection: validate Host header
      const host = (req.headers.host || '').split(':')[0];
      if (host !== '127.0.0.1' && host !== 'localhost') {
        log('WARN', 'MCP Server: Rejected request with invalid Host header', {
          host: req.headers.host,
        });
        res.writeHead(403, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Forbidden' }));
        return;
      }

      const origin = req.headers.origin;
      if (origin) {
        let isLocalOrigin = false;
        try {
          const originUrl = new URL(origin);
          const originHost = originUrl.hostname.toLowerCase();
          isLocalOrigin =
            (originHost === '127.0.0.1' || originHost === 'localhost') &&
            originUrl.protocol === 'http:';
        } catch {
          isLocalOrigin = false;
        }
        if (!isLocalOrigin) {
          log('WARN', 'MCP Server: Rejected request with invalid Origin header', {
            origin,
          });
          res.writeHead(403, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Forbidden' }));
          return;
        }
      }

      const url = new URL(req.url || '/', 'http://127.0.0.1');

      if (url.pathname !== '/mcp') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
        return;
      }

      if (req.method === 'POST' || req.method === 'GET' || req.method === 'DELETE') {
        let mcpServer: ReturnType<typeof createWorkflowMcpServer> | undefined;
        try {
          // Per-request server (stateless transport, connect() is one-shot).
          mcpServer = createWorkflowMcpServer(this);

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

    const listenPort = port ?? 0;
    const httpServer = this.httpServer;
    return new Promise<number>((resolve, reject) => {
      httpServer.listen(listenPort, '127.0.0.1', () => {
        const address = httpServer.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
          log('INFO', `MCP Server: Started on port ${this.port}`);
          resolve(this.port);
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      httpServer.on('error', (error: NodeJS.ErrnoException) => {
        if (error.code === 'EADDRINUSE') {
          const msg = `Port ${listenPort} is already in use. Change the port in Settings (cc-wf-studio.mcp.port) or close the application using port ${listenPort}.`;
          log('ERROR', 'MCP Server: Port in use', { port: listenPort });
          reject(new Error(msg));
        } else {
          log('ERROR', 'MCP Server: HTTP server error', { error: error.message });
          reject(error);
        }
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

  setWebview(webview: vscode.Webview | null): void {
    this.webview = webview;
  }

  updateWorkflowCache(workflow: Workflow): void {
    this.lastKnownWorkflow = workflow;
  }

  // -----------------------------------------------------------------------
  // WorkflowIoAdapter implementation
  // -----------------------------------------------------------------------

  async getCurrentWorkflow(): Promise<GetCurrentWorkflowResult> {
    if (this.webview) {
      const correlationId = `mcp-get-${Date.now()}-${Math.random()}`;

      const result = await new Promise<{
        workflow: Workflow | null;
        isStale: boolean;
        revision: number;
      }>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingWorkflowRequests.delete(correlationId);
          if (this.lastKnownWorkflow) {
            resolve({ workflow: this.lastKnownWorkflow, isStale: true, revision: -1 });
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

      if (!result.workflow) {
        return { workflow: null };
      }
      return {
        workflow: result.workflow,
        revision: String(result.revision),
        isStale: result.isStale,
      };
    }

    if (this.lastKnownWorkflow) {
      return {
        workflow: this.lastKnownWorkflow,
        revision: '-1',
        isStale: true,
      };
    }

    return { workflow: null };
  }

  async applyWorkflow(
    workflow: Workflow,
    opts: ApplyWorkflowOptions
  ): Promise<ApplyWorkflowResult> {
    if (!this.webview) {
      return {
        success: false,
        error: 'Webview is not open. Please open CC Workflow Studio first.',
      };
    }

    const expectedRevision =
      opts.expectedRevision !== undefined ? Number(opts.expectedRevision) : undefined;

    const requireConfirmation = this.reviewBeforeApply;
    const timeoutMs = requireConfirmation ? APPLY_WITH_REVIEW_TIMEOUT_MS : REQUEST_TIMEOUT_MS;
    const correlationId = `mcp-apply-${Date.now()}-${Math.random()}`;

    try {
      const success = await new Promise<boolean>((resolve, reject) => {
        const timer = setTimeout(() => {
          this.pendingApplyRequests.delete(correlationId);
          reject(new Error('Timeout waiting for workflow apply confirmation'));
        }, timeoutMs);

        this.pendingApplyRequests.set(correlationId, { resolve, reject, timer });

        this.webview?.postMessage({
          type: 'APPLY_WORKFLOW_FROM_MCP',
          payload: {
            correlationId,
            workflow,
            requireConfirmation,
            description: opts.description,
            ...(opts.plannedFiles && opts.plannedFiles.length > 0
              ? { plannedFiles: opts.plannedFiles }
              : {}),
            ...(expectedRevision !== undefined ? { expectedRevision } : {}),
          },
        });
      });
      return { success };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  async highlightGroupNode(groupNodeId: string | null): Promise<HighlightResult> {
    this.webview?.postMessage({
      type: 'HIGHLIGHT_GROUP_NODE',
      payload: { groupNodeId },
    });
    return { success: true };
  }

  async getWorkflowSchemaToon(): Promise<GetWorkflowSchemaResult> {
    if (!this.extensionPath) {
      return { success: false, error: 'Extension path not available' };
    }
    const schemaPath = getDefaultSchemaPath(this.extensionPath);
    const result = await loadWorkflowSchemaToon(schemaPath);
    if (!result.success || !result.schemaString) {
      return {
        success: false,
        error: result.error?.message || 'Failed to load schema',
      };
    }
    return { success: true, schema: result.schemaString };
  }

  async listAvailableAgents(_includeContent: boolean): Promise<ListAvailableAgentsResult> {
    const { user, project } = await scanAllCommands();
    const map = (cmd: (typeof user)[number]): AgentCommandInfo => ({
      name: cmd.name,
      description: cmd.description,
      scope: cmd.scope,
      commandPath: cmd.commandPath,
      promptContent: cmd.promptContent,
    });
    return {
      user: user.map(map),
      project: project.map(map),
    };
  }

  async planAndPersistSubAgentFiles(workflow: Workflow): Promise<PlannedSubAgentFile[]> {
    const planned = await planSubAgentFiles(workflow);
    if (planned.length > 0) {
      await executeSubAgentFileCreation(planned);
    }
    return planned.map(({ content: _content, ...rest }) => rest);
  }

  // -----------------------------------------------------------------------
  // Webview response handlers (invoked from commands/open-editor.ts)
  // -----------------------------------------------------------------------

  handleWorkflowResponse(payload: GetCurrentWorkflowResponsePayload): void {
    const pending = this.pendingWorkflowRequests.get(payload.correlationId);
    if (pending) {
      clearTimeout(pending.timer);
      this.pendingWorkflowRequests.delete(payload.correlationId);

      if (payload.workflow) {
        this.lastKnownWorkflow = payload.workflow;
      }

      pending.resolve({
        workflow: payload.workflow,
        isStale: false,
        revision: payload.revision,
      });
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

// ---------------------------------------------------------------------------
// Sub-agent file planning helpers (moved from the deleted mcp-server-tools.ts).
// They live next to the canvas adapter because the auto-create flow is
// canvas-mode-specific: only the manager has the right project dir context.
// ---------------------------------------------------------------------------

async function planSubAgentFiles(workflow: unknown): Promise<PlannedFileWithContent[]> {
  if (typeof workflow !== 'object' || workflow === null) {
    return [];
  }

  const wf = workflow as { nodes?: WorkflowNode[] };
  if (!Array.isArray(wf.nodes)) {
    return [];
  }

  const subAgentNodes = wf.nodes.filter(
    (n) =>
      n.type === 'subAgent' &&
      !(n.data as { commandFilePath?: string }).commandFilePath &&
      !(n.data as { builtInType?: string }).builtInType
  );

  if (subAgentNodes.length === 0) {
    return [];
  }

  const projectAgentsDir = getProjectCommandsDir();
  if (!projectAgentsDir) {
    return [];
  }

  const planned: PlannedFileWithContent[] = [];

  for (const node of subAgentNodes) {
    const data = node.data as {
      description?: string;
      agentDefinition?: string;
      prompt?: string;
      model?: string;
      tools?: string;
      memory?: string;
      color?: string;
      commandFilePath?: string;
      commandScope?: string;
      outputPorts?: number;
    };

    const baseName = nodeNameToFileName(data.description || node.name || 'sub-agent');

    let fileName = `${baseName}.md`;
    let filePath = path.join(projectAgentsDir, fileName);
    let suffix = 1;
    try {
      while (
        await fs
          .access(filePath)
          .then(() => true)
          .catch(() => false)
      ) {
        fileName = `${baseName}-${suffix}.md`;
        filePath = path.join(projectAgentsDir, fileName);
        suffix++;
      }
    } catch {
      // fs.access throws on not-found; that's the happy path.
    }

    const pseudoNode = {
      id: node.id,
      type: 'subAgent' as const,
      name: data.description || node.name || 'sub-agent',
      position: node.position,
      data: {
        description: data.description || '',
        agentDefinition: data.agentDefinition || '',
        prompt: data.prompt || '',
        model: data.model,
        tools: data.tools,
        memory: data.memory as 'user' | 'project' | 'local' | undefined,
        color: data.color,
        outputPorts: data.outputPorts || 1,
      },
    };

    const content = generateSubAgentFile(pseudoNode);

    // Mutate in-place so downstream validation passes.
    data.commandFilePath = filePath;
    data.commandScope = 'project';

    planned.push({
      nodeId: node.id,
      nodeName: data.description || node.name || 'sub-agent',
      filePath,
      content,
    });
  }

  return planned;
}

async function executeSubAgentFileCreation(
  plannedFiles: PlannedFileWithContent[]
): Promise<string[]> {
  if (plannedFiles.length === 0) return [];

  const dir = path.dirname(plannedFiles[0].filePath);
  const dotClaudeDir = path.dirname(dir);
  await fs.mkdir(dotClaudeDir, { recursive: true });
  await fs.mkdir(dir, { recursive: true });

  const createdFiles: string[] = [];
  for (const file of plannedFiles) {
    await fs.writeFile(file.filePath, file.content, 'utf-8');
    createdFiles.push(file.filePath);
  }
  return createdFiles;
}
