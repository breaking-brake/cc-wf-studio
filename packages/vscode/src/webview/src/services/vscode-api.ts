/**
 * Webview-side accessor for the VSCode message channel.
 *
 * Historically this lived in `main.tsx`, but `main.tsx` also auto-mounts the
 * full editor on import — that's fine for the canvas entry, but the new
 * `ccwf preview` entry (`overview.html`) imports the webview's React tree
 * indirectly through `WorkflowOverview` and we don't want the canvas to render
 * twice. Splitting the `vscode` constant into its own module lets the preview
 * entry depend on it without dragging the canvas bootstrap along.
 *
 * The fallback object (when `acquireVsCodeApi` is unavailable, e.g. the
 * standalone browser preview) returns a no-op stub so callers can always rely
 * on `vscode.postMessage(...)` being callable. Preview-side polyfills override
 * `window.acquireVsCodeApi` before this module evaluates to intercept specific
 * messages like `OPEN_EXTERNAL_URL`.
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

export const vscode: VSCodeAPI = window.acquireVsCodeApi?.() ?? {
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

// Make vscode API available globally for services that can't import ES modules.
window.vscode = vscode;
