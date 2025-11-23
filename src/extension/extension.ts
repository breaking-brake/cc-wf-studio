/**
 * Claude Code Workflow Studio - Extension Entry Point
 *
 * Main activation and deactivation logic for the VSCode extension.
 */

import * as vscode from 'vscode';
import { registerOpenEditorCommand } from './commands/open-editor';
import { handleConnectSlackManual } from './commands/slack-connect-manual';
import { SlackApiService } from './services/slack-api-service';
import { SlackTokenManager } from './utils/slack-token-manager';

/**
 * Global Output Channel for logging
 */
let outputChannel: vscode.OutputChannel | null = null;

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
 * Extension activation function
 * Called when the extension is activated (when the command is first invoked)
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('Claude Code Workflow Studio');
  context.subscriptions.push(outputChannel);

  log('INFO', 'Claude Code Workflow Studio is now active');

  // Register commands
  registerOpenEditorCommand(context);

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
          });

          // Open editor with import parameters
          vscode.commands
            .executeCommand('cc-wf-studio.openEditor', {
              fileId,
              channelId,
              messageTs,
              workspaceId,
              workflowId,
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

  log('INFO', 'Claude Code Workflow Studio: All commands and handlers registered');
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  log('INFO', 'Claude Code Workflow Studio is now deactivated');
  outputChannel?.dispose();
  outputChannel = null;
}
