/**
 * Claude Code Workflow Studio - Cursor Integration Handlers
 *
 * Handles Export/Run for Cursor (Anysphere VSCode fork) integration
 */

import * as vscode from 'vscode';
import type {
  CursorOperationFailedPayload,
  ExportForCursorPayload,
  ExportForCursorSuccessPayload,
  RunForCursorPayload,
  RunForCursorSuccessPayload,
} from '../../shared/types/messages';
import { isCursorInstalled, startCursorTask } from '../services/cursor-extension-service';
import {
  checkExistingCursorSkill,
  exportWorkflowAsCursorSkill,
} from '../services/cursor-skill-export-service';
import type { FileService } from '../services/file-service';
import {
  hasNonStandardSkills,
  promptAndNormalizeSkills,
} from '../services/skill-normalization-service';

/**
 * Handle Export for Cursor request
 *
 * Exports workflow to Skills format (.cursor/skills/name/SKILL.md)
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Export payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleExportForCursor(
  fileService: FileService,
  webview: vscode.Webview,
  payload: ExportForCursorPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingCursorSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'EXPORT_FOR_CURSOR_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Export workflow as skill to .cursor/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsCursorSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: CursorOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'EXPORT_FOR_CURSOR_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Send success response
    const successPayload: ExportForCursorSuccessPayload = {
      skillName: exportResult.skillName,
      skillPath: exportResult.skillPath,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'EXPORT_FOR_CURSOR_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(
      `Exported workflow as Cursor skill: ${exportResult.skillPath}`
    );
  } catch (error) {
    const failedPayload: CursorOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'EXPORT_FOR_CURSOR_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}

/**
 * Handle Run for Cursor request
 *
 * Exports workflow to Skills format and runs it via Cursor
 *
 * @param fileService - File service instance
 * @param webview - Webview for sending responses
 * @param payload - Run payload
 * @param requestId - Optional request ID for response correlation
 */
export async function handleRunForCursor(
  fileService: FileService,
  webview: vscode.Webview,
  payload: RunForCursorPayload,
  requestId?: string
): Promise<void> {
  try {
    const { workflow } = payload;

    // Step 0.5: Normalize skills (copy non-standard skills to .claude/skills/)
    if (hasNonStandardSkills(workflow, 'cursor')) {
      const normalizeResult = await promptAndNormalizeSkills(workflow, 'cursor');

      if (!normalizeResult.success) {
        if (normalizeResult.cancelled) {
          webview.postMessage({
            type: 'RUN_FOR_CURSOR_CANCELLED',
            requestId,
          });
          return;
        }
        throw new Error(normalizeResult.error || 'Failed to copy skills to .claude/skills/');
      }

      // Log normalized skills
      if (normalizeResult.normalizedSkills && normalizeResult.normalizedSkills.length > 0) {
        console.log(
          `[Cursor] Copied ${normalizeResult.normalizedSkills.length} skill(s) to .claude/skills/`
        );
      }
    }

    // Step 1: Check for existing skill and ask for confirmation
    const existingSkillPath = await checkExistingCursorSkill(workflow, fileService);
    if (existingSkillPath) {
      const result = await vscode.window.showWarningMessage(
        `Skill already exists: ${existingSkillPath}\n\nOverwrite?`,
        { modal: true },
        'Overwrite',
        'Cancel'
      );
      if (result !== 'Overwrite') {
        webview.postMessage({
          type: 'RUN_FOR_CURSOR_CANCELLED',
          requestId,
        });
        return;
      }
    }

    // Step 2: Export workflow as skill to .cursor/skills/{name}/SKILL.md
    const exportResult = await exportWorkflowAsCursorSkill(workflow, fileService);

    if (!exportResult.success) {
      const failedPayload: CursorOperationFailedPayload = {
        errorCode: 'EXPORT_FAILED',
        errorMessage: exportResult.errors?.join(', ') || 'Failed to export workflow as skill',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_CURSOR_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 3: Check if Cursor is installed
    if (!isCursorInstalled()) {
      const failedPayload: CursorOperationFailedPayload = {
        errorCode: 'CURSOR_NOT_INSTALLED',
        errorMessage: 'Cursor extension is not installed.',
        timestamp: new Date().toISOString(),
      };
      webview.postMessage({
        type: 'RUN_FOR_CURSOR_FAILED',
        requestId,
        payload: failedPayload,
      });
      return;
    }

    // Step 4: Launch Cursor with the skill
    await startCursorTask(exportResult.skillName);

    // Send success response
    const successPayload: RunForCursorSuccessPayload = {
      workflowName: workflow.name,
      cursorOpened: true,
      timestamp: new Date().toISOString(),
    };

    webview.postMessage({
      type: 'RUN_FOR_CURSOR_SUCCESS',
      requestId,
      payload: successPayload,
    });

    vscode.window.showInformationMessage(`Running workflow via Cursor: ${workflow.name}`);
  } catch (error) {
    const failedPayload: CursorOperationFailedPayload = {
      errorCode: 'UNKNOWN_ERROR',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    };
    webview.postMessage({
      type: 'RUN_FOR_CURSOR_FAILED',
      requestId,
      payload: failedPayload,
    });
  }
}
