/**
 * CC Workflow Studio - Open Editor Command
 *
 * Creates and manages the Webview panel for the workflow editor
 * Based on: /specs/001-cc-wf-studio/contracts/vscode-extension-api.md section 1.1
 */

import * as crypto from 'node:crypto';
import * as vscode from 'vscode';
import type {
  AiEditingProvider,
  ApplyWorkflowFromMcpResponsePayload,
  GetCurrentWorkflowResponsePayload,
  LaunchAiAgentPayload,
  McpConfigTarget,
  RunAiEditingSkillPayload,
  SetReviewBeforeApplyPayload,
  StartMcpServerPayload,
  WebviewMessage,
} from '../../shared/types/messages';
import { getMcpServerManager, log } from '../extension';
import { translate } from '../i18n/i18n-service';
import { generateAndRunAiEditingSkill } from '../services/ai-editing-skill-service';
import {
  openAntigravityMcpSettings,
  startAntigravityTask,
} from '../services/antigravity-extension-service';
import { cancelGeneration } from '../services/claude-code-service';
import { CommentarySessionManager } from '../services/commentary-session-manager';
import { FileService } from '../services/file-service';
import {
  checkPortMismatch,
  getConfigTargetsForProvider,
  writeAllAgentConfigs,
} from '../services/mcp-server-config-writer';
import { SlackApiService } from '../services/slack-api-service';
import { executeSlashCommandInTerminal } from '../services/terminal-execution-service';
import { listCopilotModels } from '../services/vscode-lm-service';
import { AnthropicApiKeyManager } from '../utils/anthropic-api-key-manager';
import { countUnreadVersions, extractVersions, parseChangelog } from '../utils/changelog-parser';
import { migrateWorkflow } from '../utils/migrate-workflow';
import { SlackTokenManager } from '../utils/slack-token-manager';
import { validateWorkflowFile } from '../utils/workflow-validator';
import { getWebviewContent } from '../webview-content';
import { handleExportForAntigravity, handleRunForAntigravity } from './antigravity-handlers';
import {
  handleCheckAnthropicApiKey,
  handleClearAnthropicApiKey,
  handleDeleteCustomSkill,
  handleExecuteUploadedSkill,
  handleGetMcpServerTypes,
  handleGetSavedMcpServerUrls,
  handleGetSkillVersionDetails,
  handleListCustomSkills,
  handleLookupMcpRegistry,
  handleSaveMcpServerUrls,
  handleStoreAnthropicApiKey,
  handleUploadDependentSkill,
  handleUploadToClaudeApi,
} from './claude-api-handlers';
import { handleExportForCodexCli, handleRunForCodexCli } from './codex-handlers';
import { handleBrowseCommands, handleCreateSubAgent } from './command-operations';
import {
  handleExportForCopilot,
  handleExportForCopilotCli,
  handleRunForCopilot,
  handleRunForCopilotCli,
} from './copilot-handlers';
import { handleExportForCursor, handleRunForCursor } from './cursor-handlers';
import { handleExportWorkflow, handleExportWorkflowForExecution } from './export-workflow';
import { handleExportForGeminiCli, handleRunForGeminiCli } from './gemini-handlers';
import { listSampleWorkflows, loadSampleWorkflow } from './load-sample-workflow';
import { loadWorkflow } from './load-workflow';
import { loadWorkflowList } from './load-workflow-list';
import {
  handleCheckMcpBearerToken,
  handleDeleteMcpBearerToken,
  handleGetMcpToolSchema,
  handleGetMcpTools,
  handleListMcpServers,
  handleRefreshMcpCache,
  handleSaveMcpBearerToken,
} from './mcp-handlers';
import { handleExportForRooCode, handleRunForRooCode } from './roo-code-handlers';
import { saveWorkflow } from './save-workflow';
import { handleBrowseSkills, handleCreateSkill, handleValidateSkillFile } from './skill-operations';
import { handleConnectSlackManual } from './slack-connect-manual';
import { createOAuthService, handleConnectSlackOAuth } from './slack-connect-oauth';
import { handleGenerateSlackDescription } from './slack-description-generation';
import { handleImportWorkflowFromSlack } from './slack-import-workflow';
import {
  handleGetSlackChannels,
  handleListSlackWorkspaces,
  handleShareWorkflowToSlack,
} from './slack-share-workflow';
import { handleOpenInEditor } from './text-editor';
import { handleGenerateWorkflowName } from './workflow-name-generation';
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
let activeOAuthService: ReturnType<typeof createOAuthService> | null = null;
let anthropicApiKeyManager: AnthropicApiKeyManager;
let commentarySessionManager: CommentarySessionManager;
let isCommentaryEnabled = false;
let commentaryProvider: import('../../shared/types/messages').CommentaryProvider = 'claude-code';
let commentaryCopilotModel: import('../../shared/types/messages').CopilotModel | undefined;
let commentaryLanguage = 'English';

/**
 * Import parameters for workflow import from Slack
 */
export interface ImportParameters {
  fileId: string;
  channelId: string;
  messageTs: string;
  workspaceId: string;
  workflowId: string;
  /** Workspace name for display in error dialogs (decoded from Base64) */
  workspaceName?: string;
}

/**
 * Register the open editor command
 *
 * @param context - VSCode extension context
 */
