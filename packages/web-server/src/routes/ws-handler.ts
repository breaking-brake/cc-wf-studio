/**
 * CC Workflow Studio - WebSocket Message Router
 *
 * Routes messages from the browser client to the appropriate handlers,
 * mirroring the message routing in the VSCode extension's open-editor.ts.
 * Uses the same message protocol as the VSCode postMessage API.
 */

import {
  FileService,
  log,
  type McpServerManager,
  migrateWorkflow,
  NodeFileSystem,
  validateAIGeneratedWorkflow,
} from '@cc-wf-studio/core';
import type { WSContext, WSEvents } from 'hono/ws';
import { WebSocketMessageTransport } from '../adapters/ws-message-transport.js';
import { WebDialogService } from '../services/web-dialog-service.js';

export type WebSocketMessageSender = (message: {
  type: string;
  requestId?: string;
  payload?: unknown;
}) => void;

/**
 * Server-side state shared across WebSocket connections
 */
interface ServerState {
  fileService: FileService | null;
  dialogService: WebDialogService;
  transport: WebSocketMessageTransport;
  mcpManager: McpServerManager | null;
  workspacePath: string;
  globalState: Map<string, unknown>;
}

function getWorkspacePath(): string {
  return process.env.WORKSPACE_PATH ?? process.cwd();
}

function createState(): ServerState {
  const workspacePath = getWorkspacePath();
  const fs = new NodeFileSystem();
  const dialogService = new WebDialogService();
  const transport = new WebSocketMessageTransport();

  return {
    fileService: new FileService(fs, workspacePath),
    dialogService,
    transport,
    mcpManager: null,
    workspacePath,
    globalState: new Map(),
  };
}

