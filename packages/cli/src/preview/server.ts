/**
 * `ccwf preview` HTTP server (+ optional Server-Sent Events for --watch).
 *
 * Unlike `ccwf canvas`, this server is read-only: there's no WebSocket and no
 * message-channel emulation. It just:
 *   - serves the bundled `overview.html` with an injected
 *     `<script>window.__CC_WF_PREVIEW__ = {...}</script>`
 *   - serves `/assets/*` from the same dist directory

 *   - holds long-lived `/<sessionId>/events` SSE connections that the page reloads on
 *     when the source file changes (and that drive auto-shutdown)
 *
 * Threat model: localhost binding + URL session id. Sufficient for single-user
 * developer-machine use, NOT a public-facing endpoint.
 */

import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import { type IncomingMessage, type Server, type ServerResponse, createServer } from 'node:http';
import * as path from 'node:path';

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

export interface PreviewServerOptions {
  /** Absolute path to the directory containing built webview assets (`overview.html`, `assets/*`). */
  webviewDistDir: string;
  /** Initial bootstrap config baked into `window.__CC_WF_PREVIEW__`. */
  bootstrap: PreviewBootstrap;
  /** Bind host. Default `127.0.0.1` — never bind to 0.0.0.0 without the id check. */
  host?: string;
  /** Preferred port. `0` (default) asks the OS for any free port. */
  port?: number;
  /**
   * Auto-shutdown after every SSE client disconnects, in ms. The timer starts
   * once at least one client has connected (so headless runs that nobody
   * ever opens don't shut themselves down). Set to `0` or omit to disable.
   */
  autoShutdownAfterMs?: number;
  /**
   * Invoked when the auto-shutdown timer fires. The server has already closed
   * by the time this runs; the CLI uses it to exit the process.
   */
  onAutoShutdown?: () => void;
}

export interface PreviewBootstrap {
  workflow: unknown;
  locale: string;
  /** Optional SSE URL for live-reload (set automatically when --watch). */
  sseUrl?: string;
}

export interface PreviewServerHandle {
  host: string;
  port: number;
  /** UUID v4 used as the URL path prefix (entry: `/<sessionId>/`, SSE: `/<sessionId>/events`). */
  sessionId: string;
  /** URL the user should open in their browser (`http://host:port/<sessionId>/`). */
  url: string;
  /** Update the in-memory bootstrap; the page reads the new copy on its next reload. */
  setBootstrap(next: PreviewBootstrap): void;
  /** Push a `workflow-changed` SSE event to every connected client. */
  broadcastWorkflowChanged(): void;
  /** Shut down the HTTP server, close every open SSE client, and resolve. */
  close(): Promise<void>;
}

/**
 * Strip the leading `/<sessionId>` prefix from a path, returning the remainder
 * (or `null` if the prefix doesn't match — caller should respond with 403).
 * The session id lives in the URL path rather than as a query string so
 * that the browser's default Referrer-Policy (`strict-origin-when-cross-origin`)
 * does not leak it to off-origin destinations when the user clicks an external
 * Markdown link rendered inside the preview.
 */
function stripSessionPrefix(pathname: string, sessionId: string): string | null {
  const prefix = `/${sessionId}`;
  if (pathname === prefix) return '/';
  if (pathname.startsWith(`${prefix}/`)) return pathname.slice(prefix.length);
  return null;
}

function injectBootstrap(html: string, bootstrap: PreviewBootstrap): string {
  const inline = `<script>window.__CC_WF_PREVIEW__ = ${JSON.stringify(bootstrap)};</script>\n`;
  // Inject before the first <script type="module"> tag the built overview.html emits.
  // Fallback: prepend to </head> if no module script is found.
  const moduleTag = html.match(/<script[^>]+type="module"[^>]*>/);
  if (moduleTag) {
    return html.replace(moduleTag[0], `${inline}${moduleTag[0]}`);
  }
  return html.replace('</head>', `${inline}</head>`);
}

function isWithinDirectory(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative !== '' && !relative.startsWith('..') && !path.isAbsolute(relative);
}

