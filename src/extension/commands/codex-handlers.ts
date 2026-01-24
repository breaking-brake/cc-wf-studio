/**
 * Claude Code Workflow Studio - Codex CLI Integration Handlers
 *
 * Handles Export/Run for OpenAI Codex CLI integration
 *
 * @beta This is a PoC feature for OpenAI Codex CLI integration
 */

import * as vscode from 'vscode';
import type {
  CodexOperationFailedPayload,
  ExportForCodexCliPayload,
  ExportForCodexCliSuccessPayload,
  RunForCodexCliPayload,
  RunForCodexCliSuccessPayload,
} from '../../shared/types/messages';
import {
  ensureProjectTrustedForCodexCli,
  needsProjectTrustForCodexCli,
  previewMcpSyncForCodexCli,
  syncMcpConfigForCodexCli,
} from '../services/codex-mcp-sync-service';
import {
  checkExistingCodexSkill,
  exportWorkflowAsCodexSkill,
} from '../services/codex-skill-export-service';
import { extractMcpServerIdsFromWorkflow } from '../services/copilot-export-service';
import type { FileService } from '../services/file-service';
import {
  hasNonStandardSkills,
  promptAndNormalizeSkills,
} from '../services/skill-normalization-service';
import { executeCodexCliInTerminal } from '../services/terminal-execution-service';

/**
 * Handle Export for Codex CLI request
 *
 * Exports workflow to Skills format (.codex/skills/name/SKILL.md)
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Export payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleExportForCodexCli(
  fileService: FileService,
  webview: vscode.Webview,
  payload: ExportForCodexCliPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingCodexSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'EXPORT_FOR_CODEX_CLI_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Export workflow as skill to .codex/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsCodexSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: CodexOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXPORT_FOR_CODEX_CLI_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Send success response
    const successPayload: ExportForCodexCliSuccessPayload = {
      skillName: exportResult.skillName,
      skillPath: exportResult.skillPath,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_FOR_CODEX_CLI_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(
      `Exported workflow as Codex skill: ${exportResult.skillPath}`
    );
  } catch (error) {
    const failedPayload: CodexOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXPORT_FOR_CODEX_CLI_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Run for Codex CLI request
 *
 * Exports workflow to Skills format and runs it via Codex CLI
 * using the $skill-name command format
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Run payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleRunForCodexCli(
  fileService: FileService,
  webview: vscode.Webview,
  payload: RunForCodexCliPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;
    const workspacePath = fileService.getWorkspacePath();

    // Step 0: Ensure project is trusted (workaround for openai/codex#9752)
    // This is required for Codex CLI to recognize project-level skills
    let projectTrustAdded = false;

    // Check if project trust needs to be added
    const needsProjectTrust = await needsProjectTrustForCodexCli(workspacePath);
    if (needsProjectTrust) {
      const result = await vscode.window.showInformationMessage(
        `To allow Codex CLI to recognize skills in this project, a project trust setting needs to be added to ~/.codex/config.toml.\n\nProceed?`,
        { modal: true },
        'Yes',
        'No'
      );
      if (result !== 'Yes') {
        webview.postMessage({
          type: 'RUN_FOR_CODEX_CLI_CANCELLED',
          requestId,
        });
        return;
      }
      projectTrustAdded = await ensureProjectTrustedForCodexCli(workspacePath);
    }

    // Step 0.5: Normalize skills (copy non-.claude/skills/ to .claude/skills/)
    // This ensures skills from .github/skills/, .codex/skills/, etc. are available in .claude/skills/
    if (hasNonStandardSkills(workflow)) {
      const normalizeResult = await promptAndNormalizeSkills(workflow);

      if (!normalizeResult.success) {
        if (normalizeResult.cancelled) {
          webview.postMessage({
            type: 'RUN_FOR_CODEX_CLI_CANCELLED',
            requestId,
          });
          return;
        }
        throw new Error(normalizeResult.error || 'Failed to copy skills to .claude/skills/');
      }

      // Log normalized skills
      if (normalizeResult.normalizedSkills && normalizeResult.normalizedSkills.length > 0) {
        console.log(
          `[Codex CLI] Copied ${normalizeResult.normalizedSkills.length} skill(s) to .claude/skills/`
        );
      }
    }

    // Step 1: Check if MCP servers need to be synced to $HOME/.codex/config.toml
    const mcpServerIds = extractMcpServerIdsFromWorkflow(workflow);
    let mcpSyncConfirmed = false;

    if (mcpServerIds.length > 0) {
      const mcpSyncPreview = await previewMcpSyncForCodexCli(mcpServerIds, workspacePath);

      if (mcpSyncPreview.serversToAdd.length > 0) {
        const serverList = mcpSyncPreview.serversToAdd.map((s) => `  • ${s}`).join('\n');
        const result = await vscode.window.showInformationMessage(
          `The following MCP servers will be added to $HOME/.codex/config.toml for Codex CLI:\n\n${serverList}\n\nProceed?`,
          { modal: true },
          'Yes',
          'No'
        );
        mcpSyncConfirmed = result === 'Yes';
      }
    }

    // Step 2: Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingCodexSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'RUN_FOR_CODEX_CLI_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Step 3: Export workflow as skill to .codex/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsCodexSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: CodexOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_CODEX_CLI_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 4: Sync MCP servers to $HOME/.codex/config.toml if confirmed
    let syncedMcpServers: string[] = [];
    if (mcpSyncConfirmed) {
      syncedMcpServers = await syncMcpConfigForCodexCli(mcpServerIds, workspacePath);
    }

    // Step 5: Execute in terminal
    const terminalResult = executeCodexCliInTerminal({
      skillName: exportResult.skillName,
      workingDirectory: workspacePath,
    });

    // Send success response
    const successPayload: RunForCodexCliSuccessPayload = {
      workflowName: workflow.name,
      terminalName: terminalResult.terminalName,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'RUN_FOR_CODEX_CLI_SUCCESS',
      requestId,
      payload: successPayload,
    });

    // Show notification with config sync info
    const configChanges: string[] = [];
    if (projectTrustAdded) {
      configChanges.push('project trust added');
    }
    if (syncedMcpServers.length > 0) {
      configChanges.push(`MCP servers: ${syncedMcpServers.join(', ')}`);
    }
    const configInfo =
      configChanges.length > 0 ? ` (${configChanges.join('; ')} to ~/.codex/config.toml)` : '';
    vscode.window.showInformationMessage(
      `Running workflow via Codex CLI: ${workflow.name}${configInfo}`
    );
  } catch (error) {
    const failedPayload: CodexOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'RUN_FOR_CODEX_CLI_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}
