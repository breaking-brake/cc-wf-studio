/**
 * Claude Code Workflow Studio - Roo Code Integration Handlers
 *
 * Handles Export/Run for Roo Code integration
 *
 * @beta This is a PoC feature for Roo Code integration
 */

import * as vscode from 'vscode';
import type {
  ExportForRooCodePayload,
  ExportForRooCodeSuccessPayload,
  RooCodeOperationFailedPayload,
  RunForRooCodePayload,
  RunForRooCodeSuccessPayload,
} from '../../shared/types/messages';
import { extractMcpServerIdsFromWorkflow } from '../services/copilot-export-service';
import { nodeNameToFileName } from '../services/export-service';
import type { FileService } from '../services/file-service';
import { isRooCodeInstalled, startRooCodeTask } from '../services/roo-code-extension-service';
import {
  previewMcpSyncForRooCode,
  syncMcpConfigForRooCode,
} from '../services/roo-code-mcp-sync-service';
import {
  checkExistingRooCodeSkill,
  exportWorkflowAsRooCodeSkill,
} from '../services/roo-code-skill-export-service';
import {
  hasNonStandardSkills,
  promptAndNormalizeSkills,
} from '../services/skill-normalization-service';

/**
 * Handle Export for Roo Code request
 *
 * Exports workflow to Skills format (.roo/skills/name/SKILL.md)
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Export payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleExportForRooCode(
  fileService: FileService,
  webview: vscode.Webview,
  payload: ExportForRooCodePayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingRooCodeSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'EXPORT_FOR_ROO_CODE_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Export workflow as skill to .roo/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsRooCodeSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: RooCodeOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXPORT_FOR_ROO_CODE_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Send success response
    const successPayload: ExportForRooCodeSuccessPayload = {
      skillName: exportResult.skillName,
      skillPath: exportResult.skillPath,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_FOR_ROO_CODE_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(
      `Exported workflow as Roo Code skill: ${exportResult.skillPath}`
    );
  } catch (error) {
    const failedPayload: RooCodeOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXPORT_FOR_ROO_CODE_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Run for Roo Code request
 *
 * Exports workflow to Skills format, syncs MCP config,
 * and starts Roo Code with :skill command via Extension API
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Run payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleRunForRooCode(
  fileService: FileService,
  webview: vscode.Webview,
  payload: RunForRooCodePayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;
    const workspacePath = fileService.getWorkspacePath();

    // Step 0.5: Normalize skills (copy non-standard skills to .claude/skills/)
    if (hasNonStandardSkills(workflow, 'roo-code')) {
      const normalizeResult = await promptAndNormalizeSkills(workflow, 'roo-code');

      if (!normalizeResult.success) {
        if (normalizeResult.cancelled) {
          webview.postMessage({
            type: 'RUN_FOR_ROO_CODE_CANCELLED',
            requestId,
          });
          return;
        }
        throw new Error(normalizeResult.error || 'Failed to copy skills to .claude/skills/');
      }

      if (normalizeResult.normalizedSkills && normalizeResult.normalizedSkills.length > 0) {
        console.log(
          `[Roo Code] Copied ${normalizeResult.normalizedSkills.length} skill(s) to .claude/skills/`
        );
      }
    }

    // Step 1: Check if MCP servers need to be synced to .roo/mcp.json
    const mcpServerIds = extractMcpServerIdsFromWorkflow(workflow);
    let mcpSyncConfirmed = false;

    if (mcpServerIds.length > 0) {
      const mcpSyncPreview = await previewMcpSyncForRooCode(mcpServerIds, workspacePath);

      if (mcpSyncPreview.serversToAdd.length > 0) {
        const serverList = mcpSyncPreview.serversToAdd.map((s) => `  • ${s}`).join('\n');
        const result = await vscode.window.showInformationMessage(
          `The following MCP servers will be added to .roo/mcp.json for Roo Code:\n\n${serverList}\n\nProceed?`,
          { modal: true },
          'Yes',
          'No'
        );
        mcpSyncConfirmed = result === 'Yes';
      }
    }

    // Step 2: Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingRooCodeSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'RUN_FOR_ROO_CODE_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Step 3: Export workflow as skill to .roo/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsRooCodeSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: RooCodeOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_ROO_CODE_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 4: Sync MCP servers to .roo/mcp.json if confirmed
    let syncedMcpServers: string[] = [];
    if (mcpSyncConfirmed) {
      syncedMcpServers = await syncMcpConfigForRooCode(mcpServerIds, workspacePath);
    }

    // Step 5: Start Roo Code with :skill command via Extension API
    const skillName = nodeNameToFileName(workflow.name);
    let rooCodeOpened = false;

    if (isRooCodeInstalled()) {
      rooCodeOpened = await startRooCodeTask(`:skill ${skillName}`);
    }

    // Send success response
    const successPayload: RunForRooCodeSuccessPayload = {
      workflowName: workflow.name,
      rooCodeOpened,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'RUN_FOR_ROO_CODE_SUCCESS',
      requestId,
      payload: successPayload,
    });

    // Show notification
    const configInfo =
      syncedMcpServers.length > 0
        ? ` (MCP servers: ${syncedMcpServers.join(', ')} added to .roo/mcp.json)`
        : '';
    const rooCodeInfo = rooCodeOpened
      ? ''
      : ' (Roo Code extension not found - skill exported only)';
    vscode.window.showInformationMessage(
      `Running workflow via Roo Code: ${workflow.name}${configInfo}${rooCodeInfo}`
    );
  } catch (error) {
    const failedPayload: RooCodeOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'RUN_FOR_ROO_CODE_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}
