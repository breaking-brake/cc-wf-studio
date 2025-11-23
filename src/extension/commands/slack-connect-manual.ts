/**
 * Slack Manual Token Input Command Handler
 *
 * Handles manual Slack Bot Token input from users.
 * Users manually create Slack App and provide Bot Token only.
 * Workspace ID and Workspace Name are automatically retrieved via auth.test API.
 * Author name comes from git config (not Slack user).
 *
 * Based on specs/001-slack-workflow-sharing/tasks.md Phase 8
 */

import { WebClient } from '@slack/web-api';
import * as vscode from 'vscode';
import { log } from '../extension';
import type { SlackApiService } from '../services/slack-api-service';
import { handleSlackError } from '../utils/slack-error-handler';
import type { SlackTokenManager } from '../utils/slack-token-manager';

/**
 * Handle manual Slack connection command
 *
 * Prompts user for workspace information and Bot Token,
 * validates the token, and stores it in VSCode Secret Storage.
 *
 * @param tokenManager - Token manager instance
 * @param slackApiService - Slack API service instance
 * @param botToken - Optional Bot Token (if provided, skip Input Box prompt)
 * @returns Workspace info if successful
 */
export async function handleConnectSlackManual(
  tokenManager: SlackTokenManager,
  slackApiService: SlackApiService,
  botToken?: string
): Promise<{ workspaceId: string; workspaceName: string } | undefined> {
  try {
    log('INFO', 'Manual Slack connection started');

    // Step 1: Get Bot Token (from parameter or Input Box)
    let accessToken = botToken;

    if (!accessToken) {
      // Prompt for Bot Token via Input Box (VSCode command path)
      accessToken = await vscode.window.showInputBox({
        prompt: 'Enter Bot User OAuth Token (starts with "xoxb-")',
        placeHolder: 'xoxb-...',
        password: true, // Hide input
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'Bot Token is required';
          }
          if (!value.startsWith('xoxb-')) {
            return 'Bot Token must start with "xoxb-" (User Tokens "xoxp-" are not supported)';
          }
          return null;
        },
      });

      if (!accessToken) {
        log('INFO', 'Manual connection cancelled: No token provided');
        return; // User cancelled
      }
    }

    // Validate token format (for Webview path)
    if (!accessToken.startsWith('xoxb-')) {
      throw new Error('Bot Token must start with "xoxb-" (User Tokens "xoxp-" are not supported)');
    }

    // Step 2: Validate token and retrieve workspace info from Slack API (auth.test)
    log('INFO', 'Validating token with Slack API');

    const client = new WebClient(accessToken);
    const authResponse = await client.auth.test();

    if (!authResponse.ok) {
      throw new Error('Token validation failed: Invalid token');
    }

    // Extract workspace information from auth.test response
    const workspaceId = authResponse.team_id as string;
    const workspaceName = authResponse.team as string;

    log('INFO', 'Token validation successful', {
      workspaceId,
      workspaceName,
    });

    // Step 3: Store connection in VSCode Secret Storage
    await tokenManager.storeManualConnection(
      workspaceId,
      workspaceName,
      workspaceId, // teamId is same as workspaceId
      accessToken,
      '' // userId is no longer used (author name comes from git config)
    );

    log('INFO', 'Manual Slack connection stored successfully', {
      workspaceId,
      workspaceName,
    });

    // Step 7: Show success message (only when called from VSCode command)
    if (!botToken) {
      const viewDocumentation = 'View Documentation';
      const result = await vscode.window.showInformationMessage(
        `Successfully connected to Slack workspace "${workspaceName}"!`,
        viewDocumentation
      );

      if (result === viewDocumentation) {
        await vscode.env.openExternal(
          vscode.Uri.parse('https://github.com/your-repo/docs/slack-manual-token-setup.md')
        );
      }
    }

    // Invalidate SlackApiService client cache to force re-initialization
    slackApiService.invalidateClient(workspaceId);

    log('INFO', 'Manual Slack connection completed successfully');

    // Return workspace info for Webview callers
    return {
      workspaceId,
      workspaceName,
    };
  } catch (error) {
    const errorInfo = handleSlackError(error);

    log('ERROR', 'Manual Slack connection failed', {
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
    });

    await vscode.window.showErrorMessage(`Failed to connect to Slack: ${errorInfo.message}`, 'OK');
  }
}
