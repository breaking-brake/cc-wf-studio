/**
 * Slack API Service
 *
 * Provides high-level interface to Slack Web API.
 * Handles authentication, error handling, and response parsing.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/slack-api-contracts.md
 */

import { WebClient } from '@slack/web-api';
import type { SlackChannel } from '../types/slack-integration-types';
import { handleSlackError } from '../utils/slack-error-handler';
import {
  buildWorkflowMessageBlocks,
  type WorkflowMessageBlock,
} from '../utils/slack-message-builder';
import type { SlackTokenManager } from '../utils/slack-token-manager';

/**
 * Workflow file upload options
 */
export interface WorkflowUploadOptions {
  /** Target workspace ID */
  workspaceId: string;
  /** Workflow JSON content */
  content: string;
  /** Filename */
  filename: string;
  /** File title */
  title: string;
  /** Target channel ID */
  channelId: string;
  /** Initial comment (optional) */
  initialComment?: string;
  /** Thread timestamp to upload file as reply (optional) */
  threadTs?: string;
}

/**
 * Message post result
 */
export interface MessagePostResult {
  /** Channel ID */
  channelId: string;
  /** Message timestamp */
  messageTs: string;
  /** Permalink to message */
  permalink: string;
}

/**
 * File upload result
 */
export interface FileUploadResult {
  /** File ID */
  fileId: string;
  /** File download URL (private) */
  fileUrl: string;
  /** File permalink */
  permalink: string;
}

/**
 * Workflow search options
 */
export interface WorkflowSearchOptions {
  /** Target workspace ID */
  workspaceId: string;
  /** Search query */
  query?: string;
  /** Filter by channel ID */
  channelId?: string;
  /** Number of results (max: 100) */
  count?: number;
  /** Sort order (score | timestamp) */
  sort?: 'score' | 'timestamp';
}

/**
 * Search result
 */
export interface SearchResult {
  /** Message timestamp */
  messageTs: string;
  /** Channel ID */
  channelId: string;
  /** Channel name */
  channelName: string;
  /** Message text */
  text: string;
  /** User ID */
  userId: string;
  /** Permalink to message */
  permalink: string;
  /** Attached file ID (if exists) */
  fileId?: string;
  /** File name (if exists) */
  fileName?: string;
  /** File download URL (if exists) */
  fileUrl?: string;
}

/**
 * Slack API Service
 *
 * Wraps Slack Web API with authentication and error handling.
 * Supports multiple workspace connections.
 */
export class SlackApiService {
  /** Workspace-specific WebClient cache (Bot Token) */
  private clients: Map<string, WebClient> = new Map();
  /** Workspace-specific WebClient cache (User Token) */
  private userClients: Map<string, WebClient> = new Map();

  constructor(private readonly tokenManager: SlackTokenManager) {}

  /**
   * Initializes Slack client for specific workspace with access token
   *
   * @param workspaceId - Target workspace ID
   * @throws Error if workspace not authenticated
   */
  private async ensureClient(workspaceId: string): Promise<WebClient> {
    // Return cached client if exists
    let client = this.clients.get(workspaceId);
    if (client) {
      return client;
    }

    // Get access token for this workspace
    const accessToken = await this.tokenManager.getAccessTokenByWorkspaceId(workspaceId);

    if (!accessToken) {
      const error = new Error(`Workspace ${workspaceId} is not connected`);
      (error as Error & { code: string; workspaceId: string }).code = 'WORKSPACE_NOT_CONNECTED';
      (error as Error & { code: string; workspaceId: string }).workspaceId = workspaceId;
      throw error;
    }

    // Create and cache new client
    client = new WebClient(accessToken);
    this.clients.set(workspaceId, client);

    return client;
  }

  /**
   * Initializes Slack client for specific workspace with User access token
   *
   * User Token is used for user-specific operations like listing channels
   * the authenticated user is a member of.
   *
   * @param workspaceId - Target workspace ID
   * @returns WebClient or null if User Token not available
   */
  private async ensureUserClient(workspaceId: string): Promise<WebClient | null> {
    // Return cached client if exists
    let client = this.userClients.get(workspaceId);
    if (client) {
      return client;
    }

    // Get User access token for this workspace
    const userAccessToken = await this.tokenManager.getUserAccessTokenByWorkspaceId(workspaceId);

    if (!userAccessToken) {
      // User Token not available, will fallback to Bot Token
      return null;
    }

    // Create and cache new client
    client = new WebClient(userAccessToken);
    this.userClients.set(workspaceId, client);

    return client;
  }

