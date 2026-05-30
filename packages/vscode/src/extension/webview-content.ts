/**
 * CC Workflow Studio - Webview HTML Generator
 *
 * Generates the HTML content for the Webview panel
 * Based on: /specs/001-cc-wf-studio/contracts/vscode-extension-api.md section 4.2
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as vscode from 'vscode';
import { getCurrentLocale } from './i18n/i18n-service';

interface WebviewAssetRefs {
  scriptPath: string;
  stylePath: string | null;
}

/**
 * Read the built `dist/index.html` to discover the actual asset filenames vite
 * emitted. We can't hard-code `main.js` / `main.css` because vite renames
 * entries to avoid base-name collisions with other entries (`overview.html`
 * was added for `ccwf preview`, which makes vite emit the main bundle as
 * `main2.js` on some builds). Reading the built HTML keeps the extension
 * resilient to those renames.
 *
 * Falls back to the historical defaults if the manifest can't be parsed.
 */
function resolveWebviewAssets(extensionUri: vscode.Uri): WebviewAssetRefs {
  const fallback: WebviewAssetRefs = {
    scriptPath: 'assets/main.js',
    stylePath: 'assets/main.css',
  };
  try {
    const indexHtmlPath = path.join(extensionUri.fsPath, 'src', 'webview', 'dist', 'index.html');
    const html = fs.readFileSync(indexHtmlPath, 'utf-8');
    // Strip both `./` and `/` leading segments so the path joins cleanly with
    // the extensionUri directory (the webview tree always lives at
    // `src/webview/dist/`; the HTML's own base is just an artefact of vite's
    // `base: './'` setting we use so the same dist works behind a URL prefix
    // in `ccwf preview` / `ccwf canvas`).
    const scriptMatch = html.match(/<script[^>]+type="module"[^>]+src="(?:\.\/|\/)?([^"]+)"/i);
    const styleMatch = html.match(/<link[^>]+rel="stylesheet"[^>]+href="(?:\.\/|\/)?([^"]+)"/i);
    if (!scriptMatch) {
      console.warn('[webview-content] Could not find module script in index.html; using fallback');
      return fallback;
    }
    return {
      scriptPath: scriptMatch[1],
      stylePath: styleMatch ? styleMatch[1] : null,
    };
  } catch (error) {
    console.warn(
      `[webview-content] Failed to resolve webview assets from dist/index.html: ${error instanceof Error ? error.message : String(error)}; using fallback`
    );
    return fallback;
  }
}

/**
 * Generate HTML content for the Webview
 *
 * @param webview - VSCode Webview instance
 * @param extensionUri - Extension URI for resource loading
 * @returns HTML string with CSP, nonce, and resource URIs
 */
export function getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
  // Generate a nonce for Content Security Policy
  const nonce = getNonce();

  // Get current locale for i18n
  const locale = getCurrentLocale();

  // Get URIs for webview resources.
  // NOTE: Do NOT append a cache-bust query to the script URL. The webview
  // entry is `<script type="module">` and dynamically-imported chunks (e.g.
  // `mermaid.core.js`) re-import `./main.js` *without* the query. With the
  // query the browser treats `main.js` and `main.js?v=...` as two different
  // modules, evaluates both, and calls `acquireVsCodeApi()` twice (which
  // throws "An instance of the VS Code API has already been acquired").
  const assets = resolveWebviewAssets(extensionUri);
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'dist', ...assets.scriptPath.split('/'))
  );
  const styleUri = assets.stylePath
    ? webview.asWebviewUri(
        vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'dist', ...assets.stylePath.split('/'))
      )
    : null;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">

    <!--
      Use a content security policy to only allow loading styles and scripts
      from our extension's directory and only allow scripts with a specific nonce.
      Reference: https://code.visualstudio.com/api/extension-guides/webview#content-security-policy
    -->
    <meta http-equiv="Content-Security-Policy" content="
      default-src 'none';
      style-src ${webview.cspSource} 'unsafe-inline';
      script-src 'nonce-${nonce}' 'strict-dynamic';
      img-src ${webview.cspSource} https:;
      font-src ${webview.cspSource};
    ">

    <meta name="viewport" content="width=device-width, initial-scale=1.0">
${styleUri ? `\n    <link href="${styleUri}" rel="stylesheet">\n` : ''}
    <title>CC Workflow Studio</title>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">
      window.initialLocale = "${locale}";
    </script>
    <script type="module" nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
}

/**
 * Generate a cryptographically secure nonce
 *
 * @returns A random 32-character hexadecimal string
 */
function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
