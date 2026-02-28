/**
 * CC Workflow Studio - Web Server
 *
 * Hono-based HTTP server with WebSocket support.
 * Serves the webview static files and provides a WebSocket endpoint
 * for bidirectional communication using the same message protocol
 * as the VSCode extension's postMessage API.
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { ConsoleLogger, setLogger } from '@cc-wf-studio/core';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { createNodeWebSocket } from '@hono/node-ws';
import { Hono } from 'hono';
import { setupWebSocketHandler } from './routes/ws-handler.js';

// Initialize logger
const logger = new ConsoleLogger();
setLogger(logger);

const app = new Hono();

// WebSocket setup
const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

// WebSocket endpoint
const wsHandler = setupWebSocketHandler();
app.get('/ws', upgradeWebSocket(wsHandler));

// Determine paths
const webviewDistPath = path.resolve(
  import.meta.dirname ?? path.dirname(new URL(import.meta.url).pathname),
  '../../../src/webview/dist'
);

// Serve static files from webview dist
app.use(
  '/*',
  serveStatic({
    root: '',
    rewriteRequestPath: (p) => {
      return path.join(webviewDistPath, p);
    },
    onNotFound: (_path, _c) => {
      // For SPA routing, serve index.html for non-asset paths
    },
  })
);

// SPA fallback: serve index.html for any route that doesn't match a static file
app.get('*', (c) => {
  try {
    const indexPath = path.join(webviewDistPath, 'index.html');
    const html = readFileSync(indexPath, 'utf-8');
    return c.html(html);
  } catch {
    return c.text('Webview not built. Run: npm run build:webview', 500);
  }
});

// Start server
const port = Number(process.env.PORT ?? 3001);
const server = serve({ fetch: app.fetch, port }, (info) => {
  logger.info(`CC Workflow Studio web server running at http://localhost:${info.port}`);
  logger.info(`WebSocket endpoint: ws://localhost:${info.port}/ws`);
});

// Inject WebSocket support into the HTTP server
injectWebSocket(server);

export { app };
