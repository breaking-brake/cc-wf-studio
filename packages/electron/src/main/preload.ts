/**
 * Electron Preload Script
 *
 * Exposes a safe API to the renderer process via contextBridge.
 */

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel: string, data: unknown): void => {
    ipcRenderer.send(channel, data);
  },
  on: (channel: string, callback: (data: unknown) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, data: unknown): void => callback(data);
    ipcRenderer.on(channel, listener);
    return () => {
      ipcRenderer.removeListener(channel, listener);
    };
  },
});
