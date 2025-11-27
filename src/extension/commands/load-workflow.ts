/**
 * Claude Code Workflow Studio - Load Workflow Command
 *
 * Loads a specific workflow file and sends it to the Webview
 */

import type { Webview } from 'vscode';
import type { LoadWorkflowPayload } from '../../shared/types/messages';
import type { FileService } from '../services/file-service';
import { migrateWorkflow } from '../utils/migrate-workflow';

/**
 * Load a specific workflow and send to webview
 *
 * @param fileService - File service instance
 * @param webview - Webview to send response to
 * @param workflowId - Workflow ID (filename without .json extension)
 * @param requestId - Request ID for response matching
 */
export async function loadWorkflow(
  fileService: FileService,
  webview: Webview,
  workflowId: string,
  requestId?: string
): Promise<void> {
  try {
    // Get workflow file path
    const filePath = fileService.getWorkflowFilePath(workflowId);

    // Check if file exists
    const exists = await fileService.fileExists(filePath);
    if (!exists) {
      webview.postMessage({
        type: 'ERROR',
        requestId,
        payload: {
          code: 'LOAD_FAILED',
          message: `Workflow "${workflowId}" not found`,
        },
      });
      return;
    }

    // Read and parse workflow file
    const content = await fileService.readFile(filePath);
    const parsedWorkflow = JSON.parse(content);

    // Apply migrations for backward compatibility
    const workflow = migrateWorkflow(parsedWorkflow);

    // Send success response
    const payload: LoadWorkflowPayload = { workflow };
    webview.postMessage({
      type: 'LOAD_WORKFLOW',
      requestId,
      payload,
    });

    console.log(`Workflow loaded: ${workflowId}`);
  } catch (error) {
    // Send error response
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to load workflow',
        details: error,
      },
    });
  }
}
