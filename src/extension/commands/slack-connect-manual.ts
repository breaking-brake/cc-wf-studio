/**
 * Slack Manual Token Input Command Handler
 *
 * Handles manual Slack User Token input from users.
 * Users manually create Slack App and provide User Token only.
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
 * Prompts user for User Token, validates the token, and stores it in VSCode Secret Storage.
 * All Slack API operations use User Token to ensure user can only access channels
 * they are a member of.
 *
 * @param tokenManager - Token manager instance
 * @param slackApiService - Slack API service instance
 * @param userToken - Optional User Token (if provided, skip Input Box prompt)
 * @returns Workspace info if successful
 */
export async function handleConnectSlackManual(
  tokenManager: SlackTokenManager,
  slackApiService: SlackApiService,
  _botToken?: string, // @deprecated - kept for backward compatibility, ignored
  userToken?: string
): Promise<{ workspaceId: string; workspaceName: string } | undefined> {
  try {
    log('INFO', 'Manual Slack connection started');

    // Step 1: Get User Token (from parameter or Input Box)
    let userAccessToken = userToken;

    if (!userAccessToken) {
      // Prompt for User Token via Input Box (VSCode command path)
      userAccessToken = await vscode.window.showInputBox({
        prompt: 'Enter User OAuth Token (starts with "xoxp-")',
        placeHolder: 'xoxp-...',
        password: true, // Hide input
        validateInput: (value) => {
          if (!value || value.trim().length === 0) {
            return 'User Token is required';
          }
          if (!value.startsWith('xoxp-')) {
            return 'User Token must start with "xoxp-"';
          }
          return null;
        },
      });

      if (!userAccessToken) {
        log('INFO', 'Manual connection cancelled: No User Token provided');
        return; // User cancelled
      }
    }

    // Validate User token format (for Webview path)
    if (!userAccessToken.startsWith('xoxp-')) {
      throw new Error('User Token must start with "xoxp-"');
    }

    // Step 2: Validate User token and retrieve workspace info from Slack API (auth.test)
    log('INFO', 'Validating User token with Slack API');

    const client = new WebClient(userAccessToken);
    const authResponse = await client.auth.test();

    if (!authResponse.ok) {
      throw new Error('User Token validation failed: Invalid token');
    }

    // Extract workspace information from auth.test response
    const workspaceId = authResponse.team_id as string;
    const workspaceName = authResponse.team as string;

    log('INFO', 'User Token validation successful', {
      workspaceId,
      workspaceName,
    });

    // Step 3: Clear existing connections before storing new one (same as delete → create flow)
    await tokenManager.clearConnection();

    // Step 4: Store connection in VSCode Secret Storage (User Token only, no Bot Token)
    await tokenManager.storeManualConnection(
      workspaceId,
      workspaceName,
      workspaceId, // teamId is same as workspaceId
      '', // Bot Token is no longer used
      '', // userId is no longer used (author name comes from git config)
      userAccessToken
    );

    log('INFO', 'Manual Slack connection stored successfully', {
      workspaceId,
      workspaceName,
    });

    // Step 5: Show success message (only when called from VSCode command)
    if (!userToken) {
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
    slackApiService.invalidateClient();

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
      messageKey: errorInfo.messageKey,
    });

    // Note: This error message is shown via VSCode native dialog, not Webview i18n
    // The messageKey is logged for debugging, but we show a generic English message
    await vscode.window.showErrorMessage(
      `Failed to connect to Slack. Please check your token and try again.`,
      'OK'
    );
  }
}
