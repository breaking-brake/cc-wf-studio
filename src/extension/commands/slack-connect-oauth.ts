/**
 * Slack OAuth Connection Command Handler
 *
 * Handles OAuth 2.0 authentication flow for Slack.
 * Works with the external OAuth server (cc-wf-studio-connectors) to securely
 * exchange authorization codes for access tokens.
 *
 * Based on specs/001-slack-workflow-sharing OAuth implementation plan
 */

import * as vscode from 'vscode';
import { log } from '../extension';
import type { SlackApiService } from '../services/slack-api-service';
import { SlackOAuthService } from '../services/slack-oauth-service';
import type { SlackTokenManager } from '../utils/slack-token-manager';

/**
 * OAuth connection result
 */
export interface OAuthConnectionResult {
  workspaceId: string;
  workspaceName: string;
}

/**
 * Handle Slack OAuth connection command
 *
 * Initiates OAuth flow, polls for authorization code, and exchanges it for tokens.
 *
 * @param tokenManager - Token manager instance for storing credentials
 * @param slackApiService - Slack API service instance
 * @param onProgress - Optional callback for progress updates
 * @returns Workspace info if successful, undefined otherwise
 */
export async function handleConnectSlackOAuth(
  tokenManager: SlackTokenManager,
  slackApiService: SlackApiService,
  oauthService: SlackOAuthService,
  onProgress?: (
    status: 'initiated' | 'polling' | 'exchanging' | 'success' | 'cancelled' | 'failed'
  ) => void
): Promise<OAuthConnectionResult | undefined> {
  try {
    log('INFO', 'Slack OAuth connection started');
    onProgress?.('initiated');

    // Step 1: Initialize OAuth flow (registers session with OAuth server)
    const { sessionId, authorizationUrl } = await oauthService.initiateOAuthFlow();

    // Step 2: Open browser for user authentication
    await oauthService.openAuthorizationUrl(authorizationUrl);

    // Step 3: Show progress message
    const progressMessage = vscode.window.setStatusBarMessage(
      '$(loading~spin) Waiting for Slack authentication...'
    );

    try {
      onProgress?.('polling');

      // Step 4: Poll for authorization code
      const codeResult = await oauthService.pollForCode(sessionId);

      if (!codeResult) {
        log('INFO', 'OAuth flow cancelled or timed out');
        onProgress?.('cancelled');
        vscode.window.showWarningMessage('Slack authentication was cancelled or timed out.');
        return undefined;
      }

      onProgress?.('exchanging');

      // Step 5: Exchange code for token
      const tokenResponse = await oauthService.exchangeCodeForToken(codeResult.code);

      if (!tokenResponse.access_token || !tokenResponse.team) {
        throw new Error('Invalid token response from OAuth server');
      }

      // Step 6: Clear existing connections and store new one
      await tokenManager.clearConnection();

      await tokenManager.storeManualConnection(
        tokenResponse.team.id,
        tokenResponse.team.name,
        tokenResponse.team.id,
        tokenResponse.access_token,
        tokenResponse.authed_user?.id || ''
      );

      // Step 7: Invalidate Slack API client cache
      slackApiService.invalidateClient();

      log('INFO', 'Slack OAuth connection completed successfully', {
        workspaceId: tokenResponse.team.id,
        workspaceName: tokenResponse.team.name,
      });

      onProgress?.('success');

      vscode.window.showInformationMessage(
        `Successfully connected to Slack workspace "${tokenResponse.team.name}"!`
      );

      return {
        workspaceId: tokenResponse.team.id,
        workspaceName: tokenResponse.team.name,
      };
    } finally {
      progressMessage.dispose();
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    log('ERROR', 'Slack OAuth connection failed', { error: errorMessage });
    onProgress?.('failed');

    vscode.window.showErrorMessage(`Failed to connect to Slack: ${errorMessage}`);
    return undefined;
  }
}

/**
 * Creates an OAuth service instance for cancellation support
 *
 * Use this when you need to handle cancellation from UI.
 *
 * @returns SlackOAuthService instance
 */
export function createOAuthService(): SlackOAuthService {
  return new SlackOAuthService();
}
