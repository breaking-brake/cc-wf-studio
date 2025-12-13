/**
 * Claude Code Workflow Studio - Extension Entry Point
 *
 * Main activation and deactivation logic for the VSCode extension.
 */

import * as vscode from 'vscode';
import { registerOpenEditorCommand } from './commands/open-editor';
import { handleConnectSlackManual } from './commands/slack-connect-manual';
import {
  getCodebaseIndexService,
  initializeCodebaseIndexService,
} from './services/codebase-index-service';
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

  // Register Codebase Index test command (Issue #265 - for E2E testing)
  context.subscriptions.push(
    vscode.commands.registerCommand('cc-wf-studio.testCodebaseIndex', async () => {
      log('INFO', 'Codebase Index: Test command invoked');

      try {
        // Initialize service if needed
        let service = getCodebaseIndexService();
        if (!service) {
          log('INFO', 'Initializing codebase index service...');
          service = await initializeCodebaseIndexService(context);
        }

        if (!service) {
          vscode.window.showErrorMessage('No workspace folder found. Open a workspace first.');
          return;
        }

        // Show options to user
        const action = await vscode.window.showQuickPick(
          [
            { label: '$(database) Build Index', value: 'build' },
            { label: '$(search) Search Codebase', value: 'search' },
            { label: '$(info) Get Status', value: 'status' },
            { label: '$(trash) Clear Index', value: 'clear' },
          ],
          { placeHolder: 'Select an action' }
        );

        if (!action) return;

        switch (action.value) {
          case 'build': {
            vscode.window.withProgress(
              {
                location: vscode.ProgressLocation.Notification,
                title: 'Building codebase index...',
                cancellable: true,
              },
              async (progress, token) => {
                // Set up progress callback
                service.setProgressCallback((p) => {
                  progress.report({
                    message: `${p.phase}: ${p.processedFiles}/${p.totalFiles} files (${p.percentage}%)`,
                    increment: p.percentage > 0 ? 1 : 0,
                  });
                });

                // Handle cancellation
                token.onCancellationRequested(() => {
                  service.cancelBuild();
                });

                const result = await service.buildIndex();
                service.setProgressCallback(null);

                if (result.success) {
                  vscode.window.showInformationMessage(
                    `Index built: ${result.documentCount} documents from ${result.fileCount} files in ${result.buildTimeMs}ms`
                  );
                  log('INFO', 'Index build completed', result);
                } else {
                  vscode.window.showErrorMessage(`Index build failed: ${result.errorMessage}`);
                  log('ERROR', 'Index build failed', result);
                }
              }
            );
            break;
          }

          case 'search': {
            const query = await vscode.window.showInputBox({
              prompt: 'Enter search query',
              placeHolder: 'function, class, import...',
            });

            if (!query) return;

            try {
              const result = await service.search(query, { limit: 10 });
              log('INFO', 'Search completed', {
                query,
                resultCount: result.results.length,
                executionTimeMs: result.executionTimeMs,
              });

              if (result.results.length === 0) {
                vscode.window.showInformationMessage(`No results found for "${query}"`);
                return;
              }

              // Show results in quick pick
              const items = result.results.map((r) => ({
                label: `$(file) ${r.document.filePath}`,
                description: `Lines ${r.document.startLine}-${r.document.endLine} (score: ${r.score.toFixed(3)})`,
                detail: r.document.content.substring(0, 100) + '...',
                filePath: r.document.filePath,
                startLine: r.document.startLine,
              }));

              const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `${result.results.length} results found (${result.executionTimeMs}ms)`,
              });

              if (selected) {
                // Open the file at the specified line
                const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
                if (workspaceRoot) {
                  const uri = vscode.Uri.file(`${workspaceRoot}/${selected.filePath}`);
                  const doc = await vscode.workspace.openTextDocument(uri);
                  await vscode.window.showTextDocument(doc, {
                    selection: new vscode.Range(
                      selected.startLine - 1,
                      0,
                      selected.startLine - 1,
                      0
                    ),
                  });
                }
              }
            } catch (error) {
              const msg = error instanceof Error ? error.message : 'Unknown error';
              vscode.window.showErrorMessage(`Search failed: ${msg}`);
              log('ERROR', 'Search failed', { query, error: msg });
            }
            break;
          }

          case 'status': {
            const status = await service.getStatus();
            const message = [
              `State: ${status.state}`,
              `Documents: ${status.documentCount}`,
              `Files: ${status.fileCount}`,
              `Last Build: ${status.lastBuildTime || 'Never'}`,
              `Index File: ${status.indexFilePath || 'None'}`,
            ].join('\n');

            vscode.window.showInformationMessage(message, { modal: true });
            log('INFO', 'Index status', status);
            break;
          }

          case 'clear': {
            const confirm = await vscode.window.showWarningMessage(
              'Are you sure you want to clear the index?',
              { modal: true },
              'Yes, Clear'
            );

            if (confirm === 'Yes, Clear') {
              await service.clearIndex();
              vscode.window.showInformationMessage('Index cleared successfully');
              log('INFO', 'Index cleared');
            }
            break;
          }
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        vscode.window.showErrorMessage(`Codebase Index Error: ${msg}`);
        log('ERROR', 'Codebase index test command failed', { error: msg });
      }
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
