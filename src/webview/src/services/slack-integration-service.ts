/**
 * Slack Integration Service
 *
 * Handles communication with Extension Host for Slack-related operations.
 * Provides high-level APIs for workflow sharing, importing, and searching.
 *
 * Based on: specs/001-slack-workflow-sharing/contracts/extension-host-api-contracts.md
 */

import type { ExtensionMessage, Workflow } from '@shared/types/messages';
import { vscode } from '../main';

/**
 * Slack channel information
 */
export interface SlackChannel {
  id: string;
  name: string;
  isPrivate: boolean;
  isMember: boolean;
  memberCount?: number;
  purpose?: string;
  topic?: string;
}

/**
 * Slack workspace information
 */
export interface SlackWorkspace {
  workspaceId: string;
  workspaceName: string;
  teamId: string;
  authorizedAt: string;
  lastValidatedAt?: string;
}

/**
 * Workflow share options
 */
export interface ShareWorkflowOptions {
  workspaceId: string;
  workflowId: string;
  workflowName: string;
  workflow: Workflow;
  channelId: string;
  description?: string;
  overrideSensitiveWarning?: boolean;
}

/**
 * Sensitive data finding
 */
export interface SensitiveDataFinding {
  type: string;
  maskedValue: string;
  position: number;
  context?: string;
  severity: 'low' | 'medium' | 'high';
}

/**
 * Workflow import options
 */
export interface ImportWorkflowOptions {
  workflowId: string;
  fileId: string;
  sourceChannelId: string;
  sourceMessageTs: string;
  overwriteExisting?: boolean;
}

/**
 * Workflow search options
 */
export interface SearchWorkflowOptions {
  query?: string;
  channelId?: string;
  count?: number;
  sort?: 'score' | 'timestamp';
}

/**
 * Search result
 */
export interface SearchResult {
  messageTs: string;
  channelId: string;
  channelName: string;
  text: string;
  userId: string;
  permalink: string;
  fileId?: string;
  fileName?: string;
  fileUrl?: string;
}

/**
 * Connect to Slack workspace
 *
 * Opens OAuth authentication flow in browser.
 *
 * @returns Promise that resolves with workspace connection info
 */
export function connectToSlack(): Promise<{ workspaceName: string }> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SLACK_CONNECT_SUCCESS') {
          resolve(message.payload || { workspaceName: '' });
        } else if (message.type === 'SLACK_CONNECT_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to connect to Slack'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'SLACK_CONNECT',
      requestId,
      payload: {},
    });

    // Timeout after 5 minutes (OAuth flow can take time)
    setTimeout(
      () => {
        window.removeEventListener('message', handler);
        reject(new Error('Connection timeout'));
      },
      5 * 60 * 1000
    );
  });
}

/**
 * Reconnect to Slack workspace (force reconnection)
 *
 * Deletes existing OAuth token and re-authenticates with new scopes.
 * Useful when scopes have been updated in Slack App configuration.
 *
 * @returns Promise that resolves with workspace connection info
 */
export function reconnectToSlack(): Promise<{ workspaceName: string }> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SLACK_CONNECT_SUCCESS') {
          resolve(message.payload || { workspaceName: '' });
        } else if (message.type === 'SLACK_CONNECT_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to reconnect to Slack'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'SLACK_CONNECT',
      requestId,
      payload: { forceReconnect: true },
    });

    // Timeout after 5 minutes (OAuth flow can take time)
    setTimeout(
      () => {
        window.removeEventListener('message', handler);
        reject(new Error('Reconnection timeout'));
      },
      5 * 60 * 1000
    );
  });
}

/**
 * Disconnect from Slack workspace
 *
 * Clears stored OAuth token.
 *
 * @returns Promise that resolves when disconnected
 */
export function disconnectFromSlack(): Promise<void> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SLACK_DISCONNECT_SUCCESS') {
          resolve();
        } else if (message.type === 'SLACK_DISCONNECT_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to disconnect from Slack'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'SLACK_DISCONNECT',
      requestId,
      payload: {},
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, 10000);
  });
}

/**
 * Connect to Slack workspace manually with Bot Token and User Token
 *
 * Users need to provide both Bot Token (xoxb-...) and User Token (xoxp-...).
 * User Token is required for secure channel listing (only shows channels user is a member of).
 * Workspace info is automatically retrieved via auth.test API.
 *
 * @param botToken - Slack Bot User OAuth Token (xoxb-...)
 * @param userToken - Slack User OAuth Token (xoxp-...) for secure channel listing
 * @returns Promise that resolves with workspace info
 */
export function connectSlackManual(
  botToken: string,
  userToken: string
): Promise<{ workspaceId: string; workspaceName: string }> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'CONNECT_SLACK_MANUAL_SUCCESS') {
          resolve(
            message.payload || {
              workspaceId: '',
              workspaceName: '',
            }
          );
        } else if (message.type === 'CONNECT_SLACK_MANUAL_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to connect to Slack'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'CONNECT_SLACK_MANUAL',
      requestId,
      payload: { botToken, userToken },
    });

    setTimeout(
      () => {
        window.removeEventListener('message', handler);
        reject(new Error('Request timeout'));
      },
      30000 // 30 seconds timeout for API validation
    );
  });
}

