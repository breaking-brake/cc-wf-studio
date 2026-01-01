/**
 * Claude Code Workflow Studio - Export Workflow Command
 *
 * Exports workflow to .claude format (agents/*.md and commands/*.md)
 */

import * as path from 'node:path';
import type { Webview } from 'vscode';
import * as vscode from 'vscode';
import type {
  ExportSuccessPayload,
  ExportWorkflowPayload,
  Workflow,
} from '../../shared/types/messages';
import {
  checkExistingFiles,
  exportWorkflow,
  validateClaudeFileFormat,
} from '../services/export-service';
import type { FileService } from '../services/file-service';
import { validateAIGeneratedWorkflow } from '../utils/validate-workflow';

/**
 * Export workflow to .claude format
 *
 * @param fileService - File service instance
 * @param webview - Webview to send response to
 * @param payload - Export workflow payload
 * @param requestId - Request ID for response matching
 */
export async function handleExportWorkflow(
  fileService: FileService,
  webview: Webview,
  payload: ExportWorkflowPayload,
  requestId?: string
): Promise<void> {
  try {
    // Validate workflow structure before export
    const validationResult = validateAIGeneratedWorkflow(payload.workflow);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map((err) => err.message).join('\n');
      throw new Error(`Workflow validation failed:\n${errorMessages}`);
    }

    // Check if files already exist (unless overwrite is confirmed)
    if (!payload.overwriteExisting) {
      const existingFiles = await checkExistingFiles(payload.workflow, fileService);

      if (existingFiles.length > 0) {
        // Show warning dialog for overwrite confirmation
        const fileList = existingFiles.map((f) => `  - ${f}`).join('\n');
        const answer = await vscode.window.showWarningMessage(
          `The following files already exist:\n${fileList}\n\nDo you want to overwrite them?`,
          { modal: true },
          'Overwrite'
        );

        if (answer !== 'Overwrite') {
          // User cancelled - send cancellation message (not an error)
          webview.postMessage({
            type: 'EXPORT_CANCELLED',
            requestId,
          });
          return;
        }
      }
    }

    // Export workflow
    const exportedFiles = await exportWorkflow(payload.workflow, fileService);

    // Validate exported files
    const validationErrors: string[] = [];
    for (const filePath of exportedFiles) {
      try {
        const content = await fileService.readFile(filePath);
        const fileType = /[/\\]agents[/\\]/.test(filePath) ? 'subAgent' : 'slashCommand';
        validateClaudeFileFormat(content, fileType);
      } catch (error) {
        const fileName = path.basename(filePath);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        validationErrors.push(`${fileName}: ${errorMessage}`);
      }
    }

    // If validation errors occurred, report them
    if (validationErrors.length > 0) {
      throw new Error(`Exported files have validation errors:\n${validationErrors.join('\n')}`);
    }

    // Send success response
    const successPayload: ExportSuccessPayload = {
      exportedFiles,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_SUCCESS',
      requestId,
      payload: successPayload,
    });

    // Show success notification
    vscode.window.showInformationMessage(
      `Workflow "${payload.workflow.name}" exported successfully! ${exportedFiles.length} files created and validated.`
    );
  } catch (error) {
    // Send error response
    webview.postMessage({
      type: 'ERROR',
      requestId,
      payload: {
        code: 'EXPORT_FAILED',
        message: error instanceof Error ? error.message : 'Failed to export workflow',
        details: error,
      },
    });

    // Show error notification
    vscode.window.showErrorMessage(
      `Failed to export workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Result of export for execution
 */
export interface ExportForExecutionResult {
  success: boolean;
  cancelled?: boolean;
  exportedFiles?: string[];
  error?: string;
}

/**
 * Export workflow for terminal execution (without UI notifications)
 *
 * This function exports the workflow to .claude format for use with
 * the "Execute as Slash Command" feature. Unlike handleExportWorkflow,
 * it does not show UI notifications and returns the result directly.
 *
 * @param workflow - Workflow to export
 * @param fileService - File service instance
 * @returns Export result with success status and exported files
 */
export async function handleExportWorkflowForExecution(
  workflow: Workflow,
  fileService: FileService
): Promise<ExportForExecutionResult> {
  try {
    // Validate workflow structure before export
    const validationResult = validateAIGeneratedWorkflow(workflow);
    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map((err) => err.message).join('\n');
      return {
        success: false,
        error: `Workflow validation failed:\n${errorMessages}`,
      };
    }

    // Check if files already exist
    const existingFiles = await checkExistingFiles(workflow, fileService);

    if (existingFiles.length > 0) {
      // Show warning dialog for overwrite confirmation
      const fileList = existingFiles.map((f) => `  - ${f}`).join('\n');
      const answer = await vscode.window.showWarningMessage(
        `The following files already exist:\n${fileList}\n\nDo you want to overwrite them?`,
        { modal: true },
        'Overwrite'
      );

      if (answer !== 'Overwrite') {
        // User cancelled
        return {
          success: false,
          cancelled: true,
        };
      }
    }

    // Export workflow
    const exportedFiles = await exportWorkflow(workflow, fileService);

    // Validate exported files
    const validationErrors: string[] = [];
    for (const filePath of exportedFiles) {
      try {
        const content = await fileService.readFile(filePath);
        const fileType = /[/\\]agents[/\\]/.test(filePath) ? 'subAgent' : 'slashCommand';
        validateClaudeFileFormat(content, fileType);
      } catch (error) {
        const fileName = path.basename(filePath);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        validationErrors.push(`${fileName}: ${errorMessage}`);
      }
    }

    // If validation errors occurred, report them
    if (validationErrors.length > 0) {
      return {
        success: false,
        error: `Exported files have validation errors:\n${validationErrors.join('\n')}`,
      };
    }

    return {
      success: true,
      exportedFiles,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to export workflow',
    };
  }
}
