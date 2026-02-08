/**
 * CC Workflow Studio - Extension Entry Point
 *
 * Main activation and deactivation logic for the VSCode extension.
 */

import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { registerOpenEditorCommand } from './commands/open-editor';
import { handleConnectSlackManual } from './commands/slack-connect-manual';
import { WorkflowPreviewEditorProvider } from './editors/workflow-preview-editor-provider';
import { removeAllAgentConfigs } from './services/mcp-server-config-writer';
import { McpServerManager } from './services/mcp-server-service';
import { SlackApiService } from './services/slack-api-service';
import { SlackTokenManager } from './utils/slack-token-manager';

/**
 * Global Output Channel for logging
 */
let outputChannel: vscode.OutputChannel | null = null;

/**
 * Global MCP Server Manager instance
 */
let mcpServerManager: McpServerManager | null = null;

/**
 * Get the global output channel instance
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    throw new Error('Output channel not initialized. Call activate() first.');
  }
  return outputChannel;
}

/**
 * Log a message to the output channel
 *
 * @param level - Log level (INFO, WARN, ERROR)
 * @param message - Message to log
 * @param data - Optional additional data to log
 */
export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  if (outputChannel) {
    outputChannel.appendLine(logMessage);
    if (data) {
      outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
  }

  // Also log to console for debugging
  console.log(logMessage, data ?? '');
}

/**
 * Clean up legacy BM25 index data from globalStorageUri
 *
 * This function removes the old BM25 codebase index data that was stored
 * when the BM25 search feature was active. The feature has been removed
 * and this cleanup ensures no orphaned data remains on user devices.
 *
 * @param context - Extension context containing globalStorageUri
 */
async function cleanupLegacyBM25Index(context: vscode.ExtensionContext): Promise<void> {
  try {
    if (!context.globalStorageUri) {
      log('WARN', 'BM25 Cleanup: globalStorageUri not available, skipping cleanup');
      return;
    }

    const indexesDir = path.join(context.globalStorageUri.fsPath, 'indexes');

    // Check if the indexes directory exists
    try {
      await fs.access(indexesDir);
    } catch {
      // Directory doesn't exist, nothing to clean up
      log('INFO', 'BM25 Cleanup: No legacy index data found');
      return;
    }

    // Directory exists, remove it
    log('INFO', 'BM25 Cleanup: Removing legacy index directory', { path: indexesDir });
    await fs.rm(indexesDir, { recursive: true, force: true });
    log('INFO', 'BM25 Cleanup: Successfully removed legacy index data');
  } catch (error) {
    // Log error but don't prevent extension activation
    log('ERROR', 'BM25 Cleanup: Failed to remove legacy index data', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Get the global MCP Server Manager instance
 */
export function getMcpServerManager(): McpServerManager | null {
  return mcpServerManager;
}

/**
 * Extension activation function
 * Called when the extension is activated (when the command is first invoked)
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('CC Workflow Studio');
  context.subscriptions.push(outputChannel);

  log('INFO', 'CC Workflow Studio is now active');

  // Create MCP Server Manager (started via UI, not automatically)
  mcpServerManager = new McpServerManager();

  // Clean up legacy BM25 index data (fire-and-forget)
  cleanupLegacyBM25Index(context).catch((error) => {
    log('ERROR', 'BM25 Cleanup: Unexpected error during cleanup', { error });
  });

  // Register commands
  registerOpenEditorCommand(context);

  // Register custom editor provider for workflow preview
  context.subscriptions.push(WorkflowPreviewEditorProvider.register(context));

  // Register Slack import command (T031)
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeWorkflowStudio.slack.importWorkflow', async () => {
      log('INFO', 'Slack: Import Workflow command invoked');

      // Show input box for Slack file URL or ID
      const input = await vscode.window.showInputBox({
        prompt: 'Enter Slack file URL or file ID',
        placeHolder: 'https://files.slack.com/... or F0123456789',
      });

      if (!input) {
        log('INFO', 'User cancelled Slack import');
        return;
      }

      log('INFO', 'Slack import input received', { input });

      // TODO: Parse URL and extract file ID, then trigger import
      // For now, show error message
      vscode.window.showErrorMessage(
        'Slack import via command is not fully implemented yet. Use the "Import to VS Code" button in Slack messages.'
      );
    })
  );

  // Register Slack manual token connection command (T103)
  context.subscriptions.push(
    vscode.commands.registerCommand('claudeCodeWorkflowStudio.slack.connectManual', async () => {
      log('INFO', 'Slack: Connect Workspace (Manual Token) command invoked');

      const tokenManager = new SlackTokenManager(context);
      const slackApiService = new SlackApiService(tokenManager);

      await handleConnectSlackManual(tokenManager, slackApiService);
    })
  );

  // Register URI handler for deep links (vscode://cc-wf-studio/import?...)
  context.subscriptions.push(
    vscode.window.registerUriHandler({
      handleUri(uri: vscode.Uri): void {
        log('INFO', 'URI handler invoked', { uri: uri.toString() });

        // Parse URI path and query parameters
        const path = uri.path;
        const query = new URLSearchParams(uri.query);

        if (path === '/import') {
          // Extract import parameters
          const fileId = query.get('fileId');
          const channelId = query.get('channelId');
          const messageTs = query.get('messageTs');
          const workspaceId = query.get('workspaceId');
          const workflowId = query.get('workflowId');
          const workspaceNameBase64 = query.get('workspaceName');

          // Decode workspace name from Base64 if present
          let workspaceName: string | undefined;
          if (workspaceNameBase64) {
            try {
              workspaceName = Buffer.from(workspaceNameBase64, 'base64').toString('utf-8');
            } catch (_e) {
              log('WARN', 'Failed to decode workspace name from Base64', { workspaceNameBase64 });
            }
          }

          if (!fileId || !channelId || !messageTs || !workspaceId || !workflowId) {
            log('ERROR', 'Missing required import parameters', {
              fileId,
              channelId,
              messageTs,
              workspaceId,
              workflowId,
            });
            vscode.window.showErrorMessage('Invalid import URL: Missing required parameters');
            return;
          }

          log('INFO', 'Importing workflow from Slack via deep link', {
            fileId,
            channelId,
            messageTs,
            workspaceId,
            workflowId,
            workspaceName,
          });

          // Open editor with import parameters
          vscode.commands
            .executeCommand('cc-wf-studio.openEditor', {
              fileId,
              channelId,
              messageTs,
              workspaceId,
              workflowId,
              workspaceName,
            })
            .then(() => {
              log('INFO', 'Editor opened with import parameters', { workflowId });
            });
        } else {
          log('WARN', 'Unknown URI path', { path });
          vscode.window.showErrorMessage(`Unknown deep link path: ${path}`);
        }
      },
    })
  );

  log('INFO', 'CC Workflow Studio: All commands and handlers registered');
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export async function deactivate(): Promise<void> {
  // Stop MCP server and clean up configs if running
  if (mcpServerManager?.isRunning()) {
    try {
      await mcpServerManager.stop();
      const workspacePath = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (workspacePath) {
        await removeAllAgentConfigs(workspacePath);
      }
    } catch (error) {
      log('ERROR', 'Failed to stop MCP server during deactivation', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  mcpServerManager = null;

  log('INFO', 'CC Workflow Studio is now deactivated');
  outputChannel?.dispose();
  outputChannel = null;
}