export function setupWebSocketHandler(): (c: unknown) => WSEvents {
  const state = createState();

  return (_c: unknown) => {
    let ws: WSContext | null = null;

    const send: WebSocketMessageSender = (message) => {
      if (ws) {
        ws.send(JSON.stringify(message));
      }
    };

    return {
      onOpen(_evt, wsCtx) {
        ws = wsCtx;
        state.dialogService.setSender(send);
        state.transport.setSender(send);
        log('INFO', 'WebSocket client connected');
      },

      async onMessage(evt, _wsCtx) {
        let message: { type: string; requestId?: string; payload?: Record<string, unknown> };
        try {
          const data = typeof evt.data === 'string' ? evt.data : evt.data.toString();
          message = JSON.parse(data);
        } catch {
          log('ERROR', 'Failed to parse WebSocket message');
          return;
        }

        const { type, requestId, payload } = message;

        const reply = (responseType: string, responsePayload?: unknown): void => {
          send({ type: responseType, requestId, payload: responsePayload });
        };

        try {
          await handleMessage(type, payload, requestId, reply, state, send);
        } catch (error) {
          log('ERROR', `Error handling message ${type}`, {
            error: error instanceof Error ? error.message : String(error),
          });
          reply('ERROR', {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      },

      onClose() {
        ws = null;
        state.dialogService.setSender(null);
        state.transport.setSender(null);
        log('INFO', 'WebSocket client disconnected');
      },

      onError(evt) {
        log('ERROR', 'WebSocket error', { error: String(evt) });
      },
    };
  };
}

async function handleMessage(
  type: string,
  payload: Record<string, unknown> | undefined,
  requestId: string | undefined,
  reply: (type: string, payload?: unknown) => void,
  state: ServerState,
  send: WebSocketMessageSender
): Promise<void> {
  const { fileService } = state;

  switch (type) {
    // ========================================================================
    // Lifecycle
    // ========================================================================
    case 'WEBVIEW_READY': {
      const hasAcceptedTerms = state.globalState.get('hasAcceptedTerms') ?? false;
      reply('INITIAL_STATE', { hasAcceptedTerms });
      break;
    }

    case 'ACCEPT_TERMS': {
      state.globalState.set('hasAcceptedTerms', true);
      reply('INITIAL_STATE', { hasAcceptedTerms: true });
      break;
    }

    case 'CANCEL_TERMS': {
      // In web mode, just acknowledge — can't close browser tab
      break;
    }

    // ========================================================================
    // Workflow CRUD
    // ========================================================================
    case 'SAVE_WORKFLOW': {
      if (!fileService || !payload?.workflow) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Workflow is required' });
        break;
      }
      const workflow = payload.workflow as Record<string, unknown>;
      await fileService.ensureWorkflowsDirectory();
      const filePath = fileService.getWorkflowFilePath(workflow.name as string);

      // Check if file exists
      if (await fileService.fileExists(filePath)) {
        // In web mode, always overwrite (dialog confirmation done client-side)
        // The client should handle overwrite confirmation via UI
      }

      const content = JSON.stringify(workflow, null, 2);
      await fileService.writeFile(filePath, content);

      // Update MCP manager cache if active
      if (state.mcpManager) {
        state.mcpManager.updateWorkflowCache(workflow as never);
      }

      reply('SAVE_SUCCESS', {
        filePath,
        timestamp: new Date().toISOString(),
      });
      break;
    }

    case 'LOAD_WORKFLOW_LIST': {
      if (!fileService) {
        reply('ERROR', { code: 'LOAD_FAILED', message: 'File service not initialized' });
        break;
      }
      await fileService.ensureWorkflowsDirectory();
      const names = await fileService.listWorkflowFiles();
      const workflows = [];
      for (const name of names) {
        try {
          const fp = fileService.getWorkflowFilePath(name);
          const content = await fileService.readFile(fp);
          const parsed = JSON.parse(content);
          workflows.push({
            id: name,
            name: parsed.name || name,
            description: parsed.description,
            updatedAt: parsed.updatedAt || new Date().toISOString(),
          });
        } catch {
          log('WARN', `Failed to parse workflow: ${name}`);
        }
      }
      reply('WORKFLOW_LIST_LOADED', { workflows });
      break;
    }

    case 'LOAD_WORKFLOW': {
      if (!fileService || !payload?.workflowId) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Workflow ID is required' });
        break;
      }
      const workflowId = payload.workflowId as string;
      const fp = fileService.getWorkflowFilePath(workflowId);
      if (!(await fileService.fileExists(fp))) {
        reply('ERROR', { code: 'LOAD_FAILED', message: `Workflow "${workflowId}" not found` });
        break;
      }
      const raw = await fileService.readFile(fp);
      const parsed = JSON.parse(raw);
      const migrated = migrateWorkflow(parsed);
      reply('LOAD_WORKFLOW', { workflow: migrated });
      break;
    }

    case 'EXPORT_WORKFLOW': {
      if (!fileService || !payload?.workflow) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Export payload is required' });
        break;
      }
      const workflow = payload.workflow as Record<string, unknown>;
      const validation = validateAIGeneratedWorkflow(workflow as never);
      if (!validation.valid) {
        const errorMessages = validation.errors
          .map((e: { message: string }) => e.message)
          .join('\n');
        reply('ERROR', { code: 'EXPORT_FAILED', message: `Validation failed:\n${errorMessages}` });
        break;
      }
      // Use dynamic import for export service to avoid circular dependencies
      const { handleExportWorkflowWeb } = await import('../handlers/workflow-handlers.js');
      await handleExportWorkflowWeb(fileService, payload as never, requestId, reply);
      break;
    }

    case 'OPEN_FILE_PICKER': {
      // File picker not available in web mode — send cancel
      reply('FILE_PICKER_CANCELLED');
      break;
    }

    // ========================================================================
    // State
    // ========================================================================
    case 'STATE_UPDATE': {
      // State persistence — store in memory
      log('INFO', 'State update received');
      break;
    }

    case 'CONFIRM_OVERWRITE': {
      // Handled client-side in web mode
      break;
    }

    // ========================================================================
    // Skill Operations
    // ========================================================================
    case 'BROWSE_SKILLS': {
      const { handleBrowseSkillsWeb } = await import('../handlers/skill-handlers.js');
      await handleBrowseSkillsWeb(state.workspacePath, requestId, reply);
      break;
    }

    case 'CREATE_SKILL': {
      if (!payload) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Skill creation payload is required' });
        break;
      }
      const { handleCreateSkillWeb } = await import('../handlers/skill-handlers.js');
      await handleCreateSkillWeb(state.workspacePath, payload as never, requestId, reply);
      break;
    }

    case 'VALIDATE_SKILL_FILE': {
      if (!payload) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Skill file path is required' });
        break;
      }
      const { handleValidateSkillFileWeb } = await import('../handlers/skill-handlers.js');
      await handleValidateSkillFileWeb(payload as never, requestId, reply);
      break;
    }

    // ========================================================================
    // AI Refinement
    // ========================================================================
    case 'REFINE_WORKFLOW': {
      if (!payload) {
        reply('REFINEMENT_FAILED', {
          error: { code: 'VALIDATION_ERROR', message: 'Refinement payload is required' },
          executionTimeMs: 0,
          timestamp: new Date().toISOString(),
        });
        break;
      }
      const { handleRefineWorkflowWeb } = await import('../handlers/ai-handlers.js');
      await handleRefineWorkflowWeb(payload as never, state.workspacePath, requestId, reply, send);
      break;
    }

    case 'CANCEL_REFINEMENT': {
      if (payload) {
        const { handleCancelRefinementWeb } = await import('../handlers/ai-handlers.js');
        await handleCancelRefinementWeb(payload as never, requestId, reply);
      }
      break;
    }

    case 'CLEAR_CONVERSATION': {
      if (payload) {
        const { handleClearConversationWeb } = await import('../handlers/ai-handlers.js');
        await handleClearConversationWeb(payload as never, requestId, reply);
      }
      break;
    }

    case 'GENERATE_WORKFLOW_NAME': {
      if (!payload) {
        reply('ERROR', {
          code: 'VALIDATION_ERROR',
          message: 'Generate workflow name payload is required',
        });
        break;
      }
      const { handleGenerateWorkflowNameWeb } = await import('../handlers/ai-handlers.js');
      await handleGenerateWorkflowNameWeb(payload as never, state.workspacePath, requestId, reply);
      break;
    }

    case 'CANCEL_WORKFLOW_NAME': {
      if (payload?.targetRequestId) {
        const { handleCancelGenerationWeb } = await import('../handlers/ai-handlers.js');
        await handleCancelGenerationWeb(payload.targetRequestId as string);
      }
      break;
    }

    // ========================================================================
    // Multi-Agent Export & Run (Claude Code / Copilot / Codex / Roo / Gemini / Antigravity / Cursor)
    // ========================================================================
    case 'RUN_AS_SLASH_COMMAND': {
      if (!fileService || !payload?.workflow) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Workflow is required' });
        break;
      }
      const { handleRunAsSlashCommandWeb } = await import('../handlers/export-handlers.js');
      await handleRunAsSlashCommandWeb(
        fileService,
        payload.workflow as never,
        state.workspacePath,
        requestId,
        reply,
        send
      );
      break;
    }

    case 'EXPORT_FOR_COPILOT':
    case 'EXPORT_FOR_COPILOT_CLI':
    case 'EXPORT_FOR_CODEX_CLI':
    case 'EXPORT_FOR_ROO_CODE':
    case 'EXPORT_FOR_GEMINI_CLI':
    case 'EXPORT_FOR_ANTIGRAVITY':
    case 'EXPORT_FOR_CURSOR': {
      if (!fileService || !payload?.workflow) {
        const failType = `${type}_FAILED`;
        reply(failType, {
          errorCode: 'UNKNOWN_ERROR',
          errorMessage: 'Workflow is required',
          timestamp: new Date().toISOString(),
        });
        break;
      }
      const { handleAgentExportWeb } = await import('../handlers/export-handlers.js');
      await handleAgentExportWeb(
        type,
        fileService,
        payload as never,
        state.workspacePath,
        requestId,
        reply
      );
      break;
    }

    case 'RUN_FOR_COPILOT':
    case 'RUN_FOR_COPILOT_CLI':
    case 'RUN_FOR_CODEX_CLI':
    case 'RUN_FOR_ROO_CODE':
    case 'RUN_FOR_GEMINI_CLI':
    case 'RUN_FOR_ANTIGRAVITY':
    case 'RUN_FOR_CURSOR': {
      if (!fileService || !payload?.workflow) {
        const failType = `${type}_FAILED`;
        reply(failType, {
          errorCode: 'UNKNOWN_ERROR',
          errorMessage: 'Workflow is required',
          timestamp: new Date().toISOString(),
        });
        break;
      }
      const { handleAgentRunWeb } = await import('../handlers/export-handlers.js');
      await handleAgentRunWeb(
        type,
        fileService,
        payload as never,
        state.workspacePath,
        requestId,
        reply,
        send
      );
      break;
    }

    case 'LIST_COPILOT_MODELS': {
      // VSCode LM API not available in web mode — return empty list
      reply('COPILOT_MODELS_LIST', { models: [] });
      break;
    }

    // ========================================================================
    // MCP Integration
    // ========================================================================
    case 'LIST_MCP_SERVERS': {
      const { handleListMcpServersWeb } = await import('../handlers/mcp-handlers.js');
      await handleListMcpServersWeb(payload ?? {}, requestId, reply);
      break;
    }

    case 'GET_MCP_TOOLS': {
      if (!payload?.serverId) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Server ID is required' });
        break;
      }
      const { handleGetMcpToolsWeb } = await import('../handlers/mcp-handlers.js');
      await handleGetMcpToolsWeb(payload as never, requestId, reply);
      break;
    }

    case 'GET_MCP_TOOL_SCHEMA': {
      if (!payload?.serverId || !payload?.toolName) {
        reply('ERROR', {
          code: 'VALIDATION_ERROR',
          message: 'Server ID and Tool Name are required',
        });
        break;
      }
      const { handleGetMcpToolSchemaWeb } = await import('../handlers/mcp-handlers.js');
      await handleGetMcpToolSchemaWeb(payload as never, requestId, reply);
      break;
    }

    case 'REFRESH_MCP_CACHE': {
      const { handleRefreshMcpCacheWeb } = await import('../handlers/mcp-handlers.js');
      await handleRefreshMcpCacheWeb(payload ?? {}, requestId, reply);
      break;
    }

    case 'START_MCP_SERVER': {
      const { handleStartMcpServerWeb } = await import('../handlers/mcp-handlers.js');
      state.mcpManager = await handleStartMcpServerWeb(
        state.mcpManager,
        state.transport,
        state.workspacePath,
        payload as never,
        requestId,
        reply
      );
      break;
    }

    case 'STOP_MCP_SERVER': {
      const { handleStopMcpServerWeb } = await import('../handlers/mcp-handlers.js');
      await handleStopMcpServerWeb(state.mcpManager, state.workspacePath, requestId, reply);
      break;
    }

    case 'GET_MCP_SERVER_STATUS': {
      const running = state.mcpManager?.isRunning() ?? false;
      const port = running ? (state.mcpManager?.getPort() ?? null) : null;
      reply('MCP_SERVER_STATUS', {
        running,
        port,
        configsWritten: [],
        reviewBeforeApply: state.mcpManager?.getReviewBeforeApply() ?? true,
      });
      break;
    }

    case 'SET_REVIEW_BEFORE_APPLY': {
      if (payload != null && state.mcpManager) {
        state.mcpManager.setReviewBeforeApply(payload.value as boolean);
      }
      break;
    }

    case 'GET_CURRENT_WORKFLOW_RESPONSE': {
      if (state.mcpManager && payload) {
        state.mcpManager.handleWorkflowResponse(payload as never);
      }
      break;
    }

    case 'APPLY_WORKFLOW_FROM_MCP_RESPONSE': {
      if (state.mcpManager && payload) {
        state.mcpManager.handleApplyResponse(payload as never);
      }
      break;
    }

    // ========================================================================
    // AI Editing / Agent Launch
    // ========================================================================
    case 'RUN_AI_EDITING_SKILL': {
      if (!payload?.provider) break;
      const { handleRunAiEditingSkillWeb } = await import('../handlers/ai-handlers.js');
      await handleRunAiEditingSkillWeb(payload as never, state.workspacePath, requestId, reply);
      break;
    }

    case 'LAUNCH_AI_AGENT': {
      if (!payload?.provider) break;
      const { handleLaunchAiAgentWeb } = await import('../handlers/ai-handlers.js');
      state.mcpManager = await handleLaunchAiAgentWeb(
        payload as never,
        state.mcpManager,
        state.transport,
        state.workspacePath,
        requestId,
        reply,
        send
      );
      break;
    }

    case 'OPEN_ANTIGRAVITY_MCP_SETTINGS': {
      // Not applicable in web mode
      break;
    }

    case 'CONFIRM_ANTIGRAVITY_CASCADE_LAUNCH': {
      // Antigravity Cascade not available in web mode
      reply('LAUNCH_AI_AGENT_FAILED', {
        errorMessage: 'Antigravity Cascade is not available in web mode',
        timestamp: new Date().toISOString(),
      });
      break;
    }

    // ========================================================================
    // Slack Integration
    // ========================================================================
    case 'LIST_SLACK_WORKSPACES': {
      const { handleListSlackWorkspacesWeb } = await import('../handlers/slack-handlers.js');
      await handleListSlackWorkspacesWeb(requestId, reply);
      break;
    }

    case 'GET_SLACK_CHANNELS': {
      if (!payload?.workspaceId) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Workspace ID is required' });
        break;
      }
      const { handleGetSlackChannelsWeb } = await import('../handlers/slack-handlers.js');
      await handleGetSlackChannelsWeb(payload as never, requestId, reply);
      break;
    }

    case 'SHARE_WORKFLOW_TO_SLACK': {
      if (!payload || !fileService) {
        reply('ERROR', { code: 'VALIDATION_ERROR', message: 'Share workflow payload is required' });
        break;
      }
      const { handleShareWorkflowToSlackWeb } = await import('../handlers/slack-handlers.js');
      await handleShareWorkflowToSlackWeb(payload as never, fileService, requestId, reply);
      break;
    }

    case 'GENERATE_SLACK_DESCRIPTION': {
      if (!payload) {
        reply('ERROR', {
          code: 'VALIDATION_ERROR',
          message: 'Generate Slack description payload is required',
        });
        break;
      }
      const { handleGenerateSlackDescriptionWeb } = await import('../handlers/slack-handlers.js');
      await handleGenerateSlackDescriptionWeb(
        payload as never,
        state.workspacePath,
        requestId,
        reply
      );
      break;
    }

    case 'CANCEL_SLACK_DESCRIPTION': {
      if (payload?.targetRequestId) {
        const { handleCancelGenerationWeb } = await import('../handlers/ai-handlers.js');
        await handleCancelGenerationWeb(payload.targetRequestId as string);
      }
      break;
    }

    case 'IMPORT_WORKFLOW_FROM_SLACK': {
      if (!payload || !fileService) {
        reply('ERROR', {
          code: 'VALIDATION_ERROR',
          message: 'Import workflow payload is required',
        });
        break;
      }
      const { handleImportWorkflowFromSlackWeb } = await import('../handlers/slack-handlers.js');
      await handleImportWorkflowFromSlackWeb(payload as never, fileService, requestId, reply);
      break;
    }

    case 'CONNECT_SLACK_MANUAL': {
      if (!payload?.userToken) {
        reply('CONNECT_SLACK_MANUAL_FAILED', {
          code: 'SLACK_CONNECTION_FAILED',
          message: 'User Token is required',
        });
        break;
      }
      const { handleConnectSlackManualWeb } = await import('../handlers/slack-handlers.js');
      await handleConnectSlackManualWeb(payload as never, requestId, reply);
      break;
    }

    case 'SLACK_CONNECT_OAUTH': {
      const { handleSlackConnectOAuthWeb } = await import('../handlers/slack-handlers.js');
      await handleSlackConnectOAuthWeb(requestId, reply, send);
      break;
    }

    case 'SLACK_CANCEL_OAUTH': {
      const { handleSlackCancelOAuthWeb } = await import('../handlers/slack-handlers.js');
      handleSlackCancelOAuthWeb();
      break;
    }

    case 'SLACK_DISCONNECT': {
      const { handleSlackDisconnectWeb } = await import('../handlers/slack-handlers.js');
      await handleSlackDisconnectWeb(requestId, reply);
      break;
    }

    case 'GET_LAST_SHARED_CHANNEL': {
      const channelId = state.globalState.get('slack-last-shared-channel') ?? null;
      reply('GET_LAST_SHARED_CHANNEL_SUCCESS', { channelId });
      break;
    }

    case 'SET_LAST_SHARED_CHANNEL': {
      if (payload?.channelId) {
        state.globalState.set('slack-last-shared-channel', payload.channelId);
      }
      break;
    }

    // ========================================================================
    // Utility
    // ========================================================================
    case 'OPEN_EXTERNAL_URL': {
      if (payload?.url) {
        // In web mode, tell the client to open the URL
        send({
          type: 'OPEN_URL',
          payload: { url: payload.url },
        });
      }
      break;
    }

    case 'OPEN_IN_EDITOR': {
      // In web mode, send content back to client for display
      if (payload) {
        send({
          type: 'SHOW_EDITOR_CONTENT',
          requestId,
          payload,
        });
      }
      break;
    }

    case 'DIALOG_RESPONSE': {
      // Handle client dialog responses
      if (requestId && payload?.confirmed !== undefined) {
        state.dialogService.handleDialogResponse(requestId, payload.confirmed as boolean);
      }
      break;
    }

    default: {
      log('WARN', `Unhandled message type: ${type}`);
      break;
    }
  }
}
