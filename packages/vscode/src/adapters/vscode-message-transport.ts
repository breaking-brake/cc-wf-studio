/**
 * VSCode Message Transport Adapter
 *
 * IMessageTransport implementation wrapping VSCode Webview postMessage.
 */

import type { IMessageTransport } from '@cc-wf-studio/core';
import type * as vscode from 'vscode';

export class VSCodeMessageTransport implements IMessageTransport {
  private webview: vscode.Webview | null = null;
  private handlers: Array<
    (message: { type: string; requestId?: string; payload?: unknown }) => void
  > = [];

  setWebview(webview: vscode.Webview | null): void {
    this.webview = webview;
  }

  postMessage(message: { type: string; requestId?: string; payload?: unknown }): void {
    this.webview?.postMessage(message);
  }

  onMessage(
    handler: (message: { type: string; requestId?: string; payload?: unknown }) => void
  ): void {
    this.handlers.push(handler);
  }

  /**
   * Called from the extension host when a webview message is received.
   * Forwards to registered handlers.
   */
  handleIncomingMessage(message: { type: string; requestId?: string; payload?: unknown }): void {
    for (const handler of this.handlers) {
      handler(message);
    }
  }
}
