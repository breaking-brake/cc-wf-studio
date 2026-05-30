/**
 * Claude Code Workflow Studio - Export Service
 *
 * Thin wrapper around `@cc-wf-studio/core`'s pure export planner: walks the
 * planned files and persists them through the workspace `FileService`. The
 * file content generators (`generateSubAgentFile`, `generateSlashCommandFile`,
 * `escapeYamlString`, …) live in `@cc-wf-studio/core/services/workflow-export`
 * and are imported here so other VSCode commands keep working off the same
 * public surface.
 *
 * Based on: /specs/001-cc-wf-studio/spec.md Export Format Details
 */

import * as path from 'node:path';
import type { Workflow } from '@cc-wf-studio/core';
import { planWorkflowExportFiles } from '@cc-wf-studio/core';
import type { FileService } from './file-service';

/** Convert a forward-slash relative path (from the planner) to an OS-native one. */
function joinRelative(workspacePath: string, relativePath: string): string {
  return path.join(workspacePath, ...relativePath.split('/'));
}

/**
 * Check if any planned export files already exist on disk.
 *
 * @returns Array of existing absolute file paths (empty if no conflicts)
 */
export async function checkExistingFiles(
  workflow: Workflow,
  fileService: FileService
): Promise<string[]> {
  const existingFiles: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  for (const planned of planWorkflowExportFiles(workflow)) {
    const filePath = joinRelative(workspacePath, planned.relativePath);
    if (await fileService.fileExists(filePath)) {
      existingFiles.push(filePath);
    }
  }

  return existingFiles;
}

/**
 * Export workflow to .claude format.
 *
 * @returns Array of exported absolute file paths
 */
export async function exportWorkflow(
  workflow: Workflow,
  fileService: FileService,
  options?: { highlightEnabled?: boolean }
): Promise<string[]> {
  const exportedFiles: string[] = [];
  const workspacePath = fileService.getWorkspacePath();

  const plan = planWorkflowExportFiles(workflow, options);

  // Ensure .claude/agents and .claude/commands exist before writing anything.
  await fileService.createDirectory(path.join(workspacePath, '.claude'));
  const directoriesEnsured = new Set<string>();
  for (const planned of plan) {
    const absDir = path.dirname(joinRelative(workspacePath, planned.relativePath));
    if (directoriesEnsured.has(absDir)) continue;
    await fileService.createDirectory(absDir);
    directoriesEnsured.add(absDir);
  }

  for (const planned of plan) {
    if (planned.kind === 'subAgent') {
      // Legacy inline node — warn for parity with the previous implementation.
      console.warn(
        `[Export] SubAgent node "${planned.sourceName}" has no commandFilePath (inline definition). Consider migrating to reference model.`
      );
    }
    const filePath = joinRelative(workspacePath, planned.relativePath);
    await fileService.writeFile(filePath, planned.contents);
    exportedFiles.push(filePath);
  }

  return exportedFiles;
}

// Re-export the pure helpers so existing call sites continue to import from
// this module. New code should import directly from `@cc-wf-studio/core`.
export {
  escapeYamlString,
  generateSlashCommandFile,
  generateSubAgentFile,
  generateSubAgentFlowAgentFile,
  nodeNameToFileName,
  type SubAgentFileOptions,
  sanitizeNodeId,
  validateClaudeFileFormat,
} from '@cc-wf-studio/core';
