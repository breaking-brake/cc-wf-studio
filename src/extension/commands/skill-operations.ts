/**
 * Skill Operations - Extension Host Message Handlers
 *
 * Feature: 001-skill-node
 * Purpose: Handle Webview requests for Skill browsing, creation, and validation
 *
 * Based on: specs/001-skill-node/contracts/skill-messages.ts
 */

import * as vscode from 'vscode';
import { scanAllSkills, validateSkillFile, createSkill } from '../services/skill-service';
import type { CreateSkillPayload, ValidateSkillFilePayload } from '../../shared/types/messages';

/**
 * Output channel for logging Skill operations
 */
const outputChannel = vscode.window.createOutputChannel('Claude Code Workflow Studio');

/**
 * Handle BROWSE_SKILLS request from Webview
 *
 * Scans both personal (~/.claude/skills/) and project (.claude/skills/) directories
 * and returns all available Skills.
 *
 * @param webview - VSCode Webview instance
 * @param requestId - Request ID for response matching
 */
export async function handleBrowseSkills(
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();
  outputChannel.appendLine(`[Skill Browse] Starting scan (requestId: ${requestId})`);

  try {
    const { personal, project } = await scanAllSkills();
    const allSkills = [...personal, ...project];

    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(
      `[Skill Browse] Scan completed in ${executionTime}ms - Found ${personal.length} personal, ${project.length} project Skills`
    );

    webview.postMessage({
      type: 'SKILL_LIST_LOADED',
      requestId,
      payload: {
        skills: allSkills,
        timestamp: new Date().toISOString(),
        personalCount: personal.length,
        projectCount: project.length,
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(`[Skill Browse] Error after ${executionTime}ms: ${error}`);

    webview.postMessage({
      type: 'SKILL_VALIDATION_FAILED',
      requestId,
      payload: {
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: String(error),
        details: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}

/**
 * Handle CREATE_SKILL request from Webview
 *
 * Creates a new SKILL.md file in the specified directory (personal or project).
 *
 * @param payload - Skill creation payload
 * @param webview - VSCode Webview instance
 * @param requestId - Request ID for response matching
 *
 * NOTE: Full implementation will be added in Phase 5 (T024-T025)
 */
export async function handleCreateSkill(
  payload: CreateSkillPayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();
  outputChannel.appendLine(
    `[Skill Create] Creating Skill "${payload.name}" (scope: ${payload.scope}, requestId: ${requestId})`
  );

  try {
    const skillPath = await createSkill(payload);
    const executionTime = Date.now() - startTime;

    outputChannel.appendLine(`[Skill Create] Skill created in ${executionTime}ms at ${skillPath}`);

    webview.postMessage({
      type: 'SKILL_CREATION_SUCCESS',
      requestId,
      payload: {
        skillPath,
        name: payload.name,
        description: payload.description,
        scope: payload.scope,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(`[Skill Create] Error after ${executionTime}ms: ${error}`);

    webview.postMessage({
      type: 'SKILL_CREATION_FAILED',
      requestId,
      payload: {
        errorCode: 'UNKNOWN_ERROR',
        errorMessage: String(error),
        details: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}

/**
 * Handle VALIDATE_SKILL_FILE request from Webview
 *
 * Validates a SKILL.md file and returns metadata if valid.
 *
 * @param payload - Validation request payload
 * @param webview - VSCode Webview instance
 * @param requestId - Request ID for response matching
 */
export async function handleValidateSkillFile(
  payload: ValidateSkillFilePayload,
  webview: vscode.Webview,
  requestId: string
): Promise<void> {
  const startTime = Date.now();
  outputChannel.appendLine(
    `[Skill Validate] Validating ${payload.skillPath} (requestId: ${requestId})`
  );

  try {
    const metadata = await validateSkillFile(payload.skillPath);
    const executionTime = Date.now() - startTime;

    outputChannel.appendLine(
      `[Skill Validate] Validation completed in ${executionTime}ms - Skill "${metadata.name}" is valid`
    );

    // Determine scope based on path
    const scope = payload.skillPath.includes('.claude/skills') ? 'project' : 'personal';

    webview.postMessage({
      type: 'SKILL_VALIDATION_SUCCESS',
      requestId,
      payload: {
        skill: {
          skillPath: payload.skillPath,
          name: metadata.name,
          description: metadata.description,
          scope,
          validationStatus: 'valid' as const,
          allowedTools: metadata.allowedTools,
        },
      },
    });
  } catch (error) {
    const executionTime = Date.now() - startTime;
    outputChannel.appendLine(`[Skill Validate] Error after ${executionTime}ms: ${error}`);

    // Determine error code
    const errorMessage = String(error);
    let errorCode: 'SKILL_NOT_FOUND' | 'INVALID_FRONTMATTER' | 'UNKNOWN_ERROR' = 'UNKNOWN_ERROR';

    if (errorMessage.includes('file not found')) {
      errorCode = 'SKILL_NOT_FOUND';
    } else if (errorMessage.includes('Invalid SKILL.md frontmatter')) {
      errorCode = 'INVALID_FRONTMATTER';
    }

    webview.postMessage({
      type: 'SKILL_VALIDATION_FAILED',
      requestId,
      payload: {
        errorCode,
        errorMessage,
        filePath: payload.skillPath,
        details: error instanceof Error ? error.stack : undefined,
      },
    });
  }
}
