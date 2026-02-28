/**
 * Electron Dialog Service
 *
 * IDialogService implementation using Electron's dialog API.
 */

import type { IDialogService } from '@cc-wf-studio/core';
import { type BrowserWindow, dialog } from 'electron';

export class ElectronDialogService implements IDialogService {
  constructor(private readonly getWindow: () => BrowserWindow | null) {}

  showInformationMessage(message: string): void {
    const win = this.getWindow();
    if (win) {
      dialog.showMessageBoxSync(win, { type: 'info', message });
    }
  }

  showWarningMessage(message: string): void {
    const win = this.getWindow();
    if (win) {
      dialog.showMessageBoxSync(win, { type: 'warning', message });
    }
  }

  showErrorMessage(message: string): void {
    const win = this.getWindow();
    if (win) {
      dialog.showMessageBoxSync(win, { type: 'error', message });
    }
  }

  async showConfirmDialog(message: string, confirmLabel: string): Promise<boolean> {
    const win = this.getWindow();
    if (!win) return false;

    const result = await dialog.showMessageBox(win, {
      type: 'question',
      buttons: [confirmLabel, 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      message,
    });

    return result.response === 0;
  }

  async showOpenFileDialog(options: {
    filters?: Record<string, string[]>;
    title?: string;
  }): Promise<string | null> {
    const win = this.getWindow();
    if (!win) return null;

    const filters = options.filters
      ? Object.entries(options.filters).map(([name, extensions]) => ({
          name,
          extensions,
        }))
      : [];

    const result = await dialog.showOpenDialog(win, {
      title: options.title,
      filters,
      properties: ['openFile'],
    });

    return result.canceled ? null : result.filePaths[0] || null;
  }
}
