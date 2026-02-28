/**
 * VSCode Bridge Adapter
 *
 * IHostBridge implementation for VSCode Webview context.
 * Uses window.acquireVsCodeApi() for communication.
 */

import type { IHostBridge } from './bridge';

interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

export function createVSCodeBridge(api: VSCodeAPI): IHostBridge {
  return {
    postMessage: (msg) => api.postMessage(msg),
    onMessage: (handler) => {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
    getState: () => api.getState(),
    setState: (s) => api.setState(s),
  };
}
