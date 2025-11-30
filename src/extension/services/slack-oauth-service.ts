/**
 * Slack OAuth Service
 *
 * Manages the OAuth 2.0 authentication flow for Slack.
 * Uses an external OAuth server (cc-wf-studio-connectors) to handle
 * authorization code exchange to protect client_secret.
 *
 * Flow:
 * 1. Generate session_id and build authorization URL
 * 2. Open browser for user to authenticate with Slack
 * 3. OAuth server receives callback, stores code in KV
 * 4. Poll OAuth server for authorization code
 * 5. Request token exchange from OAuth server
 * 6. Receive access_token and store in VSCode Secret Storage
 */

import * as vscode from 'vscode';
import { log } from '../extension';

/**
 * OAuth configuration
 */
const OAUTH_CONFIG = {
  /** OAuth server base URL */
  serverUrl: 'https://cc-wf-studio.com',
  /** Slack OAuth Client ID (public) */
  slackClientId: '9964370319943.10022663519665',
  /** Required Slack Bot Token scopes */
  scopes: 'chat:write,files:read,files:write',
  /** Required Slack User Token scopes (for channel listing) */
  userScopes: 'channels:read,groups:read,users:read',
  /** Initial polling interval in milliseconds */
  pollingIntervalInitialMs: 1000,
  /** Maximum polling interval in milliseconds */
  pollingIntervalMaxMs: 5000,
  /** Polling interval multiplier for exponential backoff */
  pollingIntervalMultiplier: 1.5,
  /** Polling timeout in milliseconds (5 minutes) */
  pollingTimeoutMs: 5 * 60 * 1000,
} as const;

/**
 * OAuth initiation result
 */
export interface OAuthInitiation {
  sessionId: string;
  authorizationUrl: string;
}

/**
 * OAuth token exchange response from server
 */
export interface SlackOAuthTokenResponse {
  ok: boolean;
  access_token?: string;
  bot_user_id?: string; // Bot User ID (for membership check)
  team?: {
    id: string;
    name: string;
  };
  authed_user?: {
    id: string;
    access_token?: string; // User Token (xoxp-...)
  };
  scope?: string;
  error?: string;
}

/**
 * Poll response from OAuth server
 */
interface PollResponse {
  status: 'pending' | 'completed' | 'success' | 'expired';
  code?: string;
  error?: string;
}

/**
 * Generates a cryptographically secure session ID
 */
