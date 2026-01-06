/**
 * Claude Code Workflow Studio - Webview Entry Point
 *
 * React 18 root initialization and VSCode API acquisition
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactFlowProvider } from 'reactflow';
import App from './App';
import { I18nProvider } from './i18n/i18n-context';
import 'reactflow/dist/style.css';
import './styles/main.css';

// ============================================================================
// VSCode API
// ============================================================================

/**
 * VSCode API type definition
 * Reference: https://code.visualstudio.com/api/extension-guides/webview
 */
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

// Acquire VSCode API (only available in VSCode Webview context)
export const vscode = window.acquireVsCodeApi?.() ?? {
  postMessage: (message: unknown) => {
    console.log('[Dev Mode] postMessage:', message);
  },
  getState: () => {
    console.log('[Dev Mode] getState');
    return null;
  },
  setState: (state: unknown) => {
    console.log('[Dev Mode] setState:', state);
  },
};

// Make vscode API available globally for services that can't import ES modules
window.vscode = vscode;

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
