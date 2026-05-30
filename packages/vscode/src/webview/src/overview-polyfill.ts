/**
 * Tiny browser-side polyfill loaded before any module that touches
 * `vscode.postMessage`. The lightweight `ccwf preview` entry runs in a plain
 * browser (no VSCode), so we need to override `window.acquireVsCodeApi` to
 * intercept the messages the preview-only UI actually emits.
 *
 * The preview surface is read-only, but `InstructionsPanel` still uses the
 * `OPEN_EXTERNAL_URL` channel for any markdown links — we translate those into
 * a plain `window.open` here. Everything else is a silent no-op.
 *
 * This file must be the FIRST import in `overview-entry.tsx` so that the
 * polyfill is installed before `vscode-api.ts` evaluates
 * `window.acquireVsCodeApi?.()`.
 */

declare global {
  interface Window {
    __CC_WF_PREVIEW__?: {
      workflow?: unknown;
      locale?: string;
      sseUrl?: string;
    };
  }
}

if (typeof window !== 'undefined' && !window.acquireVsCodeApi) {
  window.acquireVsCodeApi = () => ({
    postMessage(message: unknown) {
      const envelope = (message ?? {}) as { type?: string; payload?: { url?: string } };
      if (envelope.type === 'OPEN_EXTERNAL_URL' && typeof envelope.payload?.url === 'string') {
        window.open(envelope.payload.url, '_blank', 'noopener,noreferrer');
        return;
      }
      // Everything else is intentionally a no-op in preview mode. The
      // read-only UI shouldn't be issuing extension RPCs.
    },
    getState() {
      return null;
    },
    setState() {
      /* no-op */
    },
  });
}

export {};
