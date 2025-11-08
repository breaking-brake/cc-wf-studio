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
import { getWebviewContent } from '../webview-content';
import { handleGenerateWorkflow } from './ai-generation';
import { handleExportWorkflow } from './export-workflow';
import { loadWorkflow } from './load-workflow';
import { loadWorkflowList } from './load-workflow-list';
import { saveWorkflow } from './save-workflow';
import { handleBrowseSkills, handleCreateSkill, handleValidateSkillFile } from './skill-operations';

/**
 * Register the open editor command
 *
 * @param context - VSCode extension context
 */
export function registerOpenEditorCommand(
  context: vscode.ExtensionContext
): vscode.WebviewPanel | null {
  let currentPanel: vscode.WebviewPanel | undefined;
  let fileService: FileService;

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
              await handleGenerateWorkflow(
                message.payload,
                webview,
                context.extensionPath,
                message.requestId || ''
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
