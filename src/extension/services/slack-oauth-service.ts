/**
 * Slack OAuth Service
 *
 * Manages Slack OAuth authentication flow.
 * Handles authorization, token exchange, and token storage.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/slack-api-contracts.md
 */

import * as crypto from 'node:crypto';
import { WebClient } from '@slack/web-api';
import * as vscode from 'vscode';
import type { SlackWorkspaceConnection } from '../types/slack-integration-types';
import { NgrokService } from '../utils/ngrok-service';
import { OAuthCallbackServer } from '../utils/oauth-callback-server';
import { handleSlackError } from '../utils/slack-error-handler';
import { SlackTokenManager } from '../utils/slack-token-manager';

/**
 * Slack OAuth configuration
 *
 * Client ID and Secret should be provided via environment variables
 * or VSCode settings for security.
 */
export interface SlackOAuthConfig {
  /** Slack App Client ID */
  clientId: string;
  /** Slack App Client Secret */
  clientSecret: string;
  /** Required OAuth scopes */
  scopes: string[];
  /** Ngrok authtoken for creating HTTPS tunnels */
  ngrokAuthtoken?: string;
}

/**
 * Default required scopes for Slack integration
 */
const _DEFAULT_SCOPES = [
  'chat:write',
  'files:write',
  'files:read',
  'channels:read',
  'groups:read',
  'users:read',
];

/**
 * Slack OAuth Service
 *
 * Handles OAuth authentication flow with Slack.
 */
export class SlackOAuthService {
  private readonly tokenManager: SlackTokenManager;
  private readonly webClient: WebClient;

  constructor(
    readonly context: vscode.ExtensionContext,
    private readonly config: SlackOAuthConfig
  ) {
    this.tokenManager = new SlackTokenManager(context);
    this.webClient = new WebClient();
  }

  /**
   * Initiates OAuth authentication flow
   *
   * Steps:
   * 1. Generate random state for CSRF protection
   * 2. Start local callback server
   * 3. Open browser with OAuth authorization URL
   * 4. Wait for callback with authorization code
   * 5. Exchange code for access token
   * 6. Store token and workspace info
   *
   * @param existingRedirectUri - Optional existing HTTPS redirect URI (from ngrok tunnel)
   * @param existingLocalPort - Optional existing local port number (to reuse same port for callback server)
   * @returns Workspace connection info
   * @throws Error if authentication fails
   */
  async authenticate(
    existingRedirectUri?: string,
    existingLocalPort?: number
  ): Promise<SlackWorkspaceConnection> {
    try {
      // Step 1: Generate state parameter for CSRF protection
      const state = crypto.randomBytes(32).toString('hex');

      // Step 2: Start OAuth callback server and get URL
      const callbackServer = new OAuthCallbackServer();
      console.log('[Slack OAuth] Starting callback server on port:', existingLocalPort || 'random');
      const { callbackUrl, callbackPromise } = await callbackServer.startAndGetUrl(state, {
        timeoutMs: 5 * 60 * 1000, // 5 minutes
        port: existingLocalPort, // Use existing port if available
      });
      console.log('[Slack OAuth] Callback server started on:', callbackUrl);

      // Step 3: Use existing redirect URI or create new ngrok tunnel
      let httpsRedirectUri: string;
      let ngrokService: NgrokService | null = null;
      let shouldCleanupTunnel = false;

      if (existingRedirectUri) {
        // Use existing redirect URI (from GET_OAUTH_REDIRECT_URI)
        httpsRedirectUri = existingRedirectUri;
        console.log('[Slack OAuth] Using existing redirect URI:', httpsRedirectUri);
      } else {
        // Create new ngrok tunnel
        const localUrl = new URL(callbackUrl);
        const localPort = Number.parseInt(localUrl.port, 10);

        ngrokService = new NgrokService(this.config.ngrokAuthtoken);
        const ngrokTunnel = await ngrokService.createTunnel(localPort);
        httpsRedirectUri = `${ngrokTunnel.publicUrl}/oauth/callback`;
        shouldCleanupTunnel = true;

        // Log URLs for debugging and Slack App configuration
        console.log('[Slack OAuth] Local redirect URI:', callbackUrl);
        console.log('[Slack OAuth] HTTPS redirect URI:', httpsRedirectUri);
        console.log(
          '[Slack OAuth] ⚠️  Please add this URL to Slack App settings:\n' +
            '             OAuth & Permissions > Redirect URLs:\n' +
            `             ${httpsRedirectUri}`
        );
      }

      try {
        // Step 4: Build OAuth authorization URL with HTTPS URI
        const authUrl = this.buildAuthorizationUrl(httpsRedirectUri, state);

        // Open browser with OAuth URL
        const opened = await vscode.env.openExternal(vscode.Uri.parse(authUrl));
        if (!opened) {
          callbackServer.stop();
          if (shouldCleanupTunnel && ngrokService) {
            await ngrokService.closeTunnel();
          }
          throw new Error('ブラウザを開けませんでした');
        }

        // Show progress notification
        const result = await vscode.window.withProgress(
          {
            location: vscode.ProgressLocation.Notification,
            title: 'Slack認証',
            cancellable: true,
          },
          async (progress, token) => {
            progress.report({ message: 'ブラウザで認証を完了してください...' });

            // Wait for callback or cancellation
            return Promise.race([
              callbackPromise,
              new Promise<never>((_, reject) => {
                token.onCancellationRequested(() => {
                  callbackServer.stop();
                  if (shouldCleanupTunnel && ngrokService) {
                    ngrokService.closeTunnel();
                  }
                  reject(new Error('認証がキャンセルされました'));
                });
              }),
            ]);
          }
        );

        // Step 5: Exchange authorization code for access token
        const connection = await this.exchangeCodeForToken(result.code, httpsRedirectUri);

        // Step 6: Store connection
        await this.tokenManager.storeConnection(connection);

        // Clean up ngrok tunnel only if we created it
        if (shouldCleanupTunnel && ngrokService) {
          await ngrokService.closeTunnel();
        }

        return connection;
      } finally {
        // Ensure ngrok tunnel is closed even on error (only if we created it)
        if (shouldCleanupTunnel && ngrokService) {
          await ngrokService.closeTunnel();
        }
      }
    } catch (error) {
      const errorInfo = handleSlackError(error);
      throw new Error(errorInfo.message);
    }
  }