export function registerOpenEditorCommand(
  context: vscode.ExtensionContext
): vscode.WebviewPanel | null {
  const openEditorCommand = vscode.commands.registerCommand(
    'cc-wf-studio.openEditor',
    (importParams?: ImportParameters | vscode.Uri) => {
      // Filter out vscode.Uri objects (file paths) - only process ImportParameters
      // This prevents unintended import when .json files are opened in VSCode
      let actualImportParams: ImportParameters | undefined;
      if (importParams !== undefined) {
        if (importParams instanceof vscode.Uri) {
          // Ignore Uri objects - this is just a file being opened
          actualImportParams = undefined;
        } else {
          // This is a proper ImportParameters object
          actualImportParams = importParams as ImportParameters;
        }
      }

      // Initialize file service
      try {
        fileService = new FileService();
      } catch (error) {
        // Check if this is a "no workspace" error
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        if (errorMessage === 'No workspace folder is open') {
          vscode.window.showErrorMessage(translate('error.noWorkspaceOpen'));
        } else {
          vscode.window.showErrorMessage(`Failed to initialize File Service: ${errorMessage}`);
        }
        return;
      }

      // Initialize Slack services
      slackTokenManager = new SlackTokenManager(context);
      slackApiService = new SlackApiService(slackTokenManager);

      // Initialize Anthropic API Key Manager
      anthropicApiKeyManager = new AnthropicApiKeyManager(context);

      const columnToShowIn = vscode.window.activeTextEditor
        ? vscode.window.activeTextEditor.viewColumn
        : undefined;

      // If panel already exists, reveal it
      if (currentPanel) {
        currentPanel.reveal(columnToShowIn);

        // If import parameters are provided, trigger import
        if (actualImportParams) {
          setTimeout(() => {
            if (currentPanel) {
              currentPanel.webview.postMessage({
                type: 'IMPORT_WORKFLOW_FROM_SLACK',
                payload: actualImportParams,
              });
            }
          }, 500);
        }

        return;
      }

      // Initialize Commentary Session Manager
      commentarySessionManager = new CommentarySessionManager();

      // Create new webview panel
      currentPanel = vscode.window.createWebviewPanel(
        'ccWorkflowStudio',
        'CC Workflow Studio',
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

      // Connect MCP server manager to webview
      const mcpManager = getMcpServerManager();
      if (mcpManager) {
        mcpManager.setWebview(currentPanel.webview);
      }

      // Detect first-time user (for onboarding tour)
      const acceptedVersion = context.globalState.get<number>('acceptedTermsVersion', 0);
      const legacyAccepted = context.globalState.get<boolean>('hasAcceptedTerms', false);
      const isFirstTimeUser = acceptedVersion === 0 && !legacyAccepted;

      // Store import params for use when WEBVIEW_READY is received
      // This replaces the unreliable setTimeout-based approach (fixes Issue #396)
      let pendingImportParams = actualImportParams;

      // Handle messages from webview
      currentPanel.webview.onDidReceiveMessage(
        async (message: WebviewMessage) => {
          // Ensure panel still exists
          if (!currentPanel) {
            return;
          }
          const webview = currentPanel.webview;

          // Helper: get configured MCP port from VSCode settings
          function getConfiguredMcpPort(): number {
            return vscode.workspace.getConfiguration('cc-wf-studio').get<number>('mcp.port', 6282);
          }

          // Helper: ensure MCP server is running and config written for Run operations
          async function ensureMcpServerForRun(
            provider: AiEditingProvider,
            highlightEnabled: boolean | undefined,
            workspacePath: string | undefined
          ): Promise<{ configWritten: boolean }> {
            if (highlightEnabled === false) return { configWritten: false };
            const mcpManager = getMcpServerManager();
            if (!mcpManager) return { configWritten: false };

            const previousPort = mcpManager.getPort();
            let serverPort = previousPort;
            if (!mcpManager.isRunning()) {
              serverPort = await mcpManager.start(context.extensionPath, getConfiguredMcpPort());
            }
            const serverUrl = `http://127.0.0.1:${serverPort}/mcp`;

            // If the port changed (server restarted), clear written configs so they get rewritten
            const portChanged = previousPort !== null && previousPort !== serverPort;
            if (portChanged) {
              mcpManager.getWrittenConfigs().clear();
            }

            let configWritten = false;
            if (workspacePath) {
              const requiredTargets = getConfigTargetsForProvider(provider);
              const alreadyWritten = mcpManager.getWrittenConfigs();
              const newTargets = requiredTargets.filter((t) => !alreadyWritten.has(t));
              if (newTargets.length > 0) {
                const written = await writeAllAgentConfigs(newTargets, serverUrl, workspacePath);
                mcpManager.addWrittenConfigs(written);
                configWritten = written.length > 0;
              }

              // Check for port mismatch in config files
              if (serverPort !== null) {
                const primaryTarget = requiredTargets[0];
                const { mismatch, configPort } = await checkPortMismatch(
                  primaryTarget,
                  serverPort,
                  workspacePath
                );
                if (mismatch) {
                  vscode.window.showWarningMessage(
                    `MCP port mismatch: server is running on port ${serverPort}, but ${primaryTarget} config has port ${configPort}. Rewriting config.`
                  );
                  for (const t of requiredTargets) {
                    mcpManager.getWrittenConfigs().delete(t);
                  }
                  const rewritten = await writeAllAgentConfigs(
                    requiredTargets,
                    serverUrl,
                    workspacePath
                  );
                  mcpManager.addWrittenConfigs(rewritten);
                  configWritten = true;
                }
              }
            }

            // Notify Webview of MCP server status
            webview.postMessage({
              type: 'MCP_SERVER_STATUS',
              payload: {
                running: true,
                port: serverPort,
                configTargets: Array.from(mcpManager.getWrittenConfigs()),
                reviewBeforeApply: mcpManager.getReviewBeforeApply(),
              },
            });

            return { configWritten };
          }

          switch (message.type) {
            case 'WEBVIEW_READY': {
              // Calculate unread release count for What's New badge
              let unreadReleaseCount = 0;
              try {
                const changelogUri = vscode.Uri.joinPath(
                  vscode.Uri.file(context.extensionPath),
                  'CHANGELOG.md'
                );
                const changelogBytes = await vscode.workspace.fs.readFile(changelogUri);
                const changelogContent = Buffer.from(changelogBytes).toString('utf-8');
                const lastViewedVersion = context.globalState.get<string>(
                  'whatsNewLastViewedVersion'
                );
                if (lastViewedVersion === undefined) {
                  const versions = extractVersions(changelogContent);
                  if (versions[0]) {
                    await context.globalState.update('whatsNewLastViewedVersion', versions[0]);
                  }
                } else {
                  unreadReleaseCount = countUnreadVersions(changelogContent, lastViewedVersion);
                }
              } catch {
                // CHANGELOG.md not found or unreadable - ignore
              }

              // Webview is fully initialized and ready to receive messages
              // This is more reliable than setTimeout (fixes Issue #396)
              const showWhatsNewBadge = context.globalState.get<boolean>('showWhatsNewBadge', true);
              webview.postMessage({
                type: 'INITIAL_STATE',
                payload: {
                  isFirstTimeUser,
                  unreadReleaseCount: showWhatsNewBadge ? unreadReleaseCount : 0,
                  showWhatsNewBadge,
                },
              });

              // If import parameters were provided, trigger import after initial state
              if (pendingImportParams) {
                // Small delay to ensure INITIAL_STATE is processed first
                setTimeout(() => {
                  if (currentPanel && pendingImportParams) {
                    currentPanel.webview.postMessage({
                      type: 'IMPORT_WORKFLOW_FROM_SLACK',
                      payload: pendingImportParams,
                    });
                    pendingImportParams = undefined;
                  }
                }, 100);
              }
              break;
            }

            case 'SAVE_WORKFLOW':
              // Save workflow
              if (message.payload?.workflow) {
                await saveWorkflow(
                  fileService,
                  webview,
                  message.payload.workflow,
                  message.requestId
                );
                // Update MCP server workflow cache
                const saveManager = getMcpServerManager();
                if (saveManager) {
                  saveManager.updateWorkflowCache(message.payload.workflow);
                }
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
                await handleExportWorkflow(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
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

            case 'RUN_AS_SLASH_COMMAND':
              // Run workflow as slash command in terminal
              if (message.payload?.workflow) {
                try {
                  const highlightEnabled = message.payload.highlightEnabled !== false;

                  // First, export the workflow to .claude format
                  const exportResult = await handleExportWorkflowForExecution(
                    message.payload.workflow,
                    fileService,
                    { highlightEnabled }
                  );

                  if (!exportResult.success) {
                    if (exportResult.cancelled) {
                      // User cancelled - send cancellation message (not an error)
                      webview.postMessage({
                        type: 'RUN_AS_SLASH_COMMAND_CANCELLED',
                        requestId: message.requestId,
                      });
                    } else {
                      webview.postMessage({
                        type: 'ERROR',
                        requestId: message.requestId,
                        payload: {
                          code: 'EXPORT_FAILED',
                          message: exportResult.error || 'Failed to export workflow',
                        },
                      });
                    }
                    break;
                  }

                  // Auto-start MCP server if not running (for highlight_group_node support)
                  const workspacePath = fileService.getWorkspacePath();
                  try {
                    await ensureMcpServerForRun('claude-code', highlightEnabled, workspacePath);
                    if (highlightEnabled) {
                      log('INFO', 'MCP Server auto-started for workflow run');
                    }
                  } catch (mcpError) {
                    log('WARN', 'Failed to auto-start MCP server for workflow run', {
                      error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                    });
                    // Non-fatal: continue with run even if MCP auto-start fails
                  }

                  // Generate session ID for JSONL tracking (Commentary AI)
                  const sessionId = isCommentaryEnabled ? crypto.randomUUID() : undefined;

                  // Run the slash command in terminal
                  const result = executeSlashCommandInTerminal({
                    workflowName: message.payload.workflow.name,
                    workingDirectory: workspacePath,
                    sessionId,
                  });

                  // Start Commentary AI if enabled
                  if (isCommentaryEnabled && sessionId) {
                    const slashCommandPath = exportResult.exportedFiles?.find((f) =>
                      f.replaceAll('\\', '/').includes('/commands/')
                    );
                    commentarySessionManager
                      .startCommentary(
                        sessionId,
                        message.payload.workflow.name,
                        workspacePath,
                        webview,
                        result.terminal,
                        commentaryProvider,
                        commentaryCopilotModel,
                        commentaryLanguage,
                        slashCommandPath
                      )
                      .catch((err) => {
                        log('WARN', 'Failed to start commentary', {
                          error: err instanceof Error ? err.message : String(err),
                        });
                      });
                  }

                  // Send success response
                  webview.postMessage({
                    type: 'RUN_AS_SLASH_COMMAND_SUCCESS',
                    requestId: message.requestId,
                    payload: {
                      workflowName: message.payload.workflow.name,
                      terminalName: result.terminalName,
                      timestamp: new Date().toISOString(),
                      sessionId,
                    },
                  });
                } catch (error) {
                  webview.postMessage({
                    type: 'ERROR',
                    requestId: message.requestId,
                    payload: {
                      code: 'RUN_FAILED',
                      message: error instanceof Error ? error.message : 'Failed to run workflow',
                      details: error,
                    },
                  });
                }
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

            case 'EXPORT_FOR_COPILOT':
              // Export workflow for Copilot
              if (message.payload?.workflow) {
                await handleExportForCopilot(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXPORT_FOR_COPILOT_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'LIST_COPILOT_MODELS':
              // List available Copilot models from VS Code LM API
              {
                const result = await listCopilotModels();
                webview.postMessage({
                  type: 'COPILOT_MODELS_LIST',
                  requestId: message.requestId,
                  payload: result,
                });
              }
              break;

            case 'RUN_FOR_COPILOT':
              // Run workflow for Copilot - VSCode Copilot Chat mode
              if (message.payload?.workflow) {
                try {
                  await ensureMcpServerForRun(
                    'copilot-chat',
                    message.payload.highlightEnabled,
                    fileService.getWorkspacePath()
                  );
                } catch (mcpError) {
                  log('WARN', 'Failed to auto-start MCP server for Copilot run', {
                    error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                  });
                }
                await handleRunForCopilot(fileService, webview, message.payload, message.requestId);
              } else {
                webview.postMessage({
                  type: 'RUN_FOR_COPILOT_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'RUN_FOR_COPILOT_CLI':
              // Run workflow for Copilot CLI mode (via Claude Code terminal)
              if (message.payload?.workflow) {
                try {
                  await ensureMcpServerForRun(
                    'copilot-cli',
                    message.payload.highlightEnabled,
                    fileService.getWorkspacePath()
                  );
                } catch (mcpError) {
                  log('WARN', 'Failed to auto-start MCP server for Copilot CLI run', {
                    error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                  });
                }
                await handleRunForCopilotCli(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'RUN_FOR_COPILOT_CLI_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'EXPORT_FOR_COPILOT_CLI':
              // Export workflow for Copilot CLI (Skills format)
              if (message.payload?.workflow) {
                await handleExportForCopilotCli(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXPORT_FOR_COPILOT_CLI_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'EXPORT_FOR_CODEX_CLI':
              // Export workflow for Codex CLI (Skills format)
              if (message.payload?.workflow) {
                await handleExportForCodexCli(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXPORT_FOR_CODEX_CLI_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'RUN_FOR_CODEX_CLI':
              // Run workflow for Codex CLI mode (via Codex CLI terminal)
              if (message.payload?.workflow) {
                try {
                  await ensureMcpServerForRun(
                    'codex',
                    message.payload.highlightEnabled,
                    fileService.getWorkspacePath()
                  );
                } catch (mcpError) {
                  log('WARN', 'Failed to auto-start MCP server for Codex CLI run', {
                    error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                  });
                }
                await handleRunForCodexCli(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'RUN_FOR_CODEX_CLI_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'EXPORT_FOR_ROO_CODE':
              // Export workflow for Roo Code (Skills format)
              if (message.payload?.workflow) {
                await handleExportForRooCode(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXPORT_FOR_ROO_CODE_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'RUN_FOR_ROO_CODE':
              // Run workflow for Roo Code (via Extension API)
              if (message.payload?.workflow) {
                try {
                  await ensureMcpServerForRun(
                    'roo-code',
                    message.payload.highlightEnabled,
                    fileService.getWorkspacePath()
                  );
                } catch (mcpError) {
                  log('WARN', 'Failed to auto-start MCP server for Roo Code run', {
                    error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                  });
                }
                await handleRunForRooCode(fileService, webview, message.payload, message.requestId);
              } else {
                webview.postMessage({
                  type: 'RUN_FOR_ROO_CODE_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'EXPORT_FOR_GEMINI_CLI':
              // Export workflow for Gemini CLI (Skills format)
              if (message.payload?.workflow) {
                await handleExportForGeminiCli(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXPORT_FOR_GEMINI_CLI_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'RUN_FOR_GEMINI_CLI':
              // Run workflow for Gemini CLI (via Gemini CLI terminal)
              if (message.payload?.workflow) {
                try {
                  await ensureMcpServerForRun(
                    'gemini',
                    message.payload.highlightEnabled,
                    fileService.getWorkspacePath()
                  );
                } catch (mcpError) {
                  log('WARN', 'Failed to auto-start MCP server for Gemini CLI run', {
                    error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                  });
                }
                await handleRunForGeminiCli(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'RUN_FOR_GEMINI_CLI_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'EXPORT_FOR_ANTIGRAVITY':
              // Export workflow for Antigravity (Skills format)
              if (message.payload?.workflow) {
                await handleExportForAntigravity(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXPORT_FOR_ANTIGRAVITY_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'RUN_FOR_ANTIGRAVITY':
              // Run workflow for Antigravity (via Cascade)
              if (message.payload?.workflow) {
                let configWritten = false;
                try {
                  const result = await ensureMcpServerForRun(
                    'antigravity',
                    message.payload.highlightEnabled,
                    fileService.getWorkspacePath()
                  );
                  configWritten = result.configWritten;
                } catch (mcpError) {
                  log('WARN', 'Failed to auto-start MCP server for Antigravity run', {
                    error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                  });
                }

                if (configWritten) {
                  // MCP config was newly written: export only, then show refresh dialog
                  // Cascade launch will happen via CONFIRM_ANTIGRAVITY_CASCADE_LAUNCH
                  const runResult = await handleRunForAntigravity(
                    fileService,
                    webview,
                    message.payload,
                    message.requestId,
                    { skipCascadeLaunch: true }
                  );
                  if (runResult?.status === 'success' && runResult.skillName) {
                    webview.postMessage({
                      type: 'ANTIGRAVITY_MCP_REFRESH_NEEDED',
                      requestId: message.requestId,
                      payload: {
                        context: 'run' as const,
                        skillName: runResult.skillName,
                      },
                    });
                  }
                } else {
                  // No new config written: run normally
                  await handleRunForAntigravity(
                    fileService,
                    webview,
                    message.payload,
                    message.requestId
                  );
                }
              } else {
                webview.postMessage({
                  type: 'RUN_FOR_ANTIGRAVITY_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'EXPORT_FOR_CURSOR':
              // Export workflow for Cursor (Skills format)
              if (message.payload?.workflow) {
                await handleExportForCursor(
                  fileService,
                  webview,
                  message.payload,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXPORT_FOR_CURSOR_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'RUN_FOR_CURSOR':
              // Run workflow for Cursor
              if (message.payload?.workflow) {
                try {
                  await ensureMcpServerForRun(
                    'cursor',
                    message.payload.highlightEnabled,
                    fileService.getWorkspacePath()
                  );
                } catch (mcpError) {
                  log('WARN', 'Failed to auto-start MCP server for Cursor run', {
                    error: mcpError instanceof Error ? mcpError.message : String(mcpError),
                  });
                }
                await handleRunForCursor(fileService, webview, message.payload, message.requestId);
              } else {
                webview.postMessage({
                  type: 'RUN_FOR_CURSOR_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
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

            case 'LIST_SAMPLE_WORKFLOWS':
              await listSampleWorkflows(context.extensionPath, webview, message.requestId);
              break;

            case 'LOAD_SAMPLE_WORKFLOW':
              if (message.payload?.sampleId) {
                await loadSampleWorkflow(
                  context.extensionPath,
                  webview,
                  message.payload.sampleId,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'ERROR',
                  requestId: message.requestId,
                  payload: {
                    code: 'VALIDATION_ERROR',
                    message: 'Sample workflow ID is required',
                  },
                });
              }
              break;

            case 'OPEN_FILE_PICKER':
              // Open OS file picker to load workflow from any location
              try {
                const defaultUri = vscode.Uri.file(fileService.getWorkflowsDirectory());

                const result = await vscode.window.showOpenDialog({
                  canSelectFiles: true,
                  canSelectFolders: false,
                  canSelectMany: false,
                  filters: {
                    'Workflow Files': ['json'],
                  },
                  defaultUri,
                  title: translate('filePicker.title'),
                });

                // User cancelled
                if (!result || result.length === 0) {
                  webview.postMessage({
                    type: 'FILE_PICKER_CANCELLED',
                    requestId: message.requestId,
                  });
                  break;
                }

                const selectedFile = result[0];
                const filePath = selectedFile.fsPath;

                // Read file content
                const content = await fileService.readFile(filePath);

                // Validate workflow
                const validationResult = validateWorkflowFile(content);

                if (!validationResult.valid) {
                  webview.postMessage({
                    type: 'ERROR',
                    requestId: message.requestId,
                    payload: {
                      code: 'VALIDATION_ERROR',
                      message: translate('filePicker.error.invalidWorkflow'),
                      details: validationResult.errors,
                    },
                  });
                  break;
                }

                // Apply migrations for backward compatibility
                // validationResult.workflow is guaranteed to exist when validationResult.valid is true
                const workflow = migrateWorkflow(
                  validationResult.workflow as NonNullable<typeof validationResult.workflow>
                );

                // Send success response
                webview.postMessage({
                  type: 'LOAD_WORKFLOW',
                  requestId: message.requestId,
                  payload: { workflow },
                });

                console.log(`Workflow loaded from file picker: ${filePath}`);
              } catch (error) {
                webview.postMessage({
                  type: 'ERROR',
                  requestId: message.requestId,
                  payload: {
                    code: 'LOAD_FAILED',
                    message:
                      error instanceof Error
                        ? error.message
                        : translate('filePicker.error.loadFailed'),
                    details: error,
                  },
                });
              }
              break;

            case 'STATE_UPDATE':
              // State update from webview (for persistence)
              console.log('STATE_UPDATE:', message.payload);
              break;

            case 'CONFIRM_OVERWRITE':
              // TODO: Will be implemented in Phase 4
              console.log('CONFIRM_OVERWRITE:', message.payload);
              break;

            case 'BROWSE_COMMANDS':
              // Browse available Claude Code Commands for Sub-Agent reuse
              await handleBrowseCommands(webview, message.requestId || '');
              break;

            case 'CREATE_SUB_AGENT':
              // Write .claude/agents/{name}.md immediately on Sub-Agent creation
              if (message.payload) {
                await handleCreateSubAgent(message.payload, webview, message.requestId || '');
              }
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
                await handleGetMcpTools(
                  message.payload,
                  webview,
                  message.requestId || '',
                  context.secrets
                );
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
                await handleGetMcpToolSchema(
                  message.payload,
                  webview,
                  message.requestId || '',
                  context.secrets
                );
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

            case 'SAVE_MCP_BEARER_TOKEN':
              if (message.payload?.serverId && message.payload?.token) {
                await handleSaveMcpBearerToken(message.payload, context.secrets);
              }
              break;

            case 'DELETE_MCP_BEARER_TOKEN':
              if (message.payload?.serverId) {
                await handleDeleteMcpBearerToken(
                  message.payload,
                  context.secrets,
                  webview,
                  message.requestId || ''
                );
              }
              break;

            case 'CHECK_MCP_BEARER_TOKEN':
              if (message.payload?.serverId) {
                await handleCheckMcpBearerToken(
                  message.payload,
                  context.secrets,
                  webview,
                  message.requestId || ''
                );
              }
              break;

            case 'REFRESH_MCP_CACHE':
              // Refresh MCP cache (invalidate all cached data)
              await handleRefreshMcpCache(message.payload || {}, webview, message.requestId || '');
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

            case 'GENERATE_SLACK_DESCRIPTION':
              // Generate workflow description with AI for Slack sharing
              if (message.payload) {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                await handleGenerateSlackDescription(
                  message.payload,
                  webview,
                  message.requestId || '',
                  workspaceRoot
                );
              } else {
                webview.postMessage({
                  type: 'ERROR',
                  requestId: message.requestId,
                  payload: {
                    code: 'VALIDATION_ERROR',
                    message: 'Generate Slack description payload is required',
                  },
                });
              }
              break;

            case 'CANCEL_SLACK_DESCRIPTION':
              // Cancel Slack description generation
              if (message.payload?.targetRequestId) {
                await cancelGeneration(message.payload.targetRequestId);
              }
              break;

            case 'GENERATE_WORKFLOW_NAME':
              // Generate workflow name with AI
              if (message.payload) {
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                await handleGenerateWorkflowName(
                  message.payload,
                  webview,
                  message.requestId || '',
                  workspaceRoot
                );
              } else {
                webview.postMessage({
                  type: 'ERROR',
                  requestId: message.requestId,
                  payload: {
                    code: 'VALIDATION_ERROR',
                    message: 'Generate workflow name payload is required',
                  },
                });
              }
              break;

            case 'CANCEL_WORKFLOW_NAME':
              // Cancel workflow name generation
              if (message.payload?.targetRequestId) {
                await cancelGeneration(message.payload.targetRequestId);
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

            case 'CONNECT_SLACK_MANUAL':
              // Manual Slack connection (User Token only)
              try {
                if (!message.payload?.userToken) {
                  throw new Error('User Token is required');
                }

                const result = await handleConnectSlackManual(
                  slackTokenManager,
                  slackApiService,
                  '', // Bot Token is no longer used
                  message.payload.userToken
                );

                if (result) {
                  webview.postMessage({
                    type: 'CONNECT_SLACK_MANUAL_SUCCESS',
                    requestId: message.requestId,
                    payload: {
                      workspaceId: result.workspaceId,
                      workspaceName: result.workspaceName,
                    },
                  });
                } else {
                  throw new Error('Failed to connect to Slack');
                }
              } catch (error) {
                webview.postMessage({
                  type: 'CONNECT_SLACK_MANUAL_FAILED',
                  requestId: message.requestId,
                  payload: {
                    code: 'SLACK_CONNECTION_FAILED',
                    message: error instanceof Error ? error.message : 'Failed to connect to Slack',
                  },
                });
              }
              break;

            case 'SLACK_CONNECT_OAUTH':
              // OAuth Slack connection flow
              try {
                // Create new OAuth service for this flow
                activeOAuthService = createOAuthService();

                const oauthResult = await handleConnectSlackOAuth(
                  slackTokenManager,
                  slackApiService,
                  activeOAuthService,
                  (status) => {
                    // Send progress updates to webview
                    if (status === 'initiated') {
                      const initiation = activeOAuthService?.initiateOAuthFlow();
                      if (initiation) {
                        webview.postMessage({
                          type: 'SLACK_OAUTH_INITIATED',
                          requestId: message.requestId,
                          payload: {
                            sessionId: initiation.sessionId,
                            authorizationUrl: initiation.authorizationUrl,
                          },
                        });
                      }
                    }
                  }
                );

                activeOAuthService = null;

                if (oauthResult) {
                  webview.postMessage({
                    type: 'SLACK_OAUTH_SUCCESS',
                    requestId: message.requestId,
                    payload: {
                      workspaceId: oauthResult.workspaceId,
                      workspaceName: oauthResult.workspaceName,
                    },
                  });
                } else {
                  webview.postMessage({
                    type: 'SLACK_OAUTH_CANCELLED',
                    requestId: message.requestId,
                  });
                }
              } catch (error) {
                activeOAuthService = null;
                webview.postMessage({
                  type: 'SLACK_OAUTH_FAILED',
                  requestId: message.requestId,
                  payload: {
                    message: error instanceof Error ? error.message : 'OAuth authentication failed',
                  },
                });
              }
              break;

            case 'SLACK_CANCEL_OAUTH':
              // Cancel ongoing OAuth flow
              if (activeOAuthService) {
                activeOAuthService.cancelPolling();
                activeOAuthService = null;
              }
              break;

            case 'SLACK_DISCONNECT':
              // Disconnect from Slack workspace
              try {
                await slackTokenManager.clearConnection();
                slackApiService.invalidateClient();
                vscode.window.showInformationMessage('Slack token deleted successfully');
                webview.postMessage({
                  type: 'SLACK_DISCONNECT_SUCCESS',
                  requestId: message.requestId,
                  payload: {},
                });
              } catch (error) {
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

            case 'OPEN_EXTERNAL_URL':
              // Open external URL in browser
              if (message.payload?.url) {
                await vscode.env.openExternal(vscode.Uri.parse(message.payload.url));
              }
              break;

            case 'GET_LAST_SHARED_CHANNEL':
              // Get last shared channel ID from global state
              {
                const lastChannelId = context.globalState.get<string>('slack-last-shared-channel');
                webview.postMessage({
                  type: 'GET_LAST_SHARED_CHANNEL_SUCCESS',
                  requestId: message.requestId,
                  payload: {
                    channelId: lastChannelId || null,
                  },
                });
              }
              break;

            case 'SET_LAST_SHARED_CHANNEL':
              // Save last shared channel ID to global state
              if (message.payload?.channelId) {
                await context.globalState.update(
                  'slack-last-shared-channel',
                  message.payload.channelId
                );
              }
              break;

            case 'GET_RESPONSE_LANGUAGE':
              {
                const savedLanguage = context.globalState.get<string>(
                  'claude-api-response-language'
                );
                webview.postMessage({
                  type: 'GET_RESPONSE_LANGUAGE_RESULT',
                  requestId: message.requestId,
                  payload: {
                    language: savedLanguage || null,
                  },
                });
              }
              break;

            case 'SET_RESPONSE_LANGUAGE':
              if (message.payload?.language) {
                await context.globalState.update(
                  'claude-api-response-language',
                  message.payload.language
                );
              }
              break;

            case 'OPEN_IN_EDITOR':
              // Open text content in VSCode native editor
              if (message.payload) {
                await handleOpenInEditor(message.payload, webview);
              }
              break;

            case 'GET_CURRENT_WORKFLOW_RESPONSE': {
              // Forward workflow response to MCP server manager
              const manager = getMcpServerManager();
              if (manager && message.payload) {
                manager.handleWorkflowResponse(
                  message.payload as GetCurrentWorkflowResponsePayload
                );
              }
              break;
            }

            case 'APPLY_WORKFLOW_FROM_MCP_RESPONSE': {
              // Forward apply response to MCP server manager
              const applyManager = getMcpServerManager();
              if (applyManager && message.payload) {
                applyManager.handleApplyResponse(
                  message.payload as ApplyWorkflowFromMcpResponsePayload
                );
              }
              break;
            }

            case 'START_MCP_SERVER': {
              // Start built-in MCP server
              const startManager = getMcpServerManager();
              if (!startManager) {
                webview.postMessage({
                  type: 'MCP_SERVER_STATUS',
                  payload: {
                    running: false,
                    port: null,
                    configsWritten: [],
                    reviewBeforeApply: true,
                  },
                });
                break;
              }

              try {
                const payload = message.payload as StartMcpServerPayload | undefined;
                const configTargets: McpConfigTarget[] = payload?.configTargets || [
                  'claude-code',
                  'roo-code',
                  'copilot',
                ];

                const port = await startManager.start(
                  context.extensionPath,
                  getConfiguredMcpPort()
                );
                const serverUrl = `http://127.0.0.1:${port}/mcp`;

                // Write config to selected targets
                const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                let configsWritten: McpConfigTarget[] = [];
                if (workspacePath) {
                  configsWritten = await writeAllAgentConfigs(
                    configTargets,
                    serverUrl,
                    workspacePath
                  );
                }

                webview.postMessage({
                  type: 'MCP_SERVER_STATUS',
                  requestId: message.requestId,
                  payload: {
                    running: true,
                    port,
                    configsWritten,
                    reviewBeforeApply: startManager.getReviewBeforeApply(),
                  },
                });

                log('INFO', 'MCP Server started via UI', { port, configsWritten });
              } catch (error) {
                const errMsg = error instanceof Error ? error.message : String(error);
                log('ERROR', 'Failed to start MCP server', { error: errMsg });
                vscode.window.showErrorMessage(errMsg);
                webview.postMessage({
                  type: 'MCP_SERVER_STATUS',
                  requestId: message.requestId,
                  payload: {
                    running: false,
                    port: null,
                    configsWritten: [],
                    reviewBeforeApply: startManager.getReviewBeforeApply(),
                  },
                });
              }
              break;
            }

            case 'STOP_MCP_SERVER': {
              // Stop built-in MCP server
              const stopManager = getMcpServerManager();
              if (!stopManager) {
                webview.postMessage({
                  type: 'MCP_SERVER_STATUS',
                  payload: {
                    running: false,
                    port: null,
                    configsWritten: [],
                    reviewBeforeApply: true,
                  },
                });
                break;
              }

              try {
                await stopManager.stop();

                webview.postMessage({
                  type: 'MCP_SERVER_STATUS',
                  requestId: message.requestId,
                  payload: {
                    running: false,
                    port: null,
                    configsWritten: [],
                    reviewBeforeApply: stopManager.getReviewBeforeApply(),
                  },
                });

                log('INFO', 'MCP Server stopped via UI');
              } catch (error) {
                log('ERROR', 'Failed to stop MCP server', {
                  error: error instanceof Error ? error.message : String(error),
                });
                webview.postMessage({
                  type: 'MCP_SERVER_STATUS',
                  payload: {
                    running: false,
                    port: null,
                    configsWritten: [],
                    reviewBeforeApply: stopManager.getReviewBeforeApply(),
                  },
                });
              }
              break;
            }

            case 'GET_MCP_SERVER_STATUS': {
              // Return current MCP server status
              const statusManager = getMcpServerManager();
              const running = statusManager?.isRunning() ?? false;
              const statusPort = running ? (statusManager?.getPort() ?? null) : null;
              webview.postMessage({
                type: 'MCP_SERVER_STATUS',
                payload: {
                  running,
                  port: statusPort,
                  configsWritten: [],
                  reviewBeforeApply: statusManager?.getReviewBeforeApply() ?? true,
                },
              });
              break;
            }

            case 'SET_REVIEW_BEFORE_APPLY': {
              const reviewPayload = message.payload as SetReviewBeforeApplyPayload | undefined;
              if (reviewPayload != null) {
                const reviewManager = getMcpServerManager();
                if (reviewManager) {
                  reviewManager.setReviewBeforeApply(reviewPayload.value);
                }
              }
              break;
            }

            case 'RUN_AI_EDITING_SKILL': {
              // Run AI editing skill with specified provider
              const aiEditPayload = message.payload as RunAiEditingSkillPayload | undefined;
              if (aiEditPayload?.provider) {
                try {
                  const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                  if (!workspacePath) {
                    throw new Error('No workspace folder is open');
                  }
                  await generateAndRunAiEditingSkill(
                    aiEditPayload.provider as AiEditingProvider,
                    context.extensionPath,
                    workspacePath
                  );
                  webview.postMessage({
                    type: 'RUN_AI_EDITING_SKILL_SUCCESS',
                    requestId: message.requestId,
                    payload: {
                      provider: aiEditPayload.provider,
                      timestamp: new Date().toISOString(),
                    },
                  });
                } catch (error) {
                  webview.postMessage({
                    type: 'RUN_AI_EDITING_SKILL_FAILED',
                    requestId: message.requestId,
                    payload: {
                      errorMessage:
                        error instanceof Error ? error.message : 'Failed to run AI editing skill',
                      timestamp: new Date().toISOString(),
                    },
                  });
                }
              }
              break;
            }

            case 'LAUNCH_AI_AGENT': {
              // One-click AI agent launch: start server → write config → launch skill
              const launchPayload = message.payload as LaunchAiAgentPayload | undefined;
              if (!launchPayload?.provider) break;

              try {
                const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (!workspacePath) {
                  throw new Error('No workspace folder is open');
                }

                const launchManager = getMcpServerManager();
                if (!launchManager) {
                  throw new Error('MCP server manager is not available');
                }

                // 1. Start server if not running
                let serverPort = launchManager.getPort();
                if (!launchManager.isRunning()) {
                  serverPort = await launchManager.start(
                    context.extensionPath,
                    getConfiguredMcpPort()
                  );
                }
                const serverUrl = `http://127.0.0.1:${serverPort}/mcp`;

                // 1.5. Track provider for schema variant selection
                launchManager.setCurrentProvider(launchPayload.provider);

                // 2. Write config for this provider if not yet written
                const requiredTargets = getConfigTargetsForProvider(launchPayload.provider);
                const alreadyWritten = launchManager.getWrittenConfigs();
                const newTargets = requiredTargets.filter((t) => !alreadyWritten.has(t));
                if (newTargets.length > 0) {
                  const written = await writeAllAgentConfigs(newTargets, serverUrl, workspacePath);
                  launchManager.addWrittenConfigs(written);
                }

                // Check for port mismatch in config files
                if (serverPort !== null) {
                  const primaryTarget = requiredTargets[0];
                  const { mismatch, configPort } = await checkPortMismatch(
                    primaryTarget,
                    serverPort,
                    workspacePath
                  );
                  if (mismatch) {
                    vscode.window.showWarningMessage(
                      `MCP port mismatch: server is running on port ${serverPort}, but ${primaryTarget} config has port ${configPort}. Rewriting config.`
                    );
                    for (const t of requiredTargets) {
                      launchManager.getWrittenConfigs().delete(t);
                    }
                    const rewritten = await writeAllAgentConfigs(
                      requiredTargets,
                      serverUrl,
                      workspacePath
                    );
                    launchManager.addWrittenConfigs(rewritten);
                  }
                }

                // 3. Send MCP_SERVER_STATUS update
                webview.postMessage({
                  type: 'MCP_SERVER_STATUS',
                  payload: {
                    running: true,
                    port: serverPort,
                    configsWritten: [...launchManager.getWrittenConfigs()],
                    reviewBeforeApply: launchManager.getReviewBeforeApply(),
                  },
                });

                // 4. Generate and run AI editing skill
                await generateAndRunAiEditingSkill(
                  launchPayload.provider as AiEditingProvider,
                  context.extensionPath,
                  workspacePath
                );

                // For Antigravity, pause and let the user manually refresh MCP
                if (launchPayload.provider === 'antigravity') {
                  webview.postMessage({
                    type: 'ANTIGRAVITY_MCP_REFRESH_NEEDED',
                    requestId: message.requestId,
                    payload: {
                      context: 'ai-editing' as const,
                      skillName: 'cc-workflow-ai-editor',
                    },
                  });
                  log('INFO', 'Antigravity MCP refresh needed, waiting for user', {
                    port: serverPort,
                  });
                  break;
                }

                webview.postMessage({
                  type: 'LAUNCH_AI_AGENT_SUCCESS',
                  requestId: message.requestId,
                  payload: {
                    provider: launchPayload.provider,
                    timestamp: new Date().toISOString(),
                  },
                });

                log('INFO', 'AI agent launched via one-click', {
                  provider: launchPayload.provider,
                  port: serverPort,
                });
              } catch (error) {
                log('ERROR', 'Failed to launch AI agent', {
                  error: error instanceof Error ? error.message : String(error),
                });
                webview.postMessage({
                  type: 'LAUNCH_AI_AGENT_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorMessage:
                      error instanceof Error ? error.message : 'Failed to launch AI agent',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;
            }

            case 'OPEN_ANTIGRAVITY_MCP_SETTINGS': {
              await openAntigravityMcpSettings();
              break;
            }

            case 'CONFIRM_ANTIGRAVITY_CASCADE_LAUNCH': {
              try {
                const skillName = message.payload?.skillName || 'cc-workflow-ai-editor';
                await startAntigravityTask(skillName);
                webview.postMessage({
                  type: 'LAUNCH_AI_AGENT_SUCCESS',
                  requestId: message.requestId,
                  payload: {
                    provider: 'antigravity',
                    timestamp: new Date().toISOString(),
                  },
                });
              } catch (error) {
                webview.postMessage({
                  type: 'LAUNCH_AI_AGENT_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorMessage:
                      error instanceof Error ? error.message : 'Failed to launch Antigravity',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;
            }

            case 'UPLOAD_TO_CLAUDE_API':
              if (message.payload?.workflow) {
                await handleUploadToClaudeApi(
                  webview,
                  message.payload,
                  anthropicApiKeyManager,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'UPLOAD_TO_CLAUDE_API_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'UNKNOWN_ERROR',
                    errorMessage: 'Workflow is required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'EXECUTE_UPLOADED_SKILL':
              if (message.payload?.skillId && message.payload?.prompt) {
                await handleExecuteUploadedSkill(
                  webview,
                  message.payload,
                  anthropicApiKeyManager,
                  message.requestId
                );
              } else {
                webview.postMessage({
                  type: 'EXECUTE_UPLOADED_SKILL_FAILED',
                  requestId: message.requestId,
                  payload: {
                    errorCode: 'INVALID_PAYLOAD',
                    errorMessage: 'skillId and prompt are required',
                    timestamp: new Date().toISOString(),
                  },
                });
              }
              break;

            case 'STORE_ANTHROPIC_API_KEY':
              if (message.payload?.apiKey) {
                await handleStoreAnthropicApiKey(
                  webview,
                  message.payload,
                  anthropicApiKeyManager,
                  message.requestId
                );
              }
              break;

            case 'CHECK_ANTHROPIC_API_KEY':
              await handleCheckAnthropicApiKey(webview, anthropicApiKeyManager, message.requestId);
              break;

            case 'CLEAR_ANTHROPIC_API_KEY':
              await handleClearAnthropicApiKey(webview, anthropicApiKeyManager, message.requestId);
              break;

            case 'LIST_CUSTOM_SKILLS':
              await handleListCustomSkills(webview, anthropicApiKeyManager, message.requestId);
              break;

            case 'DELETE_CUSTOM_SKILL':
              await handleDeleteCustomSkill(
                webview,
                message.payload,
                anthropicApiKeyManager,
                message.requestId
              );
              break;

            case 'GET_MCP_SERVER_TYPES':
              await handleGetMcpServerTypes(webview, message.payload, message.requestId);
              break;

            case 'UPLOAD_DEPENDENT_SKILL':
              await handleUploadDependentSkill(
                webview,
                message.payload,
                anthropicApiKeyManager,
                message.requestId
              );
              break;

            case 'GET_SAVED_MCP_SERVER_URLS':
              await handleGetSavedMcpServerUrls(context, webview, message.requestId);
              break;

            case 'SAVE_MCP_SERVER_URLS':
              await handleSaveMcpServerUrls(context, webview, message.payload, message.requestId);
              break;

            case 'LOOKUP_MCP_REGISTRY':
              await handleLookupMcpRegistry(webview, message.payload, message.requestId);
              break;

            case 'GET_SKILL_VERSION_DETAILS':
              await handleGetSkillVersionDetails(
                webview,
                message.payload,
                anthropicApiKeyManager,
                message.requestId
              );
              break;

            case 'GET_CHANGELOG': {
              try {
                const changelogUri = vscode.Uri.joinPath(
                  vscode.Uri.file(context.extensionPath),
                  'CHANGELOG.md'
                );
                const changelogBytes = await vscode.workspace.fs.readFile(changelogUri);
                const changelogContent = Buffer.from(changelogBytes).toString('utf-8');
                const entries = parseChangelog(changelogContent, 5);
                const lastViewed = context.globalState.get<string>('whatsNewLastViewedVersion');
                const extensionPkg = require(
                  vscode.Uri.joinPath(vscode.Uri.file(context.extensionPath), 'package.json').fsPath
                );
                webview.postMessage({
                  type: 'GET_CHANGELOG_RESULT',
                  requestId: message.requestId,
                  payload: {
                    entries,
                    unreadCount: countUnreadVersions(changelogContent, lastViewed),
                    currentVersion: extensionPkg.version,
                  },
                });
              } catch {
                webview.postMessage({
                  type: 'GET_CHANGELOG_RESULT',
                  requestId: message.requestId,
                  payload: {
                    entries: [],
                    unreadCount: 0,
                    currentVersion: '',
                  },
                });
              }
              break;
            }

            case 'MARK_CHANGELOG_READ': {
              try {
                const changelogUri = vscode.Uri.joinPath(
                  vscode.Uri.file(context.extensionPath),
                  'CHANGELOG.md'
                );
                const changelogBytes = await vscode.workspace.fs.readFile(changelogUri);
                const changelogContent = Buffer.from(changelogBytes).toString('utf-8');
                const versions = extractVersions(changelogContent);
                const latestVersion = versions[0];
                if (latestVersion) {
                  await context.globalState.update('whatsNewLastViewedVersion', latestVersion);
                }
              } catch {
                // Ignore errors
              }
              break;
            }

            case 'SET_WHATS_NEW_BADGE': {
              const show = message.payload?.show ?? true;
              await context.globalState.update('showWhatsNewBadge', show);
              break;
            }

            case 'TOGGLE_COMMENTARY': {
              isCommentaryEnabled = message.payload?.enabled ?? false;
              commentaryProvider = message.payload?.provider ?? 'claude-code';
              commentaryCopilotModel = message.payload?.copilotModel;
              commentaryLanguage = message.payload?.language ?? 'English';
              log('INFO', 'Commentary AI toggled', {
                enabled: isCommentaryEnabled,
                provider: commentaryProvider,
                copilotModel: commentaryCopilotModel,
                language: commentaryLanguage,
              });
              if (!isCommentaryEnabled) {
                commentarySessionManager?.stopCommentary();
              }
              break;
            }

            case 'STOP_COMMENTARY': {
              commentarySessionManager?.stopCommentary();
              break;
            }

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
          // Cancel any ongoing OAuth polling when panel is closed
          if (activeOAuthService) {
            activeOAuthService.cancelPolling();
            activeOAuthService = null;
          }
          // Stop Commentary AI session
          commentarySessionManager?.dispose();

          // Disconnect MCP server manager from webview
          const disposeManager = getMcpServerManager();
          if (disposeManager) {
            disposeManager.setWebview(null);
          }
          currentPanel = undefined;
        },
        undefined,
        context.subscriptions
      );

      // Show information message
      vscode.window.showInformationMessage('CC Workflow Studio: Editor opened!');
    }
  );

  context.subscriptions.push(openEditorCommand);

  return currentPanel || null;
}

/**
 * Prepare the editor for loading a new workflow
 * Sends a message to show loading state
 *
 * @param workflowId - The workflow ID being loaded
 */
export function prepareEditorForLoad(workflowId: string): boolean {
  if (!currentPanel) {
    return false;
  }

  currentPanel.webview.postMessage({
    type: 'PREPARE_WORKFLOW_LOAD',
    payload: { workflowId },
  });
  return true;
}

/**
 * Load a workflow into the main editor panel
 * Used by preview panel to open workflow in editor mode
 *
 * @param workflowId - The workflow ID (filename without extension)
 */
export async function loadWorkflowIntoEditor(workflowId: string): Promise<boolean> {
  if (!currentPanel) {
    return false;
  }

  if (!fileService) {
    return false;
  }

  try {
    // Load the workflow using the existing loadWorkflow function
    await loadWorkflow(fileService, currentPanel.webview, workflowId, `preview-load-${Date.now()}`);
    return true;
  } catch (error) {
    console.error('Failed to load workflow into editor:', error);
    return false;
  }
}

/**
 * Check if the main editor panel exists
 */
export function hasEditorPanel(): boolean {
  return currentPanel !== undefined;
}
