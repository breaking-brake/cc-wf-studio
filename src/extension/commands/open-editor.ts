/**
 * Claude Code Workflow Studio - Open Editor Command
 *
 * Creates and manages the Webview panel for the workflow editor
 * Based on: /specs/001-cc-wf-studio/contracts/vscode-extension-api.md section 1.1
 */

import * as vscode from 'vscode';
import type { WebviewMessage } from '../../shared/types/messages';
import { cancelGeneration } from '../services/claude-code-service';
import { FileService } from '../services/file-service';
import { SlackApiService } from '../services/slack-api-service';
import { SlackOAuthService } from '../services/slack-oauth-service';
import { NgrokService } from '../utils/ngrok-service';
import { OAuthCallbackServer } from '../utils/oauth-callback-server';
import { SlackTokenManager } from '../utils/slack-token-manager';
import { getWebviewContent } from '../webview-content';
import { handleGenerateWorkflow } from './ai-generation';
import { handleExportWorkflow } from './export-workflow';
import { loadWorkflow } from './load-workflow';
import { loadWorkflowList } from './load-workflow-list';
import { handleGetMcpToolSchema, handleGetMcpTools, handleListMcpServers } from './mcp-handlers';
import { saveWorkflow } from './save-workflow';
import { handleBrowseSkills, handleCreateSkill, handleValidateSkillFile } from './skill-operations';
import { handleImportWorkflowFromSlack } from './slack-import-workflow';
import {
  handleGetSlackChannels,
  handleListSlackWorkspaces,
  handleShareWorkflowToSlack,
} from './slack-share-workflow';
import {
  handleCancelRefinement,
  handleClearConversation,
  handleRefineWorkflow,
} from './workflow-refinement';

// Module-level variables to share state between commands
let currentPanel: vscode.WebviewPanel | undefined;
let fileService: FileService;
let slackTokenManager: SlackTokenManager;
let slackApiService: SlackApiService;
let ngrokService: NgrokService | undefined;
let currentNgrokTunnelUrl: string | undefined;
let currentNgrokLocalPort: number | undefined;

/**
 * Register the open editor command
 *
 * @param context - VSCode extension context
 */
