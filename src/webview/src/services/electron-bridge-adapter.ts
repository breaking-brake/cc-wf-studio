/**
 * Electron Bridge Adapter
 *
 * IHostBridge implementation for Electron renderer context.
 * Uses window.electronAPI (exposed via preload script) for communication.
 */

import type { IHostBridge } from './bridge';

interface ElectronAPI {
  send(channel: string, data: unknown): void;
  on(channel: string, callback: (data: unknown) => void): () => void;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function createElectronBridge(): IHostBridge {
  const api = window.electronAPI;
  if (!api) {
    throw new Error('electronAPI not available. Ensure preload script is loaded.');
  }

  return {
    postMessage: (msg) => api.send('webview-message', msg),
    onMessage: (handler) => {
      return api.on('host-message', (data) => handler({ data }));
    },
    getState: () => JSON.parse(localStorage.getItem('app-state') || 'null'),
    setState: (s) => localStorage.setItem('app-state', JSON.stringify(s)),
  };
}
