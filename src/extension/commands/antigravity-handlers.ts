/**
 * Claude Code Workflow Studio - Antigravity Integration Handlers
 *
 * Handles Export/Run for Google Antigravity (Cascade) integration
 */

import * as vscode from 'vscode';
import type {
  AntigravityOperationFailedPayload,
  ExportForAntigravityPayload,
  ExportForAntigravitySuccessPayload,
  RunForAntigravityPayload,
  RunForAntigravitySuccessPayload,
} from '../../shared/types/messages';
import {
  isAntigravityInstalled,
  startAntigravityTask,
} from '../services/antigravity-extension-service';
import {
  checkExistingAntigravitySkill,
  exportWorkflowAsAntigravitySkill,
} from '../services/antigravity-skill-export-service';
import type { FileService } from '../services/file-service';
import {
  hasNonStandardSkills,
  promptAndNormalizeSkills,
} from '../services/skill-normalization-service';

/**
 * Handle Export for Antigravity request
 *
 * Exports workflow to Skills format (.agent/skills/name/SKILL.md)
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Export payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleExportForAntigravity(
  fileService: FileService,
  webview: vscode.Webview,
  payload: ExportForAntigravityPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingAntigravitySkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'EXPORT_FOR_ANTIGRAVITY_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Export workflow as skill to .agent/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsAntigravitySkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: AntigravityOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXPORT_FOR_ANTIGRAVITY_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Send success response
    const successPayload: ExportForAntigravitySuccessPayload = {
      skillName: exportResult.skillName,
      skillPath: exportResult.skillPath,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_FOR_ANTIGRAVITY_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(
      `Exported workflow as Antigravity skill: ${exportResult.skillPath}`
    );
  } catch (error) {
    const failedPayload: AntigravityOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXPORT_FOR_ANTIGRAVITY_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Run for Antigravity request
 *
 * Exports workflow to Skills format and runs it via Antigravity (Cascade)
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Run payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleRunForAntigravity(
  fileService: FileService,
  webview: vscode.Webview,
  payload: RunForAntigravityPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Step 0.5: Normalize skills (copy non-standard skills to .claude/skills/)
    // For Antigravity, .agent/skills/ is the native directory
    if (hasNonStandardSkills(workflow, 'antigravity')) {
      const normalizeResult = await promptAndNormalizeSkills(workflow, 'antigravity');

      if (!normalizeResult.success) {
        if (normalizeResult.cancelled) {
          webview.postMessage({
            type: 'RUN_FOR_ANTIGRAVITY_CANCELLED',
            requestId,
          });
          return;
        }
        throw new Error(normalizeResult.error || 'Failed to copy skills to .claude/skills/');
      }

      // Log normalized skills
      if (normalizeResult.normalizedSkills && normalizeResult.normalizedSkills.length > 0) {
        console.log(
          `[Antigravity] Copied ${normalizeResult.normalizedSkills.length} skill(s) to .claude/skills/`
        );
      }
    }

    // Step 1: Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingAntigravitySkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'RUN_FOR_ANTIGRAVITY_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Step 2: Export workflow as skill to .claude/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsAntigravitySkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: AntigravityOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_ANTIGRAVITY_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 3: Check if Antigravity is installed
    if (!isAntigravityInstalled()) {
      const failedPayload: AntigravityOperationFailedPayload = {
        errorCode: 'ANTIGRAVITY_NOT_INSTALLED',
        errorMessage: 'Antigravity extension is not installed.',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_ANTIGRAVITY_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 4: Launch Cascade with the skill
    await startAntigravityTask(exportResult.skillName);

    // Send success response
    const successPayload: RunForAntigravitySuccessPayload = {
      workflowName: workflow.name,
      antigravityOpened: true,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'RUN_FOR_ANTIGRAVITY_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(
      `Running workflow via Antigravity (Cascade): ${workflow.name}`
    );
  } catch (error) {
    const failedPayload: AntigravityOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'RUN_FOR_ANTIGRAVITY_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}