/**
 * List connected Slack workspaces
 *
 * @returns Promise that resolves with workspace list
 */
export function listSlackWorkspaces(): Promise<SlackWorkspace[]> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'LIST_SLACK_WORKSPACES_SUCCESS') {
          resolve(message.payload?.workspaces || []);
        } else if (message.type === 'LIST_SLACK_WORKSPACES_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to list Slack workspaces'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'LIST_SLACK_WORKSPACES',
      requestId,
      payload: {},
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, 10000);
  });
}

/**
 * Get list of Slack channels for specific workspace
 *
 * @param workspaceId - Target workspace ID
 * @param includePrivate - Include private channels (default: true)
 * @param onlyMember - Only channels user is a member of (default: true)
 * @returns Promise that resolves with channel list
 */
export function getSlackChannels(
  workspaceId: string,
  includePrivate = true,
  onlyMember = true
): Promise<SlackChannel[]> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'GET_SLACK_CHANNELS_SUCCESS') {
          resolve(message.payload?.channels || []);
        } else if (message.type === 'GET_SLACK_CHANNELS_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to get Slack channels'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'GET_SLACK_CHANNELS',
      requestId,
      payload: {
        workspaceId,
        includePrivate,
        onlyMember,
      },
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

/**
 * Share workflow to Slack channel
 *
 * Uploads workflow file and posts rich message card.
 * May show sensitive data warning if detected.
 *
 * @param options - Share options
 * @returns Promise that resolves with share result or sensitive data warning
 */
export function shareWorkflowToSlack(options: ShareWorkflowOptions): Promise<{
  success: boolean;
  sensitiveDataWarning?: SensitiveDataFinding[];
  permalink?: string;
}> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SHARE_WORKFLOW_SUCCESS') {
          resolve({
            success: true,
            permalink: message.payload?.permalink,
          });
        } else if (message.type === 'SENSITIVE_DATA_WARNING') {
          resolve({
            success: false,
            sensitiveDataWarning: message.payload?.findings || [],
          });
        } else if (message.type === 'SHARE_WORKFLOW_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to share workflow'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'SHARE_WORKFLOW_TO_SLACK',
      requestId,
      payload: options,
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

/**
 * Import workflow from Slack
 *
 * Downloads workflow file from Slack and saves to local workspace.
 *
 * @param options - Import options
 * @returns Promise that resolves with imported workflow path
 */
export function importWorkflowFromSlack(
  options: ImportWorkflowOptions
): Promise<{ filePath: string }> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'IMPORT_WORKFLOW_SUCCESS') {
          resolve({ filePath: message.payload?.filePath || '' });
        } else if (message.type === 'IMPORT_WORKFLOW_FAILED') {
          reject(new Error(message.payload?.errorMessage || 'Failed to import workflow'));
        }
      }
    };

    window.addEventListener('message', handler);

    // Convert to ImportWorkflowFromSlackPayload format for Extension Host
    // Note: workspaceId is not available in ImportWorkflowOptions
    // Extension Host will use the currently active workspace
    vscode.postMessage({
      type: 'IMPORT_WORKFLOW_FROM_SLACK',
      requestId,
      payload: {
        workflowId: options.workflowId,
        fileId: options.fileId,
        channelId: options.sourceChannelId,
        messageTs: options.sourceMessageTs,
        workspaceId: '', // Will be determined by Extension Host
        overwriteExisting: options.overwriteExisting,
      },
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

/**
 * Search for workflows shared in Slack
 *
 * @param options - Search options
 * @returns Promise that resolves with search results
 */
export function searchSlackWorkflows(options: SearchWorkflowOptions): Promise<SearchResult[]> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'SEARCH_SLACK_WORKFLOWS_SUCCESS') {
          resolve(message.payload?.results || []);
        } else if (message.type === 'SEARCH_SLACK_WORKFLOWS_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to search Slack workflows'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'SEARCH_SLACK_WORKFLOWS',
      requestId,
      payload: options,
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, 30000);
  });
}

/**
 * OAuth progress callback type
 */
export type OAuthProgressCallback = (
  status: 'initiated' | 'polling' | 'success' | 'cancelled' | 'failed',
  data?: { sessionId?: string; authorizationUrl?: string }
) => void;

/**
 * Connect to Slack workspace via OAuth
 *
 * Opens OAuth authentication flow in browser.
 * Polls for authorization code and exchanges it for access token.
 *
 * @param onProgress - Optional callback for progress updates
 * @returns Promise that resolves with workspace connection info
 */
