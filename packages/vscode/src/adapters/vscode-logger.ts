/**
 * VSCode Logger Adapter
 *
 * ILogger implementation using VSCode OutputChannel.
 */

import type { ILogger } from '@cc-wf-studio/core';
import type * as vscode from 'vscode';

export class VSCodeLogger implements ILogger {
  constructor(private readonly outputChannel: vscode.OutputChannel) {}

  info(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [INFO] ${message}`;
    this.outputChannel.appendLine(logMessage);
    if (data) {
      this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
    console.log(logMessage, data ?? '');
  }

  warn(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [WARN] ${message}`;
    this.outputChannel.appendLine(logMessage);
    if (data) {
      this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
    console.warn(logMessage, data ?? '');
  }

  error(message: string, data?: unknown): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [ERROR] ${message}`;
    this.outputChannel.appendLine(logMessage);
    if (data) {
      this.outputChannel.appendLine(`  Data: ${JSON.stringify(data, null, 2)}`);
    }
    console.error(logMessage, data ?? '');
  }
}
