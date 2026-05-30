/**
 * Claude Code Workflow Studio - Webview Entry Point
 *
 * React 18 root initialization. The `vscode` accessor lives in
 * `./services/vscode-api` so the lightweight `overview.html` entry can reuse it
 * without dragging this canvas bootstrap into its bundle.
 *
 * Based on: /specs/001-cc-wf-studio/plan.md
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ReactFlowProvider } from 'reactflow';
import App from './App';
import { I18nProvider } from './i18n/i18n-context';
import { vscode } from './services/vscode-api';
import 'reactflow/dist/style.css';
import './styles/main.css';

// Vite's `__vitePreload` helper preloads CSS deps for code-split chunks. In the
// VSCode webview environment those root-relative `assets/main.css` URLs cannot
// be fetched (the asset lives under the `vscode-webview://` scheme). The CSS
// preload is purely an optimisation — the dynamic import itself works fine —
// so we silence *only* CSS preload failures. Letting other preload errors
// propagate is important: otherwise the parent dynamic import resolves with
// `undefined` and surfaces as a confusing "Cannot read properties of undefined"
// downstream.
// See https://vite.dev/guide/build.html#load-error-handling
window.addEventListener('vite:preloadError', (event) => {
  const e = event as Event & { payload?: unknown };
  const message = e.payload instanceof Error ? e.payload.message : String(e.payload ?? '');
  if (message.includes('Unable to preload CSS')) {
    event.preventDefault();
  } else {
    // Surface real errors in the console so we can see what actually broke.
    console.error('[vite:preloadError]', e.payload);
  }
});

// Backward-compat re-export. Consumers should migrate to importing directly
// from `./services/vscode-api`, but the existing components still reach for
// `from '../main'`.
export { vscode };

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

// Notify Extension Host that Webview is ready to receive messages
// This ensures INITIAL_STATE is sent only after React is fully initialized
// Fixes: Issue #396 - blank page when Webview loads slowly
vscode.postMessage({ type: 'WEBVIEW_READY' });
