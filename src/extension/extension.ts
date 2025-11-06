/**
 * Claude Code Workflow Studio - Extension Entry Point
 *
 * Main activation and deactivation logic for the VSCode extension.
 */

import * as vscode from 'vscode';
import { registerOpenEditorCommand } from './commands/open-editor';

/**
 * Global Output Channel for logging
 */
let outputChannel: vscode.OutputChannel | null = null;

/**
 * Get the global output channel instance
 */
export function getOutputChannel(): vscode.OutputChannel {
  if (!outputChannel) {
    throw new Error('Output channel not initialized. Call activate() first.');
  }
  return outputChannel;
}

/**
 * Log a message to the output channel
 *
 * @param level - Log level (INFO, WARN, ERROR)
 * @param message - Message to log
 * @param data - Optional additional data to log
 */
export function log(level: 'INFO' | 'WARN' | 'ERROR', message: string, data?: unknown): void {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}`;

  if (outputChannel) {
    outputChannel.appendLine(logMessage);
    if (data) {
      outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
  }

  // Also log to console for debugging
  console.log(logMessage, data ?? '');
}

/**
 * Extension activation function
 * Called when the extension is activated (when the command is first invoked)
 */
export function activate(context: vscode.ExtensionContext): void {
  // Create output channel
  outputChannel = vscode.window.createOutputChannel('Claude Code Workflow Studio');
  context.subscriptions.push(outputChannel);

  log('INFO', 'Claude Code Workflow Studio is now active');

  // Register commands
  registerOpenEditorCommand(context);

  log('INFO', 'Claude Code Workflow Studio: All commands registered');
}

/**
 * Extension deactivation function
 * Called when the extension is deactivated
 */
export function deactivate(): void {
  log('INFO', 'Claude Code Workflow Studio is now deactivated');
  outputChannel?.dispose();
  outputChannel = null;
}
