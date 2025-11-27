/**
 * Slack Import Workflow Command Handler
 *
 * Handles IMPORT_WORKFLOW_FROM_SLACK messages from Webview.
 * Downloads workflow file from Slack, validates, and saves to local filesystem.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/extension-host-api-contracts.md
 */

import * as path from 'node:path';
import * as vscode from 'vscode';
import type { ImportWorkflowFromSlackPayload } from '../../shared/types/messages';
import { log } from '../extension';
import type { FileService } from '../services/file-service';
import type { SlackApiService } from '../services/slack-api-service';
import type {
  ImportWorkflowFailedEvent,
  ImportWorkflowSuccessEvent,
} from '../types/slack-messages';
import { migrateWorkflow } from '../utils/migrate-workflow';
import { handleSlackError } from '../utils/slack-error-handler';
import { validateWorkflowFile } from '../utils/workflow-validator';

/**
 * Handle workflow import from Slack
 *
 * @param payload - Import workflow request
 * @param webview - Webview to send response to
 * @param requestId - Request ID for correlation
 * @param fileService - File service instance
 * @param slackApiService - Slack API service instance
 */
export async function handleImportWorkflowFromSlack(
  payload: ImportWorkflowFromSlackPayload,
  webview: vscode.Webview,
  requestId: string,
  fileService: FileService,
  slackApiService: SlackApiService
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'Slack workflow import started', {
    requestId,
    workflowId: payload.workflowId,
    fileId: payload.fileId,
    workspaceId: payload.workspaceId,
  });

  try {
    // Step 1: Download workflow file from Slack
    log('INFO', 'Downloading workflow file from Slack', { requestId });
    const content = await slackApiService.downloadWorkflowFile(payload.workspaceId, payload.fileId);

    log('INFO', 'Workflow file downloaded successfully', {
      requestId,
      contentLength: content.length,
    });

    // Step 2: Validate workflow file
    log('INFO', 'Validating workflow file', { requestId });
    const validationResult = validateWorkflowFile(content);

    if (!validationResult.valid) {
      log('ERROR', 'Workflow validation failed', {
        requestId,
        errors: validationResult.errors,
      });

      sendImportFailed(
        webview,
        requestId,
        payload.workflowId,
        'INVALID_WORKFLOW_FILE',
        `Invalid workflow file: ${validationResult.errors?.join(', ')}`
      );
      return;
    }

    const parsedWorkflow = validationResult.workflow;
    if (!parsedWorkflow) {
      throw new Error('Workflow validation succeeded but workflow object is missing');
    }

    // Apply migrations for backward compatibility
    const workflow = migrateWorkflow(parsedWorkflow);

    log('INFO', 'Workflow validation passed', {
      requestId,
      workflowName: workflow.name,
    });

    // Step 3: Select workspace for saving
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
      log('ERROR', 'No workspace folder is open', { requestId });
      sendImportFailed(
        webview,
        requestId,
        payload.workflowId,
        'FILE_WRITE_ERROR',
        'No workspace folder is open. Please open a folder or workspace first.'
      );
      return;
    }

    let selectedWorkspace: vscode.WorkspaceFolder;

    if (workspaceFolders.length === 1) {
      // Only one workspace, use it directly
      selectedWorkspace = workspaceFolders[0];
      log('INFO', 'Single workspace detected, using it automatically', {
        requestId,
        workspaceName: selectedWorkspace.name,
      });
    } else {
      // Multiple workspaces, ask user to select
      const workspaceItems = workspaceFolders.map((folder) => ({
        label: folder.name,
        description: folder.uri.fsPath,
        folder,
      }));

      const selected = await vscode.window.showQuickPick(workspaceItems, {
        placeHolder: `Select workspace to save workflow "${workflow.name}"`,
        ignoreFocusOut: true,
      });

      if (!selected) {
        log('INFO', 'User cancelled workspace selection', { requestId });
        // User cancelled, don't send error just stop
        return;
      }

      selectedWorkspace = selected.folder;
      log('INFO', 'User selected workspace', {
        requestId,
        workspaceName: selectedWorkspace.name,
      });
    }

    // Step 4: Determine file path
    const workflowsDir = path.join(selectedWorkspace.uri.fsPath, '.vscode', 'workflows');
    const fileName = `${workflow.name.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    const filePath = path.join(workflowsDir, fileName);

    // Ensure .vscode/workflows directory exists
    const workflowsDirUri = vscode.Uri.file(workflowsDir);
    try {
      await vscode.workspace.fs.stat(workflowsDirUri);
    } catch {
      await vscode.workspace.fs.createDirectory(workflowsDirUri);
      log('INFO', 'Created workflows directory', { requestId, workflowsDir });
    }

    // Step 4: Check if file exists (unless overwriting)
    if (!payload.overwriteExisting) {
      const fileExists = await fileService.fileExists(filePath);

      if (fileExists) {
        log('WARN', 'Workflow file already exists', {
          requestId,
          filePath,
        });

        // Show VSCode native confirmation dialog
        const userChoice = await vscode.window.showWarningMessage(
          `Workflow "${workflow.name}" already exists. Do you want to overwrite it?`,
          { modal: true },
          'Overwrite',
          'Cancel'
        );

        if (userChoice !== 'Overwrite') {
          log('INFO', 'User cancelled overwrite', { requestId });
          // User cancelled - hide loading overlay in Webview
          webview.postMessage({
            type: 'IMPORT_WORKFLOW_CANCELLED',
            requestId,
          });
          return;
        }

        log('INFO', 'User confirmed overwrite', { requestId });
        // Continue to save (fall through to Step 5)
      }
    }

    log('INFO', 'Saving workflow file to disk', { requestId, filePath });

    // Step 5: Save workflow file
    await fileService.writeFile(filePath, content);

    log('INFO', 'Workflow file saved successfully', { requestId });

    // Step 6: Send success response with workflow data
    const successEvent: ImportWorkflowSuccessEvent = {
      type: 'IMPORT_WORKFLOW_SUCCESS',
      payload: {
        workflowId: payload.workflowId,
        filePath,
        workflowName: workflow.name,
        workflow,
      },
    };

    webview.postMessage({
      ...successEvent,
      requestId,
    });

    // Show native notification with workspace name
    vscode.window.showInformationMessage(
      `Workflow "${workflow.name}" imported to ${selectedWorkspace.name}/.vscode/workflows/`
    );

    log('INFO', 'Workflow import completed successfully', {
      requestId,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorInfo = handleSlackError(error);

    // Log detailed error for debugging
    log('ERROR', 'Workflow import failed - detailed error', {
      requestId,
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
      originalError: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      executionTimeMs: Date.now() - startTime,
    });

    sendImportFailed(webview, requestId, payload.workflowId, errorInfo.code, errorInfo.message);
  }
}

/**
 * Send import workflow failed event to Webview
 */
function sendImportFailed(
  webview: vscode.Webview,
  requestId: string,
  workflowId: string,
  errorCode: string,
  errorMessage: string
): void {
  const failedEvent: ImportWorkflowFailedEvent = {
    type: 'IMPORT_WORKFLOW_FAILED',
    payload: {
      workflowId,
      errorCode: errorCode as ImportWorkflowFailedEvent['payload']['errorCode'],
      errorMessage,
    },
  };

  webview.postMessage({
    ...failedEvent,
    requestId,
  });
}