  /**
   * Invalidates cached client (forces re-authentication)
   *
   * @param workspaceId - Optional workspace ID. If not provided, clears all cached clients.
   */
  invalidateClient(workspaceId?: string): void {
    if (workspaceId) {
      this.clients.delete(workspaceId);
      this.userClients.delete(workspaceId);
    } else {
      this.clients.clear();
      this.userClients.clear();
    }
  }

  /**
   * Gets list of Slack channels
   *
   * Uses User Token (xoxp-...) if available for accurate channel listing based on
   * authenticated user's membership. Falls back to Bot Token (xoxb-...) if User Token
   * is not available (e.g., manual token input or legacy connections).
   *
   * @param workspaceId - Target workspace ID
   * @param includePrivate - Include private channels (default: true)
   * @param onlyMember - Only channels user is a member of (default: true)
   * @returns Array of channels
   */
  async getChannels(
    workspaceId: string,
    includePrivate = true,
    onlyMember = true
  ): Promise<SlackChannel[]> {
    try {
      // Prefer User Token for channel listing (returns user's channels)
      // Fall back to Bot Token (returns bot's channels - may include channels user is not in)
      const userClient = await this.ensureUserClient(workspaceId);
      const client = userClient ?? (await this.ensureClient(workspaceId));

      // Build channel types filter
      const types: string[] = ['public_channel'];
      if (includePrivate) {
        types.push('private_channel');
      }

      // Fetch channels (with pagination)
      const channels: SlackChannel[] = [];
      let cursor: string | undefined;

      do {
        const response = await client.conversations.list({
          types: types.join(','),
          exclude_archived: true,
          limit: 100,
          cursor,
        });

        if (!response.ok || !response.channels) {
          throw new Error('チャンネル一覧の取得に失敗しました');
        }

        // Map to SlackChannel type
        for (const channel of response.channels) {
          const isMember = channel.is_member ?? false;

          // Filter by membership if requested
          if (onlyMember && !isMember) {
            continue;
          }

          channels.push({
            id: channel.id as string,
            name: channel.name as string,
            isPrivate: channel.is_private ?? false,
            isMember,
            memberCount: channel.num_members,
            purpose: channel.purpose?.value,
            topic: channel.topic?.value,
          });
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      return channels;
    } catch (error) {
      const errorInfo = handleSlackError(error);
      throw new Error(errorInfo.message);
    }
  }

  /**
   * Uploads workflow file to Slack
   *
   * @param options - Upload options
   * @returns File upload result
   */
  async uploadWorkflowFile(options: WorkflowUploadOptions): Promise<FileUploadResult> {
    const client = await this.ensureClient(options.workspaceId);

    // Upload file using files.uploadV2
    const response = await client.files.uploadV2({
      channel_id: options.channelId,
      file: Buffer.from(options.content, 'utf-8'),
      filename: options.filename,
      title: options.title,
      initial_comment: options.initialComment,
      thread_ts: options.threadTs,
    });

    if (!response.ok) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    const responseObj = response as unknown as Record<string, unknown>;

    // files.uploadV2 returns nested structure: response.files[0].files[0]
    const file = responseObj.file as Record<string, unknown> | undefined;
    const filesWrapper = responseObj.files as Array<Record<string, unknown>> | undefined;

    let fileData: Record<string, unknown> | undefined = file;

    // If no direct file object, try to get from nested structure
    if (!fileData && filesWrapper && filesWrapper.length > 0) {
      const innerWrapper = filesWrapper[0];
      const innerFiles = innerWrapper.files as Array<Record<string, unknown>> | undefined;

      if (innerFiles && innerFiles.length > 0) {
        fileData = innerFiles[0];
      }
    }

    if (!fileData) {
      throw new Error('ファイルのアップロードに失敗しました');
    }

    return {
      fileId: fileData.id as string,
      fileUrl: fileData.url_private as string,
      permalink: fileData.permalink as string,
    };
  }

  /**
   * Posts rich message card to channel
   *
   * @param workspaceId - Target workspace ID
   * @param channelId - Target channel ID
   * @param block - Workflow message block
   * @returns Message post result
   */
  async postWorkflowMessage(
    workspaceId: string,
    channelId: string,
    block: WorkflowMessageBlock
  ): Promise<MessagePostResult> {
    const client = await this.ensureClient(workspaceId);

    // Build Block Kit blocks
    const blocks = buildWorkflowMessageBlocks(block);

    // Post message
    const response = await client.chat.postMessage({
      channel: channelId,
      text: `New workflow shared: ${block.name}`,
      // biome-ignore lint/suspicious/noExplicitAny: Slack Web API type definitions are incomplete
      blocks: blocks as any,
    });

    if (!response.ok) {
      throw new Error('メッセージの投稿に失敗しました');
    }

    // Get permalink
    const permalinkResponse = await client.chat.getPermalink({
      channel: channelId,
      message_ts: response.ts as string,
    });

    return {
      channelId,
      messageTs: response.ts as string,
      permalink: (permalinkResponse.permalink as string) || '',
    };
  }

  /**
   * Searches for workflow messages
   *
   * @param options - Search options
   * @returns Array of search results
   */
  async searchWorkflows(options: WorkflowSearchOptions): Promise<SearchResult[]> {
    try {
      const client = await this.ensureClient(options.workspaceId);

      // Build search query
      let query = 'workflow filename:*.json';
      if (options.query) {
        query = `${options.query} ${query}`;
      }
      if (options.channelId) {
        query = `${query} in:<#${options.channelId}>`;
      }

      // Search messages
      const response = await client.search.messages({
        query,
        count: Math.min(options.count || 20, 100),
        sort: options.sort || 'timestamp',
      });

      if (!response.ok || !response.messages) {
        throw new Error('ワークフロー検索に失敗しました');
      }

      const matches = response.messages.matches || [];
      const results: SearchResult[] = [];

      for (const match of matches) {
        const file = match.files?.[0];

        results.push({
          messageTs: match.ts as string,
          channelId: match.channel?.id as string,
          channelName: match.channel?.name as string,
          text: match.text as string,
          userId: match.user as string,
          permalink: match.permalink as string,
          fileId: file?.id,
          fileName: file?.name,
          fileUrl: file?.url_private,
        });
      }

      return results;
    } catch (error) {
      const errorInfo = handleSlackError(error);
      throw new Error(errorInfo.message);
    }
  }

  /**
   * Validates token for specific workspace
   *
   * @param workspaceId - Target workspace ID
   * @returns True if token is valid
   */
  async validateToken(workspaceId: string): Promise<boolean> {
    try {
      const client = await this.ensureClient(workspaceId);
      const response = await client.auth.test();
      return response.ok === true;
    } catch (_error) {
      return false;
    }
  }

  /**
   * Gets list of connected workspaces
   *
   * @returns Array of workspace connections
   */
  async getWorkspaces() {
    return this.tokenManager.getWorkspaces();
  }

  /**
   * Checks if the Bot is a member of the specified channel
   *
   * Uses User Token to call conversations.members API to get the member list,
   * then checks if Bot User ID is in the list. This approach works because
   * User Token has channels:read/groups:read scopes while Bot Token doesn't.
   *
   * For users who authenticated before bot_user_id was saved, this method
   * falls back to auth.test API to get the Bot User ID dynamically.
   *
   * @param workspaceId - Target workspace ID
   * @param channelId - Target channel ID
   * @returns True if Bot is a member of the channel
   */
  async checkBotMembership(workspaceId: string, channelId: string): Promise<boolean> {
    try {
      // Step 1: Get Bot User ID (from stored data or auth.test)
      let botUserId = await this.tokenManager.getBotUserId(workspaceId);

      if (!botUserId) {
        // Fallback for users who authenticated before bot_user_id was saved
        const client = await this.ensureClient(workspaceId);
        const authResponse = await client.auth.test();
        botUserId = (authResponse.user_id as string) || null;
      }

      if (!botUserId) {
        // Cannot determine Bot User ID
        return false;
      }

      // Step 2: Use User Token to get channel members
      const userClient = await this.ensureUserClient(workspaceId);
      if (!userClient) {
        // User Token not available (e.g., manual token input)
        return false;
      }

      // Step 3: Get channel members list (with pagination for large channels)
      let cursor: string | undefined;
      do {
        const response = await userClient.conversations.members({
          channel: channelId,
          cursor,
          limit: 200,
        });

        if (!response.ok || !response.members) {
          return false;
        }

        // Check if Bot User ID is in this batch of members
        if (response.members.includes(botUserId)) {
          return true;
        }

        cursor = response.response_metadata?.next_cursor;
      } while (cursor);

      // Bot not found in member list
      return false;
    } catch (_error) {
      // If we can't check, assume not a member to show warning
      // The warning will prompt user to invite the bot
      return false;
    }
  }

  /**
   * Gets current Slack user information
   *
   * Uses auth.test to get user ID, then users.info to get user details.
   * Requires 'users:read' scope for users.info API.
   *
   * @param workspaceId - Target workspace ID
   * @returns User information (Slack user ID and username)
   */
  async getUserInfo(workspaceId: string): Promise<{
    userId: string;
    userName: string;
  }> {
    // User Tokenでauth.testを呼び出し（User IDを取得）
    const userClient = await this.ensureUserClient(workspaceId);

    if (!userClient) {
      // User Tokenがない場合（手動トークン入力など）
      return { userId: '', userName: '' };
    }

    try {
      const authResponse = await userClient.auth.test();
      const userId = (authResponse.user_id as string) || '';

      if (!userId) {
        return { userId: '', userName: '' };
      }

      // users.infoでユーザー情報を取得（users:readスコープ必要）
      // User Tokenを使用する（Bot Tokenにはusers:readスコープがない）
      const userResponse = await userClient.users.info({ user: userId });

      if (userResponse.ok && userResponse.user) {
        return {
          userId,
          userName: userResponse.user.name || '',
        };
      }

      // ユーザー名は取得できなくてもUser IDは返す
      return { userId, userName: '' };
    } catch (error) {
      // スコープ不足またはAPIエラーの場合
      console.error('[SlackApiService] getUserInfo failed:', error);
      return { userId: '', userName: '' };
    }
  }

  /**
   * Updates existing workflow message with new content
   *
   * @param workspaceId - Target workspace ID
   * @param channelId - Target channel ID
   * @param messageTs - Message timestamp to update
   * @param block - Updated workflow message block
   */
  async updateWorkflowMessage(
    workspaceId: string,
    channelId: string,
    messageTs: string,
    block: WorkflowMessageBlock
  ): Promise<void> {
    const client = await this.ensureClient(workspaceId);

    // Build Block Kit blocks
    const blocks = buildWorkflowMessageBlocks(block);

    // Update message
    const response = await client.chat.update({
      channel: channelId,
      ts: messageTs,
      text: `Workflow shared: ${block.name}`,
      // biome-ignore lint/suspicious/noExplicitAny: Slack Web API type definitions are incomplete
      blocks: blocks as any,
    });

    if (!response.ok) {
      throw new Error('メッセージの更新に失敗しました');
    }
  }

  /**
   * Downloads workflow file from Slack
   *
   * @param workspaceId - Target workspace ID
   * @param fileId - Slack file ID to download
   * @returns Workflow JSON content as string
   */
  async downloadWorkflowFile(workspaceId: string, fileId: string): Promise<string> {
    try {
      const client = await this.ensureClient(workspaceId);

      // Get file info using files.info API
      const response = await client.files.info({
        file: fileId,
      });

      if (!response.ok || !response.file) {
        throw new Error('ファイル情報の取得に失敗しました');
      }

      const file = response.file as Record<string, unknown>;
      const urlPrivate = file.url_private as string | undefined;

      if (!urlPrivate) {
        throw new Error('ファイルのダウンロードURLが見つかりません');
      }

      // Download file content from url_private
      const accessToken = await this.tokenManager.getAccessTokenByWorkspaceId(workspaceId);
      if (!accessToken) {
        const error = new Error(`Workspace ${workspaceId} is not connected`);
        (error as Error & { code: string; workspaceId: string }).code = 'WORKSPACE_NOT_CONNECTED';
        (error as Error & { code: string; workspaceId: string }).workspaceId = workspaceId;
        throw error;
      }

      // Fetch file content with Authorization header
      const fileResponse = await fetch(urlPrivate, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!fileResponse.ok) {
        throw new Error(`ファイルのダウンロードに失敗しました (HTTP ${fileResponse.status})`);
      }

      const content = await fileResponse.text();

      return content;
    } catch (error) {
      console.error('[SlackApiService] downloadWorkflowFile error:', error);
      // Re-throw WORKSPACE_NOT_CONNECTED errors directly to preserve error code
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code: string }).code === 'WORKSPACE_NOT_CONNECTED'
      ) {
        throw error;
      }
      const errorInfo = handleSlackError(error);
      throw new Error(errorInfo.message);
    }
  }
}
