/**
 * Claude Code Workflow Studio - Export Warning Service
 *
 * Surfaces target-compatibility warnings when a workflow is exported or run
 * for a non-Claude agent from the canvas (issue #852). Mirrors the warnings
 * `ccwf export` / `ccwf run` print on stderr: Claude Code-only nodes the
 * target cannot execute, plus every configured node field the target ignores
 * (derived from the same schema registry the property panels render from).
 *
 * Non-blocking by design: the export has already succeeded when this runs;
 * the notification tells the user what the target silently drops.
 */

import {
  collectIgnoredFieldWarnings,
  describeClaudeCodeOnlyNodes,
  type ExportTarget,
  type Workflow,
} from '@cc-wf-studio/core';
import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    outputChannel = vscode.window.createOutputChannel('CC Workflow Studio: Export Warnings');
  }
  return outputChannel;
}

/**
 * Collect the same target-compatibility report `ccwf export` / `ccwf run` /
 * `ccwf validate --agent` produce: Claude Code-only nodes plus per-field
 * "ignored when exporting to <target>" warnings.
 */
export function collectTargetCompatibilityWarnings(
  workflow: Workflow,
  target: ExportTarget,
  agentLabel: string
): string[] {
  const warnings: string[] = [];
  const claudeOnlyNodes = describeClaudeCodeOnlyNodes(workflow);
  if (target !== 'claudeCode' && claudeOnlyNodes.length > 0) {
    warnings.push(
      `This workflow contains Claude Code-only node(s) that ${agentLabel} cannot execute: ${claudeOnlyNodes.join(', ')}.`
    );
  }
  warnings.push(...collectIgnoredFieldWarnings(workflow, target));
  return warnings;
}

/**
 * Show a non-modal warning notification for any compatibility warnings, with
 * a "Show Details" button that opens the full per-field list in the output
 * channel. No-op when the workflow is fully compatible with the target.
 */
export function notifyTargetCompatibilityWarnings(
  workflow: Workflow,
  target: ExportTarget,
  agentLabel: string
): void {
  const warnings = collectTargetCompatibilityWarnings(workflow, target, agentLabel);
  if (warnings.length === 0) {
    return;
  }

  const channel = getOutputChannel();
  channel.appendLine(`Workflow "${workflow.name}" exported for ${agentLabel}:`);
  for (const warning of warnings) {
    channel.appendLine(`  warning: ${warning}`);
  }
  channel.appendLine('');

  const summary =
    warnings.length === 1
      ? warnings[0]
      : `${warnings.length} configured settings are ignored by ${agentLabel}.`;
  vscode.window
    .showWarningMessage(`Exported with warnings: ${summary}`, 'Show Details')
    .then((choice) => {
      if (choice === 'Show Details') {
        channel.show(true);
      }
    });
}
