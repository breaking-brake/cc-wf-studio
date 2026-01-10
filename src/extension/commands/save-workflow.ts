/**
 * Claude Code Workflow Studio - Save Workflow Command
 *
 * Handles saving workflow definitions to .vscode/workflows/
 * Based on: /specs/001-cc-wf-studio/contracts/extension-webview-api.md
 */

import type { Webview } from 'vscode';
import * as vscode from 'vscode';
import type { SaveSuccessPayload } from '../../shared/types/messages';
import type { Workflow } from '../../shared/types/workflow-definition';
import type { FileService } from '../services/file-service';

/**
 * Save workflow to file
 *
 * @param fileService - File service instance
 * @param webview - Webview to send response to
 * @param workflow - Workflow to save
 * @param requestId - Request ID for response matching
 */
export async function saveWorkflow(
  fileService: FileService,
  webview: Webview,
  workflow: Workflow,
  requestId?: string
): Promise<void> {
  try {
    // Ensure workflows directory exists
    await fileService.ensureWorkflowsDirectory();

    // Validate workflow (basic checks)
    validateWorkflow(workflow);

    // Get file path
    const filePath = fileService.getWorkflowFilePath(workflow.name);

    // Check if file already exists
    if (await fileService.fileExists(filePath)) {
      // Show warning dialog for overwrite confirmation
      const answer = await vscode.window.showWarningMessage(
        `Workflow "${workflow.name}" already exists.\n\nDo you want to overwrite it?`,
        { modal: true },
        'Overwrite'
      );

      if (answer !== 'Overwrite') {
        // User cancelled - send cancellation message (not an error)
        webview.postMessage({
          type: 'SAVE_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Serialize workflow to JSON with 2-space indentation
    const content = JSON.stringify(workflow, null, 2);

    // Write to file
    await fileService.writeFile(filePath, content);

    // Send success message back to webview
    const payload: SaveSuccessPayload = {
      filePath,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'SAVE_SUCCESS',
      requestId,
      payload,
    });

    // Show success notification
    vscode.window.showInformationMessage(`Workflow "${workflow.name}" saved successfully!`);

    console.log(`Workflow saved: ${workflow.name}`);
  } catch (error) {
    // Send error message back to webview
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'SAVE_FAILED',
        message: error instanceof Error ? error.message : 'Failed to save workflow',
        details: error,
      },
    });

    // Show error notification
    vscode.window.showErrorMessage(
      `Failed to save workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Validate workflow before saving
 *
 * @param workflow - Workflow to validate
 * @throws Error if validation fails
 */
function validateWorkflow(workflow: Workflow): void {
  // Check required fields
  if (!workflow.id) {
    throw new Error('Workflow ID is required');
  }

  if (!workflow.name) {
    throw new Error('Workflow name is required');
  }

  // Validate name format (lowercase, numbers, hyphen, underscore only)
  const namePattern = /^[a-z0-9_-]+$/;
  if (!namePattern.test(workflow.name)) {
    throw new Error(
      'Workflow name must contain only lowercase letters, numbers, hyphens, and underscores'
    );
  }

  // Check name length (1-100 characters)
  if (workflow.name.length < 1 || workflow.name.length > 100) {
    throw new Error('Workflow name must be between 1 and 100 characters');
  }

  // Validate version format (semantic versioning)
  const versionPattern = /^\d+\.\d+\.\d+$/;
  if (!workflow.version || !versionPattern.test(workflow.version)) {
    throw new Error('Workflow version must follow semantic versioning (e.g., 1.0.0)');
  }

  // Check max nodes (50)
  if (workflow.nodes.length > 50) {
    throw new Error('Workflow cannot have more than 50 nodes');
  }
}
