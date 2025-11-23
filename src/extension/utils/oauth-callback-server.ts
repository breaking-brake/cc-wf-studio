/**
 * OAuth Callback Server
 *
 * Ephemeral HTTP server for OAuth callback handling.
 * Starts on random port, listens for OAuth redirect, then shuts down.
 *
 * Based on specs/001-slack-workflow-sharing/slack-api-contracts.md
 */

import * as http from 'node:http';
import * as url from 'node:url';

/**
 * OAuth callback result
 */
export interface OAuthCallbackResult {
  /** Authorization code from Slack */
  code: string;
  /** State parameter (CSRF protection) */
  state: string;
}

/**
 * OAuth callback error
 */
export interface OAuthCallbackError {
  /** Error code from Slack */
  error: string;
  /** Error description (if provided) */
  errorDescription?: string;
}

/**
 * OAuth callback server options
 */
export interface OAuthCallbackServerOptions {
  /** Timeout in milliseconds (default: 5 minutes) */
  timeoutMs?: number;
  /** Success HTML page */
  successPage?: string;
  /** Error HTML page */
  errorPage?: string;
  /** Port number (default: 0 for random port) */
  port?: number;
}

/**
 * Default success page HTML
 */
const DEFAULT_SUCCESS_PAGE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Slack Authentication Successful</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            backdrop-filter: blur(10px);
        }
        h1 { margin: 0 0 1rem 0; font-size: 2rem; }
        p { margin: 0.5rem 0; font-size: 1.1rem; opacity: 0.9; }
        .checkmark {
            font-size: 4rem;
            animation: scaleIn 0.5s ease-out;
        }
        @keyframes scaleIn {
            0% { transform: scale(0); }
            50% { transform: scale(1.2); }
            100% { transform: scale(1); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">✓</div>
        <h1>Authentication Successful</h1>
        <p>You can close this window and return to VS Code.</p>
    </div>
</body>
</html>
`;

/**
 * Default error page HTML
 */
const DEFAULT_ERROR_PAGE = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Slack Authentication Failed</title>
    <style>
        body {
            font-family: system-ui, -apple-system, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 2rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 1rem;
            backdrop-filter: blur(10px);
        }
        h1 { margin: 0 0 1rem 0; font-size: 2rem; }
        p { margin: 0.5rem 0; font-size: 1.1rem; opacity: 0.9; }
        .error-icon { font-size: 4rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="error-icon">✗</div>
        <h1>Authentication Failed</h1>
        <p>{{ERROR_MESSAGE}}</p>
        <p>You can close this window and try again in VS Code.</p>
    </div>
</body>
</html>
`;

/**
 * OAuth callback server
 *
 * Starts an ephemeral HTTP server on a random port to handle OAuth redirects.
 */
export class OAuthCallbackServer {
  private server: http.Server | null = null;
  private port = 0;

  /**
   * Starts the OAuth callback server
   *
   * @param expectedState - Expected state value for CSRF protection
   * @param options - Server options
   * @returns Promise resolving to OAuth callback result or error
   */
  async start(
    expectedState: string,
    options: OAuthCallbackServerOptions = {}
  ): Promise<OAuthCallbackResult> {
    const {
      timeoutMs = 5 * 60 * 1000, // 5 minutes default
      successPage = DEFAULT_SUCCESS_PAGE,
      errorPage = DEFAULT_ERROR_PAGE,
    } = options;

    return new Promise<OAuthCallbackResult>((resolve, reject) => {
      // Timeout timer
      const timeoutTimer = setTimeout(() => {
        this.stop();
        reject(new Error('OAuth callback timeout'));
      }, timeoutMs);

      // Request handler
      const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
        // Parse query parameters
        const parsedUrl = url.parse(req.url || '', true);
        const query = parsedUrl.query;

        // Check for error response
        if (query.error) {
          const error: OAuthCallbackError = {
            error: query.error as string,
            errorDescription: query.error_description as string | undefined,
          };

          // Send error page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(errorPage.replace('{{ERROR_MESSAGE}}', error.errorDescription || error.error));

          // Clean up and reject
          clearTimeout(timeoutTimer);
          this.stop();
          reject(new Error(`OAuth error: ${error.error}`));
          return;
        }

        // Check for success response
        if (query.code && query.state) {
          const code = query.code as string;
          const state = query.state as string;

          // Validate state (CSRF protection)
          if (state !== expectedState) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(
              errorPage.replace('{{ERROR_MESSAGE}}', 'Invalid state parameter (CSRF protection)')
            );

            clearTimeout(timeoutTimer);
            this.stop();
            reject(new Error('OAuth state mismatch (CSRF protection)'));
            return;
          }

          // Send success page
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(successPage);

          // Clean up and resolve
          clearTimeout(timeoutTimer);
          this.stop();
          resolve({ code, state });
          return;
        }

        // Invalid request
        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(errorPage.replace('{{ERROR_MESSAGE}}', 'Invalid OAuth callback'));
      };

      // Create server
      this.server = http.createServer(requestHandler);

      // Listen on random port (0 = OS assigns random port)
      this.server.listen(0, 'localhost', () => {
        const address = this.server?.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
        }
      });

      // Handle server errors
      this.server.on('error', (err) => {
        clearTimeout(timeoutTimer);
        this.stop();
        reject(err);
      });
    });
  }

  /**
   * Gets the callback URL
   *
   * @returns Callback URL (e.g., http://localhost:12345/oauth/callback)
   */
  getCallbackUrl(): string {
    if (this.port === 0) {
      throw new Error('Server not started');
    }
    return `http://localhost:${this.port}/oauth/callback`;
  }

  /**
   * Gets the server port
   *
   * @returns Server port number
   */
  getPort(): number {
    return this.port;
  }

  /**
   * Starts the OAuth callback server and returns URL immediately
   *
   * This starts the server with OAuth handling and returns the callback URL
   * as soon as the server is listening (without waiting for OAuth callback).
   *
   * @param expectedState - Expected state value for CSRF protection
   * @param options - Server options
   * @returns Promise resolving to callback URL and callback promise
   */
  async startAndGetUrl(
    expectedState: string,
    options: OAuthCallbackServerOptions = {}
  ): Promise<{ callbackUrl: string; callbackPromise: Promise<OAuthCallbackResult> }> {
    const {
      timeoutMs = 5 * 60 * 1000,
      successPage = DEFAULT_SUCCESS_PAGE,
      errorPage = DEFAULT_ERROR_PAGE,
      port = 0, // 0 = random port
    } = options;

    return new Promise((resolve, reject) => {
      // Timeout timer
      const timeoutTimer = setTimeout(() => {
        this.stop();
        reject(new Error('OAuth callback timeout'));
      }, timeoutMs);

      // Request handler
      const requestHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
        const parsedUrl = url.parse(req.url || '', true);
        const query = parsedUrl.query;

        if (query.error) {
          const error: OAuthCallbackError = {
            error: query.error as string,
            errorDescription: query.error_description as string | undefined,
          };

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(errorPage.replace('{{ERROR_MESSAGE}}', error.errorDescription || error.error));

          clearTimeout(timeoutTimer);
          this.stop();
          return;
        }

        if (query.code && query.state) {
          const state = query.state as string;

          if (state !== expectedState) {
            res.writeHead(400, { 'Content-Type': 'text/html' });
            res.end(
              errorPage.replace('{{ERROR_MESSAGE}}', 'Invalid state parameter (CSRF protection)')
            );

            clearTimeout(timeoutTimer);
            this.stop();
            return;
          }

          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(successPage);

          clearTimeout(timeoutTimer);
          this.stop();
          return;
        }

        res.writeHead(400, { 'Content-Type': 'text/html' });
        res.end(errorPage.replace('{{ERROR_MESSAGE}}', 'Invalid OAuth callback'));
      };

      // Create callback promise (will resolve when OAuth callback arrives)
      const callbackPromise = new Promise<OAuthCallbackResult>(
        (resolveCallback, rejectCallback) => {
          const originalHandler = requestHandler;
          const wrappedHandler = (req: http.IncomingMessage, res: http.ServerResponse) => {
            const parsedUrl = url.parse(req.url || '', true);
            const query = parsedUrl.query;

            if (query.error) {
              rejectCallback(new Error(`OAuth error: ${query.error}`));
            } else if (query.code && query.state) {
              const code = query.code as string;
              const state = query.state as string;

              if (state !== expectedState) {
                rejectCallback(new Error('OAuth state mismatch (CSRF protection)'));
              } else {
                resolveCallback({ code, state });
              }
            }

            originalHandler(req, res);
          };

          this.server = http.createServer(wrappedHandler);
        }
      );

      // Listen on specified port (0 = random port)
      // Note: this.server is guaranteed to be non-null here as it's assigned in the Promise constructor above
      if (!this.server) {
        reject(new Error('Server initialization failed'));
        return;
      }

      this.server.listen(port, 'localhost', () => {
        const address = this.server?.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
          resolve({
            callbackUrl: this.getCallbackUrl(),
            callbackPromise,
          });
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      this.server.on('error', (err) => {
        clearTimeout(timeoutTimer);
        this.stop();
        reject(err);
      });
    });
  }

  /**
   * Initializes server and returns callback URL without waiting for OAuth
   *
   * This is useful for getting the redirect URI for development/configuration purposes.
   * Server is started to get a dynamic port, then immediately available for URL retrieval.
   *
   * @returns Promise resolving to callback URL
   */
  async initializeForUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      // Create minimal server (no OAuth handling needed)
      this.server = http.createServer((_req, res) => {
        res.writeHead(200);
        res.end('OK');
      });

      // Listen on random port
      this.server.listen(0, 'localhost', () => {
        const address = this.server?.address();
        if (address && typeof address !== 'string') {
          this.port = address.port;
          resolve(this.getCallbackUrl());
        } else {
          reject(new Error('Failed to get server address'));
        }
      });

      // Handle server errors
      this.server.on('error', (err) => {
        this.stop();
        reject(err);
      });
    });
  }

  /**
   * Stops the server
   */
  stop(): void {
    if (this.server) {
      this.server.close();
      this.server = null;
      this.port = 0;
    }
  }
}