export function registerOpenEditorCommand(
  context: vscode.ExtensionContext
): vscode.WebviewPanel | null {
  const openEditorCommand = vscode.commands.registerCommand('cc-wf-studio.openEditor', () => {
    // Initialize file service
    try {
      fileService = new FileService();
    } catch (error) {
      vscode.window.showErrorMessage(
        `Failed to initialize File Service: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
      return;
    }

    // Initialize Slack services
    slackTokenManager = new SlackTokenManager(context);
    slackApiService = new SlackApiService(slackTokenManager);
    const columnToShowIn = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If panel already exists, reveal it
    if (currentPanel) {
      currentPanel.reveal(columnToShowIn);
      return;
    }

    // Create new webview panel
    currentPanel = vscode.window.createWebviewPanel(
      'ccWorkflowStudio',
      'Claude Code Workflow Studio',
      columnToShowIn || vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'src', 'webview', 'dist')],
      }
    );

    // Set custom icon for the tab
    currentPanel.iconPath = vscode.Uri.joinPath(context.extensionUri, 'resources', 'icon.png');

    // Set webview HTML content
    currentPanel.webview.html = getWebviewContent(currentPanel.webview, context.extensionUri);

    // Check if this is the first launch and send initial state
    const hasLaunchedBefore = context.globalState.get<boolean>('hasLaunchedBefore', false);
    if (!hasLaunchedBefore) {
      // Mark as launched
      context.globalState.update('hasLaunchedBefore', true);
    }

    // Send initial state to webview after a short delay to ensure webview is ready
    setTimeout(() => {
      if (currentPanel) {
        currentPanel.webview.postMessage({
          type: 'INITIAL_STATE',
          payload: {
            isFirstLaunch: !hasLaunchedBefore,
          },
        });
      }
    }, 500);

    // Handle messages from webview
    currentPanel.webview.onDidReceiveMessage(
      async (message: WebviewMessage) => {
        // Ensure panel still exists
        if (!currentPanel) {
          return;
        }
        const webview = currentPanel.webview;

        switch (message.type) {
          case 'SAVE_WORKFLOW':
            // Save workflow
            if (message.payload?.workflow) {
              await saveWorkflow(fileService, webview, message.payload.workflow, message.requestId);
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Workflow is required',
                },
              });
            }
            break;

          case 'EXPORT_WORKFLOW':
            // Export workflow to .claude format
            if (message.payload) {
              await handleExportWorkflow(fileService, webview, message.payload, message.requestId);
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Export payload is required',
                },
              });
            }
            break;

          case 'LOAD_WORKFLOW_LIST':
            // Load workflow list
            await loadWorkflowList(fileService, webview, message.requestId);
            break;

          case 'LOAD_WORKFLOW':
            // Load specific workflow
            if (message.payload?.workflowId) {
              await loadWorkflow(
                fileService,
                webview,
                message.payload.workflowId,
                message.requestId
              );
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Workflow ID is required',
                },
              });
            }
            break;

          case 'STATE_UPDATE':
            // State update from webview (for persistence)
            console.log('STATE_UPDATE:', message.payload);
            break;

          case 'GENERATE_WORKFLOW':
            // AI-assisted workflow generation
            if (message.payload) {
              const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
              await handleGenerateWorkflow(
                message.payload,
                webview,
                context.extensionPath,
                message.requestId || '',
                workspaceRoot
              );
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Generation payload is required',
                },
              });
            }
            break;

          case 'CANCEL_GENERATION':
            // Cancel AI generation
            if (message.payload?.requestId) {
              const result = cancelGeneration(message.payload.requestId);

              if (result.cancelled) {
                webview.postMessage({
                  type: 'GENERATION_CANCELLED',
                  requestId: message.payload.requestId,
                  payload: {
                    executionTimeMs: result.executionTimeMs || 0,
                    timestamp: new Date().toISOString(),
                  },
                });
              } else {
                webview.postMessage({
                  type: 'ERROR',
                  requestId: message.payload.requestId,
                  payload: {
                    code: 'VALIDATION_ERROR',
                    message: 'No active generation found to cancel',
                  },
                });
              }
            }
            break;

          case 'CONFIRM_OVERWRITE':
            // TODO: Will be implemented in Phase 4
            console.log('CONFIRM_OVERWRITE:', message.payload);
            break;

          case 'BROWSE_SKILLS':
            // Browse available Claude Code Skills
            await handleBrowseSkills(webview, message.requestId || '');
            break;

          case 'CREATE_SKILL':
            // Create new Skill (Phase 5)
            if (message.payload) {
              await handleCreateSkill(message.payload, webview, message.requestId || '');
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Skill creation payload is required',
                },
              });
            }
            break;

          case 'VALIDATE_SKILL_FILE':
            // Validate Skill file
            if (message.payload) {
              await handleValidateSkillFile(message.payload, webview, message.requestId || '');
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Skill file path is required',
                },
              });
            }
            break;

          case 'REFINE_WORKFLOW':
            // AI-assisted workflow refinement
            if (message.payload) {
              const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
              await handleRefineWorkflow(
                message.payload,
                webview,
                message.requestId || '',
                context.extensionPath,
                workspaceRoot
              );
            } else {
              webview.postMessage({
                type: 'REFINEMENT_FAILED',
                requestId: message.requestId,
                payload: {
                  error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Refinement payload is required',
                  },
                  executionTimeMs: 0,
                  timestamp: new Date().toISOString(),
                },
              });
            }
            break;

          case 'CANCEL_REFINEMENT':
            // Cancel workflow refinement
            if (message.payload) {
              await handleCancelRefinement(message.payload, webview, message.requestId || '');
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Cancel refinement payload is required',
                },
              });
            }
            break;

          case 'CLEAR_CONVERSATION':
            // Clear conversation history
            if (message.payload) {
              await handleClearConversation(message.payload, webview, message.requestId || '');
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Clear conversation payload is required',
                },
              });
            }
            break;

          case 'LIST_MCP_SERVERS':
            // List all configured MCP servers (T018)
            await handleListMcpServers(message.payload || {}, webview, message.requestId || '');
            break;

          case 'GET_MCP_TOOLS':
            // Get tools from a specific MCP server (T019)
            if (message.payload?.serverId) {
              await handleGetMcpTools(message.payload, webview, message.requestId || '');
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Server ID is required',
                },
              });
            }
            break;

          case 'GET_MCP_TOOL_SCHEMA':
            // Get detailed schema for a specific tool (T028)
            if (message.payload?.serverId && message.payload?.toolName) {
              await handleGetMcpToolSchema(message.payload, webview, message.requestId || '');
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Server ID and Tool Name are required',
                },
              });
            }
            break;

          case 'LIST_SLACK_WORKSPACES':
            // List connected Slack workspaces
            await handleListSlackWorkspaces(webview, message.requestId || '', slackApiService);
            break;

          case 'GET_SLACK_CHANNELS':
            // Get Slack channels for specific workspace
            if (message.payload?.workspaceId) {
              await handleGetSlackChannels(
                message.payload,
                webview,
                message.requestId || '',
                slackApiService
              );
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Workspace ID is required',
                },
              });
            }
            break;

          case 'SHARE_WORKFLOW_TO_SLACK':
            // Share workflow to Slack channel (T021)
            if (message.payload) {
              await handleShareWorkflowToSlack(
                message.payload,
                webview,
                message.requestId || '',
                fileService,
                slackApiService
              );
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Share workflow payload is required',
                },
              });
            }
            break;

          case 'IMPORT_WORKFLOW_FROM_SLACK':
            // Import workflow from Slack (T026)
            if (message.payload) {
              await handleImportWorkflowFromSlack(
                message.payload,
                webview,
                message.requestId || '',
                fileService,
                slackApiService
              );
            } else {
              webview.postMessage({
                type: 'ERROR',
                requestId: message.requestId,
                payload: {
                  code: 'VALIDATION_ERROR',
                  message: 'Import workflow payload is required',
                },
              });
            }
            break;

          case 'SLACK_CONNECT':
            // Slack OAuth authentication flow
            try {
              console.log('[Extension Host] SLACK_CONNECT received');
              console.log('[Extension Host] Payload:', message.payload);
              console.log('[Extension Host] Current ngrok tunnel URL:', currentNgrokTunnelUrl);
              console.log('[Extension Host] Current ngrok local port:', currentNgrokLocalPort);

              const forceReconnect = message.payload?.forceReconnect ?? false;

              // If force reconnect, delete existing connection first
              if (forceReconnect) {
                console.log(
                  '[Extension Host] Force reconnect requested - deleting existing connection'
                );
                const oauthConfig = {
                  clientId: '',
                  clientSecret: '',
                  scopes: [],
                };
                const oauthService = new SlackOAuthService(context, oauthConfig);
                await oauthService.disconnect();
                console.log('[Extension Host] Existing connection deleted');
              }

              // Get OAuth configuration from VSCode settings
              const config = vscode.workspace.getConfiguration('cc-wf-studio.slack');
              const clientId = config.get<string>('clientId') || '';
              const clientSecret = config.get<string>('clientSecret') || '';
              const ngrokAuthtoken = config.get<string>('ngrokAuthtoken') || '';

              if (!clientId || !clientSecret) {
                throw new Error(
                  'Slack App credentials not configured. Please set clientId and clientSecret in VSCode settings (cc-wf-studio.slack).'
                );
              }

              if (!ngrokAuthtoken) {
                throw new Error(
                  'Ngrok authtoken not configured. Please set ngrokAuthtoken in VSCode settings (cc-wf-studio.slack).'
                );
              }

              const oauthConfig = {
                clientId,
                clientSecret,
                ngrokAuthtoken,
                scopes: ['chat:write', 'files:write', 'channels:read', 'groups:read', 'users:read'],
              };

              // Initialize OAuth service
              const oauthService = new SlackOAuthService(context, oauthConfig);

              // Execute OAuth flow with existing ngrok tunnel URL and local port (if available)
              const connection = await oauthService.authenticate(
                currentNgrokTunnelUrl,
                currentNgrokLocalPort
              );

              // Send success response
              webview.postMessage({
                type: 'SLACK_CONNECT_SUCCESS',
                requestId: message.requestId,
                payload: {
                  workspaceName: connection.workspaceName,
                },
              });
            } catch (error) {
              console.error('[Slack OAuth] Authentication failed:', error);
              webview.postMessage({
                type: 'SLACK_CONNECT_FAILED',
                requestId: message.requestId,
                payload: {
                  message: error instanceof Error ? error.message : 'Failed to connect to Slack',
                },
              });
            }
            break;

          case 'SLACK_DISCONNECT':
            // Slack disconnection (clear tokens)
            try {
              // Get OAuth configuration (minimal for disconnect)
              const oauthConfig = {
                clientId: '',
                clientSecret: '',
                scopes: [],
              };

              const oauthService = new SlackOAuthService(context, oauthConfig);
              await oauthService.disconnect();

              webview.postMessage({
                type: 'SLACK_DISCONNECT_SUCCESS',
                requestId: message.requestId,
                payload: {},
              });
            } catch (error) {
              console.error('[Slack OAuth] Disconnection failed:', error);
              webview.postMessage({
                type: 'SLACK_DISCONNECT_FAILED',
                requestId: message.requestId,
                payload: {
                  message:
                    error instanceof Error ? error.message : 'Failed to disconnect from Slack',
                },
              });
            }
            break;

          case 'GET_OAUTH_REDIRECT_URI':
            // Get OAuth redirect URI for development/debugging
            try {
              console.log('[Extension Host] GET_OAUTH_REDIRECT_URI received');

              // Reuse existing ngrok tunnel if available
              if (currentNgrokTunnelUrl) {
                console.log(
                  '[Extension Host] Reusing existing ngrok tunnel:',
                  currentNgrokTunnelUrl
                );
                webview.postMessage({
                  type: 'GET_OAUTH_REDIRECT_URI_SUCCESS',
                  requestId: message.requestId,
                  payload: {
                    redirectUri: currentNgrokTunnelUrl,
                  },
                });
                console.log('[Extension Host] Sent GET_OAUTH_REDIRECT_URI_SUCCESS (reused)');
                break;
              }

              // Initialize temporary callback server to get port
              const callbackServer = new OAuthCallbackServer();
              await callbackServer.initializeForUrl();
              const localPort = callbackServer.getPort();
              console.log('[Extension Host] Local server started on port:', localPort);

              // Create ngrok tunnel to expose HTTPS URL (keep it open for OAuth)
              ngrokService = new NgrokService();
              const tunnel = await ngrokService.createTunnel(localPort);
              console.log('[Extension Host] Ngrok tunnel created:', tunnel.publicUrl);

              // Save port number and redirect URI for later use
              currentNgrokLocalPort = localPort;
              currentNgrokTunnelUrl = `${tunnel.publicUrl}/oauth/callback`;
              console.log('[Extension Host] Saved local port:', currentNgrokLocalPort);
              console.log('[Extension Host] OAuth redirect URI:', currentNgrokTunnelUrl);

              // Clean up temporary server (but keep ngrok tunnel open)
              callbackServer.stop();

              webview.postMessage({
                type: 'GET_OAUTH_REDIRECT_URI_SUCCESS',
                requestId: message.requestId,
                payload: {
                  redirectUri: currentNgrokTunnelUrl,
                },
              });
              console.log('[Extension Host] Sent GET_OAUTH_REDIRECT_URI_SUCCESS');
            } catch (error) {
              console.error('[Extension Host] Failed to get redirect URI:', error);
              webview.postMessage({
                type: 'GET_OAUTH_REDIRECT_URI_FAILED',
                requestId: message.requestId,
                payload: {
                  message:
                    error instanceof Error ? error.message : 'Failed to get OAuth redirect URI',
                },
              });
            }
            break;

          default:
            console.warn('Unknown message type:', message);
        }
      },
      undefined,
      context.subscriptions
    );

    // Handle panel disposal
    currentPanel.onDidDispose(
      () => {
        currentPanel = undefined;
      },
      undefined,
      context.subscriptions
    );

    // Show information message
    vscode.window.showInformationMessage('Claude Code Workflow Studio: Editor opened!');
  });

  context.subscriptions.push(openEditorCommand);

  return currentPanel || null;
}
