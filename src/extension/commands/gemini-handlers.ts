/**
 * Claude Code Workflow Studio - Gemini CLI Integration Handlers
 *
 * Handles Export/Run for Google Gemini CLI integration
 *
 * @beta This is a PoC feature for Google Gemini CLI integration
 */

import * as vscode from 'vscode';
import type {
  ExportForGeminiCliPayload,
  ExportForGeminiCliSuccessPayload,
  GeminiOperationFailedPayload,
  RunForGeminiCliPayload,
  RunForGeminiCliSuccessPayload,
} from '../../shared/types/messages';
import { extractMcpServerIdsFromWorkflow } from '../services/copilot-export-service';
import type { FileService } from '../services/file-service';
import {
  previewMcpSyncForGeminiCli,
  syncMcpConfigForGeminiCli,
} from '../services/gemini-mcp-sync-service';
import {
  checkExistingGeminiSkill,
  exportWorkflowAsGeminiSkill,
} from '../services/gemini-skill-export-service';
import {
  hasNonStandardSkills,
  promptAndNormalizeSkills,
} from '../services/skill-normalization-service';
import { executeGeminiCliInTerminal } from '../services/terminal-execution-service';

/**
 * Handle Export for Gemini CLI request
 *
 * Exports workflow to Skills format (.gemini/skills/name/SKILL.md)
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Export payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleExportForGeminiCli(
  fileService: FileService,
  webview: vscode.Webview,
  payload: ExportForGeminiCliPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingGeminiSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'EXPORT_FOR_GEMINI_CLI_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Export workflow as skill to .gemini/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsGeminiSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: GeminiOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXPORT_FOR_GEMINI_CLI_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Send success response
    const successPayload: ExportForGeminiCliSuccessPayload = {
      skillName: exportResult.skillName,
      skillPath: exportResult.skillPath,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_FOR_GEMINI_CLI_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(
      `Exported workflow as Gemini skill: ${exportResult.skillPath}`
    );
  } catch (error) {
    const failedPayload: GeminiOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXPORT_FOR_GEMINI_CLI_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Run for Gemini CLI request
 *
 * Exports workflow to Skills format and runs it via Gemini CLI
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Run payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleRunForGeminiCli(
  fileService: FileService,
  webview: vscode.Webview,
  payload: RunForGeminiCliPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;
    const workspacePath = fileService.getWorkspacePath();

    // Step 0.5: Normalize skills (copy non-standard skills to .claude/skills/)
    // For Gemini CLI, .gemini/skills/ is considered "native" (no copy needed)
    if (hasNonStandardSkills(workflow, 'gemini')) {
      const normalizeResult = await promptAndNormalizeSkills(workflow, 'gemini');

      if (!normalizeResult.success) {
        if (normalizeResult.cancelled) {
          webview.postMessage({
            type: 'RUN_FOR_GEMINI_CLI_CANCELLED',
            requestId,
          });
          return;
        }
        throw new Error(normalizeResult.error || 'Failed to copy skills to .claude/skills/');
      }

      // Log normalized skills
      if (normalizeResult.normalizedSkills && normalizeResult.normalizedSkills.length > 0) {
        console.log(
          `[Gemini CLI] Copied ${normalizeResult.normalizedSkills.length} skill(s) to .claude/skills/`
        );
      }
    }

    // Step 1: Check if MCP servers need to be synced to ~/.gemini/settings.json
    const mcpServerIds = extractMcpServerIdsFromWorkflow(workflow);
    let mcpSyncConfirmed = false;

    if (mcpServerIds.length > 0) {
      const mcpSyncPreview = await previewMcpSyncForGeminiCli(mcpServerIds, workspacePath);

      if (mcpSyncPreview.serversToAdd.length > 0) {
        const serverList = mcpSyncPreview.serversToAdd.map((s) => `  • ${s}`).join('\n');
        const result = await vscode.window.showInformationMessage(
          `The following MCP servers will be added to ~/.gemini/settings.json for Gemini CLI:\n\n${serverList}\n\nProceed?`,
          { modal: true },
          'Yes',
          'No'
        );
        mcpSyncConfirmed = result === 'Yes';
      }
    }

    // Step 2: Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingGeminiSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'RUN_FOR_GEMINI_CLI_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Step 3: Export workflow as skill to .gemini/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsGeminiSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: GeminiOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_GEMINI_CLI_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 4: Sync MCP servers to ~/.gemini/settings.json if confirmed
    let syncedMcpServers: string[] = [];
    if (mcpSyncConfirmed) {
      syncedMcpServers = await syncMcpConfigForGeminiCli(mcpServerIds, workspacePath);
    }

    // Step 5: Execute in terminal
    const terminalResult = executeGeminiCliInTerminal({
      skillName: exportResult.skillName,
      workingDirectory: workspacePath,
    });

    // Send success response
    const successPayload: RunForGeminiCliSuccessPayload = {
      workflowName: workflow.name,
      terminalName: terminalResult.terminalName,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'RUN_FOR_GEMINI_CLI_SUCCESS',
      requestId,
      payload: successPayload,
    });

    // Show notification with config sync info
    const configInfo =
      syncedMcpServers.length > 0
        ? ` (MCP servers: ${syncedMcpServers.join(', ')} added to ~/.gemini/settings.json)`
        : '';
    vscode.window.showInformationMessage(
      `Running workflow via Gemini CLI: ${workflow.name}${configInfo}`
    );
  } catch (error) {
    const failedPayload: GeminiOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'RUN_FOR_GEMINI_CLI_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}
