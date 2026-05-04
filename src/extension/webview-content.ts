/**
 * CC Workflow Studio - Webview HTML Generator
 *
 * Generates the HTML content for the Webview panel
 * Based on: /specs/001-cc-wf-studio/contracts/vscode-extension-api.md section 4.2
 */

import * as vscode from 'vscode';
import { getCurrentLocale } from './i18n/i18n-service';

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
  const scriptUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'dist', 'assets', 'main.js')
  );
  const styleUri = webview.asWebviewUri(
    vscode.Uri.joinPath(extensionUri, 'src', 'webview', 'dist', 'assets', 'main.css')
  );

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

    <link href="${styleUri}" rel="stylesheet">

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
