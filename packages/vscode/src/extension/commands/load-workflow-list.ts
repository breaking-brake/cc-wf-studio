/**
 * Claude Code Workflow Studio - Load Workflow List Command
 *
 * Loads list of available workflows from .vscode/workflows/ directory
 */

import type { Webview } from 'vscode';
import * as vscode from 'vscode';
import type { WorkflowListPayload } from '../../shared/types/messages';
import type { FileService } from '../services/file-service';

/**
 * Load workflow list and send to webview
 *
 * @param fileService - File service instance
 * @param webview - Webview to send response to
 * @param requestId - Request ID for response matching
 */
export async function loadWorkflowList(
  fileService: FileService,
  webview: Webview,
  requestId?: string
): Promise<void> {
  try {
    // Ensure workflows directory exists
    await fileService.ensureWorkflowsDirectory();

    // Read all workflow files
    const workflowsPath = fileService.getWorkflowsDirectory();
    const uri = vscode.Uri.file(workflowsPath);

    let files: [string, vscode.FileType][] = [];
    try {
      files = await vscode.workspace.fs.readDirectory(uri);
    } catch (error) {
      // Directory doesn't exist or is empty
      console.log('No workflows directory or empty:', error);
      files = [];
    }

    // Filter JSON files and load metadata
    const workflows = [];
    for (const [filename, fileType] of files) {
      if (fileType === vscode.FileType.File && filename.endsWith('.json')) {
        try {
          const filePath = fileService.getWorkflowFilePath(filename.replace('.json', ''));
          const content = await fileService.readFile(filePath);
          const workflow = JSON.parse(content);

          workflows.push({
            id: filename.replace('.json', ''), // Always use filename as ID
            name: workflow.name || filename.replace('.json', ''),
            description: workflow.description,
            updatedAt: workflow.updatedAt || new Date().toISOString(),
          });
        } catch (error) {
          console.error(`Failed to parse workflow file ${filename}:`, error);
        }
      }
    }

    // Send success response
    const payload: WorkflowListPayload = { workflows };
    webview.postMessage({
      type: 'WORKFLOW_LIST_LOADED',
      requestId,
      payload,
    });
  } catch (error) {
    // Send error response
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'LOAD_FAILED',
        message: error instanceof Error ? error.message : 'Failed to load workflow list',
        details: error,
      },
    });
  }
}
