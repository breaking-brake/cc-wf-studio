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
  ExportForCopilotCliPayload,
  ExportForCopilotCliSuccessPayload,
  ExportForCopilotPayload,
  ExportForCopilotSuccessPayload,
  RunForCopilotCliPayload,
  RunForCopilotCliSuccessPayload,
  RunForCopilotPayload,
  RunForCopilotSuccessPayload,
} from '../../shared/types/messages';
import {
  previewMcpSyncForCopilotCli,
  syncMcpConfigForCopilotCli,
} from '../services/copilot-cli-mcp-sync-service';
import {
  type CopilotExportOptions,
  checkExistingCopilotFiles,
  executeMcpSyncForCopilot,
  exportWorkflowForCopilot,
  extractMcpServerIdsFromWorkflow,
  previewMcpSyncForCopilot,
} from '../services/copilot-export-service';
import {
  checkExistingSkill,
  exportWorkflowAsSkill,
} from '../services/copilot-skill-export-service';
import { nodeNameToFileName } from '../services/export-service';
import type { FileService } from '../services/file-service';
import {
  hasNonStandardSkills,
  promptAndNormalizeSkills,
} from '../services/skill-normalization-service';
import { executeCopilotCliInTerminal } from '../services/terminal-execution-service';

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
          type: 'RUN_FOR_COPILOT_CANCELLED',
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
      // Step 1: Create a new chat session
      await vscode.commands.executeCommand('workbench.action.chat.newChat');
      // Step 2: Send the query to the new session
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

/**
 * Handle Run for Copilot CLI request
 *
 * Exports workflow to Copilot format and runs it via Copilot CLI
 * using the :task command
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Run payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleRunForCopilotCli(
  fileService: FileService,
  webview: vscode.Webview,
  payload: RunForCopilotCliPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;
    const workspacePath = fileService.getWorkspacePath();

    // Step 0.5: Normalize skills (copy non-.claude/skills/ to .claude/skills/)
    // This ensures skills from .github/skills/, .codex/skills/, etc. are available in .claude/skills/
    if (hasNonStandardSkills(workflow)) {
      const normalizeResult = await promptAndNormalizeSkills(workflow);

      if (!normalizeResult.success) {
        if (normalizeResult.cancelled) {
          webview.postMessage({
            type: 'RUN_FOR_COPILOT_CLI_CANCELLED',
            requestId,
          });
          return;
        }
        throw new Error(normalizeResult.error || 'Failed to copy skills to .claude/skills/');
      }

      // Log normalized skills
      if (normalizeResult.normalizedSkills && normalizeResult.normalizedSkills.length > 0) {
        console.log(
          `[Copilot CLI] Copied ${normalizeResult.normalizedSkills.length} skill(s) to .claude/skills/`
        );
      }
    }

    // Step 1: Check if MCP servers need to be synced to $HOME/.copilot/mcp-config.json
    const mcpServerIds = extractMcpServerIdsFromWorkflow(workflow);
    let mcpSyncConfirmed = false;

    if (mcpServerIds.length > 0) {
      const mcpSyncPreview = await previewMcpSyncForCopilotCli(mcpServerIds, workspacePath);

      if (mcpSyncPreview.serversToAdd.length > 0) {
        const serverList = mcpSyncPreview.serversToAdd.map((s) => `  • ${s}`).join('\n');
        const result = await vscode.window.showInformationMessage(
          `The following MCP servers will be added to $HOME/.copilot/mcp-config.json for Copilot CLI:\n\n${serverList}\n\nProceed?`,
          { modal: true },
          'Yes',
          'No'
        );
        mcpSyncConfirmed = result === 'Yes';
      }
    }

    // Step 2: Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'RUN_FOR_COPILOT_CLI_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Step 3: Export workflow as skill to .github/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: CopilotOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_COPILOT_CLI_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 4: Sync MCP servers to $HOME/.copilot/mcp-config.json if confirmed
    let syncedMcpServers: string[] = [];
    if (mcpSyncConfirmed) {
      syncedMcpServers = await syncMcpConfigForCopilotCli(mcpServerIds, workspacePath);
    }

    // Step 5: Execute in terminal
    const terminalResult = executeCopilotCliInTerminal({
      skillName: exportResult.skillName,
      workingDirectory: workspacePath,
    });

    // Send success response
    const successPayload: RunForCopilotCliSuccessPayload = {
      workflowName: workflow.name,
      terminalName: terminalResult.terminalName,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'RUN_FOR_COPILOT_CLI_SUCCESS',
      requestId,
      payload: successPayload,
    });

    // Show notification with MCP sync info
    const syncInfo =
      syncedMcpServers.length > 0
        ? ` (MCP servers synced to ~/.copilot/mcp-config.json: ${syncedMcpServers.join(', ')})`
        : '';
    vscode.window.showInformationMessage(
      `Running workflow via Copilot CLI: ${workflow.name}${syncInfo}`
    );
  } catch (error) {
    const failedPayload: CopilotOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'RUN_FOR_COPILOT_CLI_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Export for Copilot CLI request
 *
 * Exports workflow to Skills format (.github/skills/name/SKILL.md)
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Export payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleExportForCopilotCli(
  fileService: FileService,
  webview: vscode.Webview,
  payload: ExportForCopilotCliPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'EXPORT_FOR_COPILOT_CLI_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Export workflow as skill to .github/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: CopilotOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXPORT_FOR_COPILOT_CLI_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Send success response
    const successPayload: ExportForCopilotCliSuccessPayload = {
      skillName: exportResult.skillName,
      skillPath: exportResult.skillPath,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_FOR_COPILOT_CLI_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(`Exported workflow as skill: ${exportResult.skillPath}`);
  } catch (error) {
    const failedPayload: CopilotOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXPORT_FOR_COPILOT_CLI_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}
