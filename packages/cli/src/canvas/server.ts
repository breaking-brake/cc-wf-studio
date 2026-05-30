/**
 * `ccwf canvas` HTTP + WebSocket server.
 *
 * Serves the bundled webview at `/<sessionId>/` and a long-lived WebSocket at
 * `/<sessionId>/ws` that emulates the VSCode webview message channel. The
 * browser-side polyfill lives in `bootstrap.ts` (served as
 * `/<sessionId>/bootstrap.js`) and rewires
 * `window.acquireVsCodeApi` to push/receive through this socket so the webview
 * code can run unmodified.
 *
 * Threat model: localhost binding + URL session id. Sufficient for single-user
 * developer-machine use, NOT a public-facing endpoint. The README and the
 * `canvas` command's stdout both spell this out.
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import * as path from 'node:path';
import { type WebSocket, WebSocketServer } from 'ws';
import { BOOTSTRAP_SOURCE } from './bootstrap.js';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json; charset=utf-8',
};

export interface CanvasServerHandlers {
  /** Handle an incoming postMessage from the browser. May call `send`. */
  onMessage(message: unknown, send: (payload: unknown) => void): Promise<void> | void;
  /** Optional initial state to push when a new WebSocket connects. */
  onConnect?(send: (payload: unknown) => void): Promise<void> | void;
}

export interface CanvasServerOptions {
  /** Absolute path to the directory containing built webview assets (`index.html`, `assets/*`). */
  webviewDistDir: string;
  /** Message router for incoming postMessage payloads. */
  handlers: CanvasServerHandlers;
  /** Static config exposed to the browser as `window.__CC_WF_BOOTSTRAP__`. */
  bootstrapConfig?: Record<string, unknown>;
  /** Bind host. Default `127.0.0.1` — never bind to 0.0.0.0 without the id check. */
  host?: string;
  /** Preferred port. `0` (default) asks the OS for any free port. */
  port?: number;
}

export interface CanvasServerHandle {
  host: string;
  port: number;
  /** UUID v4 used as the URL path prefix (entry: `/<sessionId>/`, WS: `/<sessionId>/ws`). */
  sessionId: string;
  /** URL the user should open in their browser (`http://host:port/<sessionId>/`). */
  url: string;
  /** Shut down the HTTP server, close all open WebSockets, and resolve. */
  close(): Promise<void>;
}

/**
 * Strip the `/<sessionId>` URL prefix and return the remainder, or `null` when
 * the prefix doesn't match. Putting the session id in the URL path (rather
 * than as a query string) keeps it out of cross-origin Referer headers when
 * the canvas navigates to external links.
 */