export function connectSlackOAuth(
  onProgress?: OAuthProgressCallback
): Promise<{ workspaceId: string; workspaceName: string }> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        if (message.type === 'SLACK_OAUTH_INITIATED') {
          onProgress?.('initiated', {
            sessionId: message.payload?.sessionId,
            authorizationUrl: message.payload?.authorizationUrl,
          });
          onProgress?.('polling');
          // Don't remove listener yet, wait for final result
          return;
        }

        if (message.type === 'SLACK_OAUTH_SUCCESS') {
          window.removeEventListener('message', handler);
          onProgress?.('success');
          resolve(
            message.payload || {
              workspaceId: '',
              workspaceName: '',
            }
          );
        } else if (message.type === 'SLACK_OAUTH_FAILED') {
          window.removeEventListener('message', handler);
          onProgress?.('failed');
          reject(new Error(message.payload?.message || 'OAuth authentication failed'));
        } else if (message.type === 'SLACK_OAUTH_CANCELLED') {
          window.removeEventListener('message', handler);
          onProgress?.('cancelled');
          reject(new Error('OAuth authentication was cancelled'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'SLACK_CONNECT_OAUTH',
      requestId,
      payload: {},
    });

    // Timeout after 6 minutes (OAuth flow + polling can take time)
    setTimeout(
      () => {
        window.removeEventListener('message', handler);
        reject(new Error('OAuth timeout'));
      },
      6 * 60 * 1000
    );
  });
}

/**
 * Cancel ongoing OAuth flow
 */
export function cancelSlackOAuth(): void {
  vscode.postMessage({
    type: 'SLACK_CANCEL_OAUTH',
    payload: {},
  });
}

/**
 * Get OAuth redirect URI for development/debugging
 *
 * @returns Promise that resolves with redirect URI
 */
export function getOAuthRedirectUri(): Promise<{ redirectUri: string }> {
  return new Promise((resolve, reject) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'GET_OAUTH_REDIRECT_URI_SUCCESS') {
          resolve(message.payload || { redirectUri: '' });
        } else if (message.type === 'GET_OAUTH_REDIRECT_URI_FAILED') {
          reject(new Error(message.payload?.message || 'Failed to get OAuth redirect URI'));
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'GET_OAUTH_REDIRECT_URI',
      requestId,
      payload: {},
    });

    setTimeout(() => {
      window.removeEventListener('message', handler);
      reject(new Error('Request timeout'));
    }, 10000);
  });
}

/**
 * Open external URL in browser
 *
 * @param url - URL to open
 */
export function openExternalUrl(url: string): void {
  vscode.postMessage({
    type: 'OPEN_EXTERNAL_URL',
    payload: { url },
  });
}

/**
 * Get last shared channel ID
 *
 * Retrieves the channel ID that was last used for sharing.
 * Returns null if no channel has been shared to yet.
 *
 * @returns Promise that resolves with channel ID or null
 */
export function getLastSharedChannel(): Promise<string | null> {
  return new Promise((resolve) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'GET_LAST_SHARED_CHANNEL_SUCCESS') {
          resolve(message.payload?.channelId || null);
        } else {
          resolve(null);
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'GET_LAST_SHARED_CHANNEL',
      requestId,
      payload: {},
    });

    // Short timeout - this is a local operation
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(null);
    }, 5000);
  });
}

/**
 * Set last shared channel ID
 *
 * Saves the channel ID to be used as default for next sharing.
 *
 * @param channelId - Channel ID to save
 */
export function setLastSharedChannel(channelId: string): void {
  vscode.postMessage({
    type: 'SET_LAST_SHARED_CHANNEL',
    payload: { channelId },
  });
}

/**
 * Check if the Slack App (Bot) is a member of the specified channel
 *
 * Uses conversations.info API to check bot membership.
 * This helps users know if they need to invite the Bot before sharing.
 *
 * @param workspaceId - Target workspace ID
 * @param channelId - Target channel ID to check
 * @returns Promise that resolves with true if bot is a member
 */
export function checkBotChannelMembership(
  workspaceId: string,
  channelId: string
): Promise<boolean> {
  return new Promise((resolve) => {
    const requestId = `req-${Date.now()}-${Math.random()}`;

    const handler = (event: MessageEvent) => {
      const message: ExtensionMessage = event.data;

      if (message.requestId === requestId) {
        window.removeEventListener('message', handler);

        if (message.type === 'CHECK_BOT_CHANNEL_MEMBERSHIP_SUCCESS') {
          resolve(message.payload?.isMember ?? false);
        } else {
          // On error or unknown response, assume not a member
          resolve(false);
        }
      }
    };

    window.addEventListener('message', handler);

    vscode.postMessage({
      type: 'CHECK_BOT_CHANNEL_MEMBERSHIP',
      requestId,
      payload: { workspaceId, channelId },
    });

    // Short timeout - this should be a fast API call
    setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve(false); // On timeout, assume not a member to show warning
    }, 5000);
  });
}
