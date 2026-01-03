/**
 * Claude Code Workflow Studio - Workflow Preview Editor Provider
 *
 * Custom editor provider that shows a visual preview of workflow JSON files
 * instead of the default JSON text editor.
 */

import { execFileSync } from 'node:child_process';
import * as path from 'node:path';
import * as vscode from 'vscode';
import type { Workflow } from '../../shared/types/workflow-definition';
import { loadWorkflowIntoEditor, prepareEditorForLoad } from '../commands/open-editor';
import { log } from '../extension';
import { migrateWorkflow } from '../utils/migrate-workflow';
import { validateWorkflowFile } from '../utils/workflow-validator';
import { getWebviewContent } from '../webview-content';

/**
 * Check if a file has uncommitted git changes
 */
function hasGitChanges(filePath: string): boolean {
  try {
    const dir = path.dirname(filePath);
    const fileName = path.basename(filePath);
    // Check for both staged and unstaged changes
    // Use execFileSync with array args to avoid shell escaping issues on Windows
    const result = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', fileName], {
      cwd: dir,
      encoding: 'utf-8',
      timeout: 5000,
    });
    return result.trim().length > 0;
  } catch {
    // If git command fails (not a git repo, etc.), return false
    return false;
  }
}

/**
 * Custom editor provider for workflow JSON files
 * Opens a visual preview instead of the default text editor
 */
export class WorkflowPreviewEditorProvider implements vscode.CustomTextEditorProvider {
  public static readonly viewType = 'cc-wf-studio.workflowPreview';

  constructor(private readonly context: vscode.ExtensionContext) {}

  /**
   * Register the custom editor provider
   */
  public static register(context: vscode.ExtensionContext): vscode.Disposable {
    const provider = new WorkflowPreviewEditorProvider(context);
    const registration = vscode.window.registerCustomEditorProvider(
      WorkflowPreviewEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
        supportsMultipleEditorsPerDocument: false,
      }
    );
    return registration;
  }

  /**
   * Called when a custom editor is opened
   */
  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    // Configure webview
    webviewPanel.webview.options = {
      enableScripts: true,
      localResourceRoots: [
        vscode.Uri.joinPath(this.context.extensionUri, 'src', 'webview', 'dist'),
      ],
    };

    // Set webview HTML content
    webviewPanel.webview.html = getWebviewContent(webviewPanel.webview, this.context.extensionUri);

    // Parse and send initial workflow
    const sendWorkflow = () => {
      const { workflow, error } = this.parseWorkflow(document);

      // Detect if this is a historical version (git diff "before" side)
      // Git diff uses 'git' scheme for historical versions
      const isHistoricalVersion = document.uri.scheme === 'git';

      // Check if file has git changes (for showing "After" badge on current version)
      const fileHasGitChanges =
        !isHistoricalVersion && document.uri.scheme === 'file'
          ? hasGitChanges(document.uri.fsPath)
          : false;

      if (error) {
        webviewPanel.webview.postMessage({
          type: 'PREVIEW_PARSE_ERROR',
          payload: { error },
        });
      } else if (workflow) {
        webviewPanel.webview.postMessage({
          type: 'PREVIEW_MODE_INIT',
          payload: { workflow, isHistoricalVersion, hasGitChanges: fileHasGitChanges },
        });
      }
    };

    // Send workflow after webview is ready
    setTimeout(sendWorkflow, 300);

    // Listen for document changes
    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument((e) => {
      if (e.document.uri.toString() === document.uri.toString()) {
        const { workflow, error } = this.parseWorkflow(document);

        if (error) {
          webviewPanel.webview.postMessage({
            type: 'PREVIEW_PARSE_ERROR',
            payload: { error },
          });
        } else if (workflow) {
          webviewPanel.webview.postMessage({
            type: 'PREVIEW_UPDATE',
            payload: { workflow },
          });
        }
      }
    });

    // Handle messages from webview
    webviewPanel.webview.onDidReceiveMessage(async (message: { type: string }) => {
      if (message.type === 'OPEN_WORKFLOW_IN_EDITOR') {
        const fileName = document.uri.fsPath.split(/[\\/]/).pop() || '';
        const workflowId = fileName.replace(/\.json$/, '');

        log('INFO', 'Opening workflow in editor from custom editor', { workflowId });

        // Open the main Workflow Studio editor
        await vscode.commands.executeCommand('cc-wf-studio.openEditor');

        // Prepare editor for loading (show loading state)
        prepareEditorForLoad(workflowId);

        // Load the workflow after a delay to allow webview to initialize
        setTimeout(async () => {
          const success = await loadWorkflowIntoEditor(workflowId);
          if (success) {
            log('INFO', 'Workflow loaded into editor successfully', { workflowId });
          } else {
            log('WARN', 'Failed to load workflow into editor', { workflowId });
          }
        }, 600);
      }
    });

    // Cleanup on dispose
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });

    log('INFO', 'Workflow Preview custom editor opened', {
      fileName: document.uri.fsPath.split(/[\\/]/).pop(),
    });
  }

  /**
   * Parse workflow from document content
   */
  private parseWorkflow(document: vscode.TextDocument): {
    workflow: Workflow | null;
    error: string | null;
  } {
    try {
      const content = document.getText();
      const validationResult = validateWorkflowFile(content);

      if (!validationResult.valid || !validationResult.workflow) {
        return {
          workflow: null,
          error: validationResult.errors?.join(', ') || 'Invalid workflow format',
        };
      }

      // Apply migrations for backward compatibility
      const workflow = migrateWorkflow(validationResult.workflow);
      return { workflow, error: null };
    } catch (error) {
      return {
        workflow: null,
        error: error instanceof Error ? error.message : 'Failed to parse workflow',
      };
    }
  }
}
