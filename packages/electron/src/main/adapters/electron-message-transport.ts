/**
 * Electron Message Transport
 *
 * IMessageTransport implementation using Electron IPC.
 * Routes messages between the main process and renderer.
 */

import type { IMessageTransport } from '@cc-wf-studio/core';
import type { BrowserWindow, IpcMain } from 'electron';

export class ElectronMessageTransport implements IMessageTransport {
  private handlers: Array<
    (message: { type: string; requestId?: string; payload?: unknown }) => void
  > = [];

  constructor(
    private readonly ipcMain: IpcMain,
    private readonly getWindow: () => BrowserWindow | null
  ) {
    // Listen for messages from renderer
    this.ipcMain.on('webview-message', (_event, message) => {
      for (const handler of this.handlers) {
        handler(message);
      }
    });
  }

  postMessage(message: { type: string; requestId?: string; payload?: unknown }): void {
    const win = this.getWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.send('host-message', message);
    }
  }

  onMessage(
    handler: (message: { type: string; requestId?: string; payload?: unknown }) => void
  ): void {
    this.handlers.push(handler);
  }
}