function generateSessionId(): string {
  const array = new Uint8Array(32);
  // Use Node.js crypto for VSCode extension
  const crypto = require('node:crypto');
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Session initialization response from OAuth server
 */
interface SessionInitResponse {
  ok: boolean;
  session_id?: string;
  error?: string;
}

/**
 * Slack OAuth Service
 *
 * Handles the complete OAuth flow for Slack authentication.
 */
export class SlackOAuthService {
  private abortController: AbortController | null = null;

  /**
   * Registers a session with the OAuth server before starting the flow
   *
   * @param sessionId - The session ID to register
   * @throws Error if session registration fails
   */
  private async registerSession(sessionId: string): Promise<void> {
    log('INFO', 'Registering OAuth session with server', { sessionId });

    const response = await fetch(`${OAUTH_CONFIG.serverUrl}/slack/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ session_id: sessionId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('ERROR', 'Session registration failed', { status: response.status, error: errorText });
      throw new Error(`Session registration failed: ${response.status}`);
    }

    const data = (await response.json()) as SessionInitResponse;

    if (!data.ok) {
      log('ERROR', 'OAuth server rejected session', { error: data.error });
      throw new Error(data.error || 'Session registration failed');
    }

    log('INFO', 'OAuth session registered successfully', { sessionId });
  }

  /**
   * Starts the OAuth authentication flow
   *
   * This method now registers the session with the OAuth server before
   * returning the authorization URL.
   *
   * @returns OAuth initiation details (sessionId and authorizationUrl)
   * @throws Error if session registration fails
   */
  async initiateOAuthFlow(): Promise<OAuthInitiation> {
    const sessionId = generateSessionId();
    const redirectUri = `${OAUTH_CONFIG.serverUrl}/slack/callback`;

    // Register session with OAuth server before opening browser
    await this.registerSession(sessionId);

    const authorizationUrl = new URL('https://slack.com/oauth/v2/authorize');
    authorizationUrl.searchParams.set('client_id', OAUTH_CONFIG.slackClientId);
    authorizationUrl.searchParams.set('scope', OAUTH_CONFIG.scopes);
    authorizationUrl.searchParams.set('user_scope', OAUTH_CONFIG.userScopes);
    authorizationUrl.searchParams.set('redirect_uri', redirectUri);
    authorizationUrl.searchParams.set('state', sessionId);

    log('INFO', 'OAuth flow initiated', { sessionId });

    return {
      sessionId,
      authorizationUrl: authorizationUrl.toString(),
    };
  }

  /**
   * Polls the OAuth server for the authorization code
   *
   * @param sessionId - The session ID to poll for
   * @returns The authorization code if found, null if cancelled or timed out
   */
  async pollForCode(sessionId: string): Promise<{ code: string } | null> {
    const startTime = Date.now();
    this.abortController = new AbortController();
    const { signal } = this.abortController;
    let currentInterval: number = OAUTH_CONFIG.pollingIntervalInitialMs;

    log('INFO', 'Starting OAuth code polling', { sessionId });

    while (Date.now() - startTime < OAUTH_CONFIG.pollingTimeoutMs) {
      if (signal.aborted) {
        log('INFO', 'OAuth polling cancelled', { sessionId });
        return null;
      }

      try {
        const response = await fetch(`${OAUTH_CONFIG.serverUrl}/slack/poll?session=${sessionId}`, {
          signal,
        });

        if (!response.ok) {
          throw new Error(`Poll request failed: ${response.status}`);
        }

        const data = (await response.json()) as PollResponse;

        if ((data.status === 'completed' || data.status === 'success') && data.code) {
          log('INFO', 'OAuth code received', { sessionId });
          return { code: data.code };
        }

        if (data.status === 'expired') {
          log('WARN', 'OAuth session expired', { sessionId });
          return null;
        }

        // Wait before next poll with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, currentInterval));
        currentInterval = Math.min(
          currentInterval * OAUTH_CONFIG.pollingIntervalMultiplier,
          OAUTH_CONFIG.pollingIntervalMaxMs
        );
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          log('INFO', 'OAuth polling aborted', { sessionId });
          return null;
        }

        log('WARN', 'OAuth poll request failed, retrying', {
          sessionId,
          error: error instanceof Error ? error.message : String(error),
        });

        // Wait before retry with exponential backoff
        await new Promise((resolve) => setTimeout(resolve, currentInterval));
        currentInterval = Math.min(
          currentInterval * OAUTH_CONFIG.pollingIntervalMultiplier,
          OAUTH_CONFIG.pollingIntervalMaxMs
        );
      }
    }

    log('WARN', 'OAuth polling timed out', { sessionId });
    return null;
  }

  /**
   * Exchanges the authorization code for an access token
   *
   * @param code - The authorization code from Slack
   * @returns The token response from Slack
   */
  async exchangeCodeForToken(code: string): Promise<SlackOAuthTokenResponse> {
    const redirectUri = `${OAUTH_CONFIG.serverUrl}/slack/callback`;

    log('INFO', 'Exchanging OAuth code for token');

    const response = await fetch(`${OAUTH_CONFIG.serverUrl}/slack/exchange`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      log('ERROR', 'Token exchange failed', { status: response.status, error: errorText });
      throw new Error(`Token exchange failed: ${response.status}`);
    }

    const data = (await response.json()) as SlackOAuthTokenResponse;

    if (!data.ok) {
      log('ERROR', 'Slack OAuth error', { error: data.error });
      throw new Error(data.error || 'OAuth token exchange failed');
    }

    log('INFO', 'OAuth token exchange successful', {
      teamId: data.team?.id,
      teamName: data.team?.name,
    });

    return data;
  }

  /**
   * Cancels any ongoing OAuth polling
   */
  cancelPolling(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
      log('INFO', 'OAuth polling cancelled by user');
    }
  }

  /**
   * Opens the authorization URL in the default browser
   *
   * @param authorizationUrl - The Slack OAuth authorization URL
   */
  async openAuthorizationUrl(authorizationUrl: string): Promise<void> {
    await vscode.env.openExternal(vscode.Uri.parse(authorizationUrl));
    log('INFO', 'Opened OAuth authorization URL in browser');
  }
}