function stripSessionPrefix(pathname: string, sessionId: string): string | null {
  const prefix = `/${sessionId}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return null;
}

function injectBootstrap(html: string, bootstrapConfig: Record<string, unknown>): string {
  const inlineConfig = `<script>window.__CC_WF_BOOTSTRAP__ = ${JSON.stringify(bootstrapConfig)};</script>`;
  // Relative to the host HTML; the entry lives at `/<sessionId>/` so
  // `./bootstrap.js` resolves to `/<sessionId>/bootstrap.js`, which the server
  // serves below.
  const loader = `<script src="./bootstrap.js"></script>`;
  const injection = `${inlineConfig}\n${loader}\n`;
  // Inject before the first <script type="module"> tag the built index.html emits.
  // Fallback: prepend to </head> if no module script is found.
  const moduleTag = html.match(/<script[^>]+type="module"[^>]*>/);
  if (moduleTag) {
    return html.replace(moduleTag[0], injection + moduleTag[0]);
  }
  return html.replace('</head>', `${injection}</head>`);
}

function isWithinDirectory(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

async function serveStatic(
  req: IncomingMessage,
  res: ServerResponse,
  webviewDistDir: string,
  bootstrapConfig: Record<string, unknown>,
  expectedSessionId: string
): Promise<void> {
  const rawUrl = req.url ?? '/';
  const pathname = rawUrl.split('?')[0];
  const stripped = stripSessionPrefix(pathname, expectedSessionId);
  if (stripped === null) {
    res.statusCode = 403;
    res.setHeader('content-type', 'text/plain; charset=utf-8');
    res.end('Forbidden: session id missing or invalid.\n');
    return;
  }

  if (stripped === '/' || stripped === '/index.html') {
    try {
      const raw = await fs.readFile(path.join(webviewDistDir, 'index.html'), 'utf-8');
      const html = injectBootstrap(raw, bootstrapConfig);
      res.statusCode = 200;
      res.setHeader('content-type', MIME_TYPES['.html']);
      res.setHeader('cache-control', 'no-store');
      res.end(html);
    } catch (error) {
      res.statusCode = 500;
      res.end(`Failed to load index.html: ${(error as Error).message}\n`);
    }
    return;
  }

  if (stripped === '/bootstrap.js') {
    res.statusCode = 200;
    res.setHeader('content-type', MIME_TYPES['.js']);
    res.setHeader('cache-control', 'no-store');
    res.end(BOOTSTRAP_SOURCE);
    return;
  }

  const relative = stripped.replace(/^\/+/, '');
  const target = path.resolve(webviewDistDir, relative);
  if (!isWithinDirectory(webviewDistDir, target)) {
    res.statusCode = 403;
    res.end('Forbidden\n');
    return;
  }
  try {
    const contents = await fs.readFile(target);
    const ext = path.extname(target).toLowerCase();
    res.statusCode = 200;
    res.setHeader('content-type', MIME_TYPES[ext] ?? 'application/octet-stream');
    res.end(contents);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      res.statusCode = 404;
      res.end('Not Found\n');
    } else {
      res.statusCode = 500;
      res.end(`Server error: ${(error as Error).message}\n`);
    }
  }
}

export async function startCanvasServer(
  options: CanvasServerOptions
): Promise<CanvasServerHandle> {
  // Bind on the explicit IPv4 loopback to keep behaviour predictable across
  // OS resolver quirks (some IPv6-enabled hosts resolve `localhost` to `::1`,
  // which would silently leave us serving on a different stack). When the
  // caller supplies an explicit --host we honour it for both bind and display.
  const host = options.host ?? '127.0.0.1';
  const displayHost = options.host ?? 'localhost';
  const sessionId = randomUUID();
  const bootstrapConfig: Record<string, unknown> = {
    ...(options.bootstrapConfig ?? {}),
    // wsUrl is filled in after we know the listening port.
  };

  const httpServer: Server = createServer((req, res) => {
    serveStatic(req, res, options.webviewDistDir, bootstrapConfig, sessionId).catch((error) => {
      res.statusCode = 500;
      res.end(`Server error: ${(error as Error).message}\n`);
    });
  });

  const wss = new WebSocketServer({ noServer: true });
  const openSockets = new Set<WebSocket>();

  wss.on('connection', (socket) => {
    openSockets.add(socket);
    const send = (payload: unknown): void => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(payload));
      }
    };
    socket.on('message', (raw) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.toString());
      } catch {
        send({ type: 'ERROR', payload: { message: 'Invalid JSON' } });
        return;
      }
      Promise.resolve(options.handlers.onMessage(parsed, send)).catch((error) => {
        send({
          type: 'ERROR',
          payload: { message: error instanceof Error ? error.message : String(error) },
        });
      });
    });
    socket.on('close', () => {
      openSockets.delete(socket);
    });
    if (options.handlers.onConnect) {
      Promise.resolve(options.handlers.onConnect(send)).catch((error) => {
        send({
          type: 'ERROR',
          payload: { message: error instanceof Error ? error.message : String(error) },
        });
      });
    }
  });

  httpServer.on('upgrade', (req, socket, head) => {
    const url = req.url ?? '';
    const expectedPath = `/${sessionId}/ws`;
    if (!url.startsWith(expectedPath)) {
      socket.write('HTTP/1.1 403 Forbidden\r\n\r\n');
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });

  await new Promise<void>((resolve, reject) => {
    httpServer.once('error', reject);
    httpServer.listen(options.port ?? 0, host, () => {
      httpServer.off('error', reject);
      resolve();
    });
  });

  const address = httpServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Canvas server did not return an inet address.');
  }
  const port = address.port;
  bootstrapConfig.wsUrl = `ws://${displayHost}:${port}/${sessionId}/ws`;

  return {
    host: displayHost,
    port,
    sessionId,
    url: `http://${displayHost}:${port}/${sessionId}/`,
    async close() {
      for (const socket of openSockets) {
        socket.close();
      }
      openSockets.clear();
      await new Promise<void>((resolve) => wss.close(() => resolve()));
      await new Promise<void>((resolve, reject) => {
        httpServer.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
}
