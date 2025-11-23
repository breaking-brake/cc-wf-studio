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
  /** Workspace-specific WebClient cache */
  private clients: Map<string, WebClient> = new Map();

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
      console.log('[SlackApiService] Using cached client for workspace:', workspaceId);
      return client;
    }

    console.log('[SlackApiService] Getting access token for workspace:', workspaceId);

    // Get access token for this workspace
    const accessToken = await this.tokenManager.getAccessTokenByWorkspaceId(workspaceId);
    console.log('[SlackApiService] Access token retrieved:', {
      hasToken: !!accessToken,
      tokenPrefix: accessToken?.substring(0, 10),
    });

    if (!accessToken) {
      console.error('[SlackApiService] No access token found for workspace:', workspaceId);
      throw new Error(`ワークスペース ${workspaceId} に接続されていません`);
    }

    // Create and cache new client
    console.log('[SlackApiService] Creating new WebClient');
    client = new WebClient(accessToken);
    this.clients.set(workspaceId, client);

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
    } else {
      this.clients.clear();
    }
  }

  /**
   * Gets list of Slack channels
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
      const client = await this.ensureClient(workspaceId);

      // Build channel types filter
      const types: string[] = ['public_channel'];
      if (includePrivate) {
        types.push('private_channel');
      }

      console.log('[SlackApiService] Fetching channels with options:', {
        types: types.join(','),
        onlyMember,
      });

      // Fetch channels (with pagination)
      const channels: SlackChannel[] = [];
      let cursor: string | undefined;

      do {
        console.log('[SlackApiService] Calling conversations.list...');
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
      console.error('[SlackApiService] Error fetching channels:', error);
      console.error('[SlackApiService] Error type:', typeof error);
      console.error('[SlackApiService] Error details:', {
        message: error instanceof Error ? error.message : 'unknown',
        stack: error instanceof Error ? error.stack : 'no stack',
        data: (error as any)?.data,
      });
      const errorInfo = handleSlackError(error);
      console.error('[SlackApiService] Handled error info:', errorInfo);
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
    try {
      const client = await this.ensureClient(options.workspaceId);

      // Upload file using files.uploadV2
      const response = await client.files.uploadV2({
        channel_id: options.channelId,
        file: Buffer.from(options.content, 'utf-8'),
        filename: options.filename,
        title: options.title,
        initial_comment: options.initialComment,
      });

      if (!response.ok || !(response as unknown as Record<string, unknown>).file) {
        throw new Error('ファイルのアップロードに失敗しました');
      }

      const file = (response as unknown as Record<string, unknown>).file as Record<string, unknown>;

      return {
        fileId: file.id as string,
        fileUrl: file.url_private as string,
        permalink: file.permalink as string,
      };
    } catch (error) {
      const errorInfo = handleSlackError(error);
      throw new Error(errorInfo.message);
    }
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
    try {
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
    } catch (error) {
      const errorInfo = handleSlackError(error);
      throw new Error(errorInfo.message);
    }
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
}
