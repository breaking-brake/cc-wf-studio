/**
 * Lightweight read-only preview entry.
 *
 * Powers `ccwf preview` — the CLI serves this HTML, injects a workflow JSON
 * into `window.__CC_WF_PREVIEW__`, and the browser renders the existing
 * `WorkflowOverview` component (Mermaid + Markdown panes). No editor, no
 * canvas, no VSCode message channel.
 *
 * `overview-polyfill` MUST be the first import: it installs a
 * `window.acquireVsCodeApi` stub that catches the one bridge call this view
 * actually makes (`OPEN_EXTERNAL_URL` for markdown links) before
 * `vscode-api.ts` reads `window.acquireVsCodeApi?.()`.
 */

import './overview-polyfill';
import type { Workflow } from '@cc-wf-studio/core';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { WorkflowOverview } from './components/overview/WorkflowOverview';
import { I18nProvider } from './i18n/i18n-context';
import './styles/main.css';

interface PreviewBootstrap {
  workflow?: Workflow | null;
  locale?: string;
  /** When set, the page subscribes to this Server-Sent Events stream and
   * reloads on `workflow-changed`. CLI sets it when `--watch` is in effect. */
  sseUrl?: string;
}

const cfg = (window.__CC_WF_PREVIEW__ ?? {}) as PreviewBootstrap;
const initialWorkflow: Workflow | null = (cfg.workflow as Workflow | undefined) ?? null;
const locale = typeof cfg.locale === 'string' && cfg.locale.length > 0 ? cfg.locale : 'en';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider locale={locale}>
      <WorkflowOverview
        workflow={initialWorkflow}
        splitRatioStorageKey="cc-wf-studio.previewMermaidPanelRatio"
      />
    </I18nProvider>
  </React.StrictMode>
);

/**
 * Drop a non-dismissable overlay onto the page explaining that the preview
 * server has stopped. Used when the server emits a `server-shutdown` SSE event
 * — most browsers refuse `window.close()` on tabs the user opened themselves,
 * so the overlay is the only reliable way to communicate the change.
 */
function showServerStoppedOverlay(): void {
  if (document.getElementById('ccwf-preview-stopped-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'ccwf-preview-stopped-overlay';
  overlay.setAttribute(
    'style',
    [
      'position:fixed',
      'inset:0',
      'background:rgba(15,17,21,0.72)',
      'backdrop-filter:blur(2px)',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'z-index:2147483647',
      'font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif',
      'color:#1a1a1a',
    ].join(';')
  );
  const card = document.createElement('div');
  card.setAttribute(
    'style',
    [
      'background:#fff',
      'padding:28px 32px',
      'border-radius:12px',
      'max-width:480px',
      'text-align:center',
      'box-shadow:0 12px 32px rgba(0,0,0,0.25)',
    ].join(';')
  );
  const title = document.createElement('h2');
  title.textContent = 'ccwf preview server stopped';
  title.setAttribute('style', 'margin:0 0 12px;font-size:18px;font-weight:600;');
  const body = document.createElement('p');
  body.textContent =
    'The preview server has shut down. You can safely close this tab. Re-run `ccwf preview` to bring it back.';
  body.setAttribute('style', 'margin:0;color:#555;font-size:14px;line-height:1.5;');
  card.appendChild(title);
  card.appendChild(body);
  overlay.appendChild(card);
  document.body.appendChild(overlay);
}

// Open a long-lived SSE stream. The server uses this for two purposes:
//   - `workflow-changed` events (when --watch reloads the page)
//   - `server-shutdown` events (when Ctrl+C / auto-shutdown closes the server)
// We also rely on it for the server's "is anyone watching?" detection — see
// the auto-shutdown logic in packages/cli/src/preview/server.ts.
if (typeof cfg.sseUrl === 'string' && cfg.sseUrl.length > 0) {
  try {
    const source = new EventSource(cfg.sseUrl);
    source.addEventListener('workflow-changed', () => {
      window.location.reload();
    });
    source.addEventListener('server-shutdown', () => {
      source.close();
      // Try to close the tab first (some browsers honour this for windows the
      // tooling opened via `open <url>`; most do not). The overlay is the
      // user-visible fallback either way.
      try {
        window.close();
      } catch {
        // ignore
      }
      showServerStoppedOverlay();
    });
    source.addEventListener('error', () => {
      // EventSource auto-retries on its own. We don't show the overlay here
      // because transient network blips would flicker it on/off; the
      // `server-shutdown` event is the authoritative signal.
      console.warn('[ccwf preview] SSE connection error; auto-reload may be stalled.');
    });
  } catch (error) {
    console.warn('[ccwf preview] Failed to start auto-reload listener:', error);
  }
}
