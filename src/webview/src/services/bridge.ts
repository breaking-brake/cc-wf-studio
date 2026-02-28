/**
 * Host Bridge Abstraction
 *
 * Platform-agnostic bridge interface for webview-to-host communication.
 * Implementations: VSCode (postMessage), Electron (IPC), Dev (console)
 */

export interface IHostBridge {
  postMessage(message: { type: string; requestId?: string; payload?: unknown }): void;
  onMessage(handler: (event: { data: unknown }) => void): () => void;
  getState(): unknown;
  setState(state: unknown): void;
}

let bridge: IHostBridge | null = null;

export function setBridge(b: IHostBridge): void {
  bridge = b;
}

export function getBridge(): IHostBridge {
  if (!bridge) {
    throw new Error('Bridge not initialized. Call setBridge() first.');
  }
  return bridge;
}
