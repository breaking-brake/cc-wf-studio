/**
 * Web Dialog Service
 *
 * IDialogService implementation that sends dialog requests via WebSocket
 * to the browser client for rendering as web UI dialogs.
 */

import type { IDialogService } from '@cc-wf-studio/core';
import type { WebSocketMessageSender } from '../routes/ws-handler.js';

export class WebDialogService implements IDialogService {
  private sender: WebSocketMessageSender | null = null;
  private pendingDialogs = new Map<
    string,
    { resolve: (value: boolean) => void; reject: (error: Error) => void }
  >();

  setSender(sender: WebSocketMessageSender | null): void {
    this.sender = sender;
  }

  showInformationMessage(message: string): void {
    this.sender?.({
      type: 'SHOW_NOTIFICATION',
      payload: { level: 'info', message },
    });
  }

  showWarningMessage(message: string): void {
    this.sender?.({
      type: 'SHOW_NOTIFICATION',
      payload: { level: 'warning', message },
    });
  }

  showErrorMessage(message: string): void {
    this.sender?.({
      type: 'SHOW_NOTIFICATION',
      payload: { level: 'error', message },
    });
  }

  async showConfirmDialog(message: string, confirmLabel: string): Promise<boolean> {
    if (!this.sender) return false;

    const requestId = `dialog-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    return new Promise<boolean>((resolve) => {
      this.pendingDialogs.set(requestId, { resolve, reject: () => resolve(false) });

      this.sender?.({
        type: 'SHOW_CONFIRM_DIALOG',
        requestId,
        payload: { message, confirmLabel },
      });

      // Auto-resolve after 60 seconds if no response
      setTimeout(() => {
        if (this.pendingDialogs.has(requestId)) {
          this.pendingDialogs.delete(requestId);
          resolve(false);
        }
      }, 60000);
    });
  }

  handleDialogResponse(requestId: string, confirmed: boolean): void {
    const pending = this.pendingDialogs.get(requestId);
    if (pending) {
      this.pendingDialogs.delete(requestId);
      pending.resolve(confirmed);
    }
  }

  async showOpenFileDialog(_options: {
    filters?: Record<string, string[]>;
    title?: string;
  }): Promise<string | null> {
    // File picker not supported in web mode — return null
    return null;
  }
}