export async function startPreviewServer(
  options: PreviewServerOptions
): Promise<PreviewServerHandle> {
  // Bind on the explicit IPv4 loopback to keep behaviour predictable across
  // OS resolver quirks (some IPv6-enabled hosts resolve `localhost` to `::1`,
  // which would silently leave us serving on a different stack). When the
  // caller supplies an explicit --host we honour it for both bind and display.
  const host = options.host ?? '127.0.0.1';
  const displayHost = options.host ?? 'localhost';
  const sessionId = randomUUID();
  let bootstrap: PreviewBootstrap = options.bootstrap;
  const sseClients = new Set<ServerResponse>();
  const autoShutdownAfterMs = options.autoShutdownAfterMs ?? 0;
  let hasEverConnected = false;
  let shutdownTimer: NodeJS.Timeout | null = null;
  let shuttingDown = false;

  const cancelShutdownTimer = (): void => {
    if (shutdownTimer) {
      clearTimeout(shutdownTimer);
      shutdownTimer = null;
    }
  };

  const armShutdownTimerIfIdle = (): void => {
    if (
      autoShutdownAfterMs <= 0 ||
      shuttingDown ||
      !hasEverConnected ||
      sseClients.size > 0 ||
      shutdownTimer !== null
    ) {
      return;
    }
    shutdownTimer = setTimeout(() => {
      shutdownTimer = null;
      if (shuttingDown || sseClients.size > 0) return;
      shuttingDown = true;
      // Auto-shutdown happens because every viewer has *already* disconnected,
      // so there are no SSE clients to notify; closeInternal still fires its
      // broadcast for any stragglers and then drains keep-alive sockets so
      // process.exit in onAutoShutdown can run promptly.
      void closeInternal();
      options.onAutoShutdown?.();
    }, autoShutdownAfterMs);
  };

  /**
   * Push a single `server-shutdown` event to every connected SSE client. The
   * browser entry uses this to (a) attempt window.close() and (b) drop an
   * overlay onto the page when window.close is blocked, so the tab no longer
   * pretends the server is still serving it.
   */
  const broadcastShutdownEvent = (): void => {
    const message = 'event: server-shutdown\ndata: {}\n\n';
    for (const client of sseClients) {
      try {
        client.write(message);
      } catch {
        // best-effort; closed sockets get cleaned up on their own.
      }
    }
  };

  const closeInternal = async (): Promise<void> => {
    cancelShutdownTimer();
    broadcastShutdownEvent();
    // Give the browser a tick to actually receive the SSE frame before we rip
    // its socket out from under it. Without this the network stack will
    // sometimes drop the in-flight bytes when we call closeAllConnections().
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
    for (const client of sseClients) {
      try {
        client.end();
      } catch {
        // ignore
      }
    }
    sseClients.clear();
    try {
      httpServer.closeAllConnections?.();
    } catch {
      // ignore
    }
    await new Promise<void>((resolve, reject) => {
      httpServer.close((error) => (error ? reject(error) : resolve()));
    });
  };

  const serveStatic = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const rawUrl = req.url ?? '/';
    const pathname = rawUrl.split('?')[0];
    const stripped = stripSessionPrefix(pathname, sessionId);
    if (stripped === null) {
      res.statusCode = 403;
      res.setHeader('content-type', 'text/plain; charset=utf-8');
      res.end('Forbidden: session id missing or invalid.\n');
      return;
    }

    if (stripped === '/' || stripped === '/index.html') {
      try {
        const raw = await fs.readFile(path.join(options.webviewDistDir, 'overview.html'), 'utf-8');
        const html = injectBootstrap(raw, bootstrap);
        res.statusCode = 200;
        res.setHeader('content-type', MIME_TYPES['.html']);
        res.setHeader('cache-control', 'no-store');
        res.end(html);
      } catch (error) {
        res.statusCode = 500;
        res.end(`Failed to load overview.html: ${(error as Error).message}\n`);
      }
      return;
    }

    if (stripped === '/events') {
      res.statusCode = 200;
      res.setHeader('content-type', 'text/event-stream; charset=utf-8');
      res.setHeader('cache-control', 'no-store');
      res.setHeader('connection', 'keep-alive');
      // Flush a comment to nudge intermediaries (corporate proxies) into
      // releasing the response headers immediately.
      res.write(': ccwf-preview connected\n\n');
      sseClients.add(res);
      hasEverConnected = true;
      // A new client is keeping the server alive; cancel any pending auto-shutdown.
      cancelShutdownTimer();
      const heartbeat = setInterval(() => {
        try {
          res.write(': heartbeat\n\n');
        } catch {
          // best-effort
        }
      }, 30000);
      req.on('close', () => {
        clearInterval(heartbeat);
        sseClients.delete(res);
        // Last browser left? Start the auto-shutdown countdown.
        armShutdownTimerIfIdle();
      });
      return;
    }

    const relative = stripped.replace(/^\/+/, '');
    const target = path.resolve(options.webviewDistDir, relative);
    if (!isWithinDirectory(options.webviewDistDir, target)) {
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
  };

  const httpServer: Server = createServer((req, res) => {
    serveStatic(req, res).catch((error) => {
      res.statusCode = 500;
      res.end(`Server error: ${(error as Error).message}\n`);
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
    throw new Error('Preview server did not return an inet address.');
  }
  const port = address.port;

  return {
    host: displayHost,
    port,
    sessionId,
    url: `http://${displayHost}:${port}/${sessionId}/`,
    setBootstrap(next) {
      bootstrap = next;
    },
    broadcastWorkflowChanged() {
      const message = 'event: workflow-changed\ndata: {}\n\n';
      for (const client of sseClients) {
        try {
          client.write(message);
        } catch {
          // best-effort; closed sockets get cleaned up on their own.
        }
      }
    },
    async close() {
      shuttingDown = true;
      await closeInternal();
    },
  };
}
