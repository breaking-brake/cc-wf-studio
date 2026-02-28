/**
 * Claude Code Workflow Studio - Webview Entry Point
 *
 * React 18 root initialization with platform-agnostic bridge detection.
 * Supports VSCode, Electron, and Dev mode environments.
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactFlowProvider } from 'reactflow';
import App from './App';
import { I18nProvider } from './i18n/i18n-context';
import { type IHostBridge, setBridge } from './services/bridge';
import { createElectronBridge } from './services/electron-bridge-adapter';
import { createVSCodeBridge } from './services/vscode-bridge-adapter';
import 'reactflow/dist/style.css';
import './styles/standalone-theme.css';
import './styles/main.css';

// ============================================================================
// VSCode API Type (for type checking only)
// ============================================================================

interface VSCodeAPI {
  postMessage(message: unknown): void;
  getState(): unknown;
  setState(state: unknown): void;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VSCodeAPI;
    initialLocale?: string;
    vscode?: VSCodeAPI;
  }
}

// ============================================================================
// Bridge Initialization
// ============================================================================

function createDevBridge(): IHostBridge {
  return {
    postMessage: (message: unknown) => {
      console.log('[Dev Mode] postMessage:', message);
      const msg = message as { type: string };
      // Simulate extension host: when webview sends WEBVIEW_READY, reply with INITIAL_STATE
      if (msg.type === 'WEBVIEW_READY') {
        setTimeout(() => {
          window.postMessage({ type: 'INITIAL_STATE', payload: { locale: 'en' } }, '*');
        }, 50);
      }
    },
    onMessage: (handler) => {
      window.addEventListener('message', handler);
      return () => window.removeEventListener('message', handler);
    },
    getState: () => {
      return null;
    },
    setState: (state: unknown) => {
      console.log('[Dev Mode] setState:', state);
    },
  };
}

let bridge: IHostBridge;

if (window.acquireVsCodeApi) {
  // VSCode Webview context
  const api = window.acquireVsCodeApi();
  bridge = createVSCodeBridge(api);
  // Make vscode API available globally for backward compatibility
  window.vscode = api;
} else if (window.electronAPI) {
  // Electron renderer context
  bridge = createElectronBridge();
} else {
  // Dev mode (browser)
  bridge = createDevBridge();
}

setBridge(bridge);

// Export for backward compatibility with existing code that imports `vscode` from main
export const vscode: VSCodeAPI = {
  postMessage: (msg: unknown) => bridge.postMessage(msg as { type: string }),
  getState: () => bridge.getState(),
  setState: (s: unknown) => bridge.setState(s),
};

// ============================================================================
// React 18 Root Initialization
// ============================================================================

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);

// Get locale from Extension (injected via HTML)
const locale = window.initialLocale || 'en';

root.render(
  <React.StrictMode>
    <I18nProvider locale={locale}>
      <ReactFlowProvider>
        <App />
      </ReactFlowProvider>
    </I18nProvider>
  </React.StrictMode>
);

// Notify host that Webview is ready to receive messages
bridge.postMessage({ type: 'WEBVIEW_READY' });
