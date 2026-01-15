/**
 * Claude Code Workflow Studio - Copilot Integration Handlers
 *
 * Handles Export/Run for GitHub Copilot integration
 *
 * @beta This is a PoC feature for GitHub Copilot integration
 */

import * as vscode from 'vscode';
import type {
  CopilotOperationFailedPayload,
  ExportForCopilotPayload,
  ExportForCopilotSuccessPayload,
  RunForCopilotPayload,
  RunForCopilotSuccessPayload,
} from '../../shared/types/messages';
import {
  type CopilotExportOptions,
  checkExistingCopilotFiles,
  executeMcpSyncForCopilot,
  exportWorkflowForCopilot,
  previewMcpSyncForCopilot,
} from '../services/copilot-export-service';
import { nodeNameToFileName } from '../services/export-service';
import type { FileService } from '../services/file-service';

/**
 * Handle Export for Copilot request
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Export payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleExportForCopilot(
  fileService: FileService,
  webview: vscode.Webview,
  payload: ExportForCopilotPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check for existing files and ask for confirmation
    const existingFiles = await checkExistingCopilotFiles(workflow, fileService);

    if (existingFiles.length > 0) {
      const result = await vscode.window.showWarningMessage(
        `The following files already exist:\n${existingFiles.join('\n')}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );

      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'EXPORT_FOR_COPILOT_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Check if MCP servers need to be synced
    const mcpSyncPreview = await previewMcpSyncForCopilot(workflow, fileService);
    let mcpSyncConfirmed = false;

    if (mcpSyncPreview.serversToAdd.length > 0) {
      const serverList = mcpSyncPreview.serversToAdd.map((s) => `  • ${s}`).join('\n');
      const result = await vscode.window.showInformationMessage(
        `The following MCP servers will be added to .vscode/mcp.json for GitHub Copilot:\n\n${serverList}\n\nProceed?`,
        { modal: true },
        'Yes',
        'No'
      );
      mcpSyncConfirmed = result === 'Yes';
    }

    // Export to Copilot format (skip MCP sync here, we'll do it separately if confirmed)
    const copilotOptions: CopilotExportOptions = {
      destination: 'copilot',
      agent: 'agent',
      skipMcpSync: true,
    };

    const copilotResult = await exportWorkflowForCopilot(workflow, fileService, copilotOptions);

    if (!copilotResult.success) {
      const failedPayload: CopilotOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: copilotResult.errors?.join(', ') || 'Unknown error',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXPORT_FOR_COPILOT_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Execute MCP sync if user confirmed
    let syncedMcpServers: string[] = [];
    if (mcpSyncConfirmed) {
      syncedMcpServers = await executeMcpSyncForCopilot(workflow, fileService);
    }

    // Send success response
    const successPayload: ExportForCopilotSuccessPayload = {
      exportedFiles: copilotResult.exportedFiles,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_FOR_COPILOT_SUCCESS',
      requestId,
      payload: successPayload,
    });

    // Show notification with MCP sync info
    const syncInfo =
      syncedMcpServers.length > 0 ? ` (MCP servers synced: ${syncedMcpServers.join(', ')})` : '';
    vscode.window.showInformationMessage(
      `Exported workflow for Copilot (${copilotResult.exportedFiles.length} files)${syncInfo}`
    );
  } catch (error) {
    const failedPayload: CopilotOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXPORT_FOR_COPILOT_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Run for Copilot request
 *
 * Exports workflow to Copilot format and opens Copilot Chat with the prompt
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Run payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleRunForCopilot(
  fileService: FileService,
  webview: vscode.Webview,
  payload: RunForCopilotPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check if MCP servers need to be synced
    const mcpSyncPreview = await previewMcpSyncForCopilot(workflow, fileService);
    let mcpSyncConfirmed = false;

    if (mcpSyncPreview.serversToAdd.length > 0) {
      const serverList = mcpSyncPreview.serversToAdd.map((s) => `  • ${s}`).join('\n');
      const result = await vscode.window.showInformationMessage(
        `The following MCP servers will be added to .vscode/mcp.json for GitHub Copilot:\n\n${serverList}\n\nProceed?`,
        { modal: true },
        'Yes',
        'No'
      );
      mcpSyncConfirmed = result === 'Yes';
    }

    // First, export the workflow to Copilot format (skip MCP sync, we'll do it separately)
    const copilotOptions: CopilotExportOptions = {
      destination: 'copilot',
      agent: 'agent',
      skipMcpSync: true,
    };

    const exportResult = await exportWorkflowForCopilot(workflow, fileService, copilotOptions);

    if (!exportResult.success) {
      const failedPayload: CopilotOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_COPILOT_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Execute MCP sync if user confirmed
    if (mcpSyncConfirmed) {
      await executeMcpSyncForCopilot(workflow, fileService);
    }

    // Try to open Copilot Chat with the prompt
    const workflowName = nodeNameToFileName(workflow.name);
    let copilotChatOpened = false;

    try {
      // Use workbench.action.chat.open to open Copilot Chat
      await vscode.commands.executeCommand('workbench.action.chat.open', {
        query: `/${workflowName}`,
        isPartialQuery: false, // Auto-send
      });
      copilotChatOpened = true;
    } catch (chatError) {
      // Copilot Chat might not be installed or command failed
      // We still exported the file, so it's a partial success
      console.warn('Failed to open Copilot Chat:', chatError);

      // Try alternative approach: just open the chat panel
      try {
        await vscode.commands.executeCommand('workbench.action.chat.open');
        copilotChatOpened = true;
        // Show message that user needs to type the command manually
        vscode.window.showInformationMessage(
          `Workflow exported. Type "/${workflowName}" in Copilot Chat to run.`
        );
      } catch {
        // Copilot is likely not installed
        const failedPayload: CopilotOperationFailedPayload = {
          errorCode: 'COPILOT_NOT_INSTALLED',
          errorMessage:
            'GitHub Copilot Chat is not installed or not available. The workflow was exported but could not be run.',
          timestamp: new Date().toISOString(),
        };
        webview.postMessage({
          type: 'RUN_FOR_COPILOT_FAILED',
          requestId,
          payload: failedPayload,
        });
        return;
      }
    }

    // Send success response
    const successPayload: RunForCopilotSuccessPayload = {
      workflowName: workflow.name,
      copilotChatOpened,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'RUN_FOR_COPILOT_SUCCESS',
      requestId,
      payload: successPayload,
    });
  } catch (error) {
    const failedPayload: CopilotOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'RUN_FOR_COPILOT_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}