  /**
   * Validates current token
   *
   * @returns Workspace connection if valid, null if invalid
   */
  async validateToken(): Promise<SlackWorkspaceConnection | null> {
    try {
      const connection = await this.tokenManager.getConnection();
      if (!connection) {
        return null;
      }

      // Validate token with Slack auth.test API
      const client = new WebClient(connection.accessToken);
      const response = await client.auth.test();

      if (!response.ok) {
        // Token invalid, clear connection
        await this.tokenManager.clearConnection();
        return null;
      }

      // Update last validated timestamp
      await this.tokenManager.updateLastValidated();

      return connection;
    } catch (_error) {
      // Token validation failed, clear connection
      await this.tokenManager.clearConnection();
      return null;
    }
  }

  /**
   * Disconnects from Slack (clears token)
   */
  async disconnect(): Promise<void> {
    await this.tokenManager.clearConnection();
  }

  /**
   * Checks if connected to Slack
   *
   * @returns True if connected, false otherwise
   */
  async isConnected(): Promise<boolean> {
    return this.tokenManager.isConnected();
  }

  /**
   * Gets current workspace connection
   *
   * @returns Workspace connection if exists, null otherwise
   */
  async getConnection(): Promise<SlackWorkspaceConnection | null> {
    return this.tokenManager.getConnection();
  }

  /**
   * Builds OAuth authorization URL
   *
   * @param redirectUri - OAuth callback URL
   * @param state - CSRF protection state
   * @returns Authorization URL
   */
  private buildAuthorizationUrl(redirectUri: string, state: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      scope: this.config.scopes.join(','),
      redirect_uri: redirectUri,
      state,
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  /**
   * Exchanges authorization code for access token
   *
   * @param code - Authorization code from callback
   * @param redirectUri - OAuth callback URL (must match authorization)
   * @returns Workspace connection info
   */
  private async exchangeCodeForToken(
    code: string,
    redirectUri: string
  ): Promise<SlackWorkspaceConnection> {
    try {
      // Call oauth.v2.access endpoint
      const response = await this.webClient.oauth.v2.access({
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code,
        redirect_uri: redirectUri,
      });

      if (!response.ok) {
        throw new Error('トークン取得に失敗しました');
      }

      // Extract workspace connection info
      const accessToken = response.access_token as string;
      const teamId = response.team?.id as string;
      const teamName = response.team?.name as string;
      const userId = response.authed_user?.id as string;
      const scope = (response.scope as string) || '';
      const tokenScope = scope.split(',').map((s) => s.trim());

      // Validate token format
      if (!SlackTokenManager.validateTokenFormat(accessToken)) {
        throw new Error('無効なトークン形式です');
      }

      // Validate required scopes
      const missingScopes = SlackTokenManager.getMissingScopes(tokenScope);
      if (missingScopes.length > 0) {
        throw new Error(`必要なスコープがありません: ${missingScopes.join(', ')}`);
      }

      return {
        workspaceId: teamId,
        workspaceName: teamName,
        teamId,
        accessToken,
        tokenScope,
        userId,
        authorizedAt: new Date(),
      };
    } catch (error) {
      const errorInfo = handleSlackError(error);
      throw new Error(errorInfo.message);
    }
  }
}
