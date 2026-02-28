/**
 * Claude Code Workflow Studio - Health Server Service
 *
 * Provides a simple HTTP server exposing a /health endpoint for monitoring
 * and integration testing. The server starts on extension activation and
 * shuts down on deactivation.
 *
 * Endpoint:
 *   GET /health → 200 OK
 *   {
 *     "status": "ok",
 *     "name": "cc-wf-studio",
 *     "version": "<extension-version>",
 *     "timestamp": "<ISO-8601>"
 *   }
 *
 * Default port: 3456 (configurable via constructor)
 */

import * as http from 'node:http';
import { log } from '../extension';

/**
 * Response body returned by the /health endpoint
 */
export interface HealthResponse {
  /** Overall health status */
  status: 'ok';
  /** Extension name */
  name: string;
  /** Extension version */
  version: string;
  /** ISO 8601 timestamp of the response */
  timestamp: string;
}

/**
 * Health Server Service
 *
 * Starts a lightweight HTTP server that exposes a /health endpoint.
 * Intended for use by monitoring tools, CI pipelines, and integration tests.
 */
export class HealthServerService {
  private server: http.Server | null = null;
  private readonly port: number;
  private readonly name: string;
  private readonly version: string;

  /**
   * @param name    - Extension name (from package.json `name` field)
   * @param version - Extension version (from package.json `version` field)
   * @param port    - Port to listen on (default: 3456)
   */
  constructor(name: string, version: string, port = 3456) {
    this.name = name;
    this.version = version;
    this.port = port;
  }

  /**
   * Starts the health HTTP server.
   *
   * Resolves when the server is listening.
   * Rejects if the port is already in use or the server fails to start.
   */
  start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.on('error', (err) => {
        log('ERROR', 'Health server error', { error: err.message });
        reject(err);
      });

      this.server.listen(this.port, '127.0.0.1', () => {
        log('INFO', `Health server listening on http://127.0.0.1:${this.port}/health`);
        resolve();
      });
    });
  }

  /**
   * Stops the health HTTP server.
   *
   * Resolves when the server has closed all connections.
   */
  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((err) => {
        if (err) {
          log('WARN', 'Health server stop error', { error: err.message });
        } else {
          log('INFO', 'Health server stopped');
        }
        this.server = null;
        resolve();
      });
    });
  }

  /**
   * Routes an incoming HTTP request.
   *
   * Only GET /health is handled; all other requests receive 404.
   */
  private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
    if (req.method === 'GET' && req.url === '/health') {
      this.handleHealth(res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not Found' }));
    }
  }

  /**
   * Responds to GET /health with a 200 OK and a HealthResponse JSON body.
   */
  private handleHealth(res: http.ServerResponse): void {
    const body: HealthResponse = {
      status: 'ok',
      name: this.name,
      version: this.version,
      timestamp: new Date().toISOString(),
    };

    const json = JSON.stringify(body);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(json),
    });
    res.end(json);

    log('INFO', 'Health check request served');
  }
}
