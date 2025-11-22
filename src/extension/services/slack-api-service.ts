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
 */
export class SlackApiService {
  private client: WebClient | null = null;

  constructor(private readonly tokenManager: SlackTokenManager) {}

  /**
   * Initializes Slack client with access token
   *
   * @throws Error if not authenticated
   */
  private async ensureClient(): Promise<WebClient> {
    if (!this.client) {
      const accessToken = await this.tokenManager.getAccessToken();
      if (!accessToken) {
        throw new Error('Slackに接続されていません');
      }
      this.client = new WebClient(accessToken);
    }
    return this.client;
  }

  /**
   * Invalidates cached client (forces re-authentication)
   */
  invalidateClient(): void {
    this.client = null;
  }

  /**
   * Gets list of Slack channels
   *
   * @param includePrivate - Include private channels (default: true)
   * @param onlyMember - Only channels user is a member of (default: true)
   * @returns Array of channels
   */
  async getChannels(includePrivate = true, onlyMember = true): Promise<SlackChannel[]> {
    try {
      const client = await this.ensureClient();

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
    try {
      const client = await this.ensureClient();

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
   * @param channelId - Target channel ID
   * @param block - Workflow message block
   * @returns Message post result
   */
  async postWorkflowMessage(
    channelId: string,
    block: WorkflowMessageBlock
  ): Promise<MessagePostResult> {
    try {
      const client = await this.ensureClient();

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
      const client = await this.ensureClient();

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
   * Validates current token
   *
   * @returns True if token is valid
   */
  async validateToken(): Promise<boolean> {
    try {
      const client = await this.ensureClient();
      const response = await client.auth.test();
      return response.ok === true;
    } catch (_error) {
      return false;
    }
  }
}
