/**
 * Slack Handlers - Web Server
 *
 * Handles Slack OAuth, share/import workflows, description generation.
 * Ported from src/extension/commands/slack-*.ts
 */

import { type FileService, log } from '@cc-wf-studio/core';
import { SecretStore } from '../services/secret-store.js';

type Reply = (type: string, payload?: unknown) => void;
type Send = (message: { type: string; requestId?: string; payload?: unknown }) => void;

// Module-level Slack state
const secretStore = new SecretStore();

/**
 * Handle LIST_SLACK_WORKSPACES
 */
export async function handleListSlackWorkspacesWeb(
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const token = await secretStore.get('slack-user-token');
    if (!token) {
      reply('SLACK_WORKSPACES_LIST', { workspaces: [] });
      return;
    }

    // Use @slack/web-api to list workspaces
    const { WebClient } = await import('@slack/web-api');
    const client = new WebClient(token);
    const result = await client.auth.test();

    reply('SLACK_WORKSPACES_LIST', {
      workspaces: [
        {
          id: result.team_id,
          name: result.team,
          connected: true,
        },
      ],
    });
  } catch (error) {
    log('ERROR', 'Failed to list Slack workspaces', {
      error: error instanceof Error ? error.message : String(error),
    });
    reply('SLACK_WORKSPACES_LIST', { workspaces: [] });
  }
}

/**
 * Handle GET_SLACK_CHANNELS
 */
export async function handleGetSlackChannelsWeb(
  payload: { workspaceId: string; types?: string },
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const token = await secretStore.get('slack-user-token');
    if (!token) {
      reply('ERROR', { code: 'SLACK_NOT_CONNECTED', message: 'Not connected to Slack' });
      return;
    }

    const { WebClient } = await import('@slack/web-api');
    const client = new WebClient(token);
    const result = await client.conversations.list({
      types: payload.types || 'public_channel,private_channel',
      limit: 200,
    });

    const channels = (result.channels || []).map((ch) => ({
      id: ch.id,
      name: ch.name,
      isPrivate: ch.is_private,
      memberCount: ch.num_members,
    }));

    reply('SLACK_CHANNELS_LIST', { channels });
  } catch (error) {
    reply('SLACK_CHANNELS_FAILED', {
      errorMessage: error instanceof Error ? error.message : 'Failed to get channels',
    });
  }
}

/**
 * Handle SHARE_WORKFLOW_TO_SLACK
 */
export async function handleShareWorkflowToSlackWeb(
  payload: Record<string, unknown>,
  _fileService: FileService,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const token = await secretStore.get('slack-user-token');
    if (!token) {
      reply('SHARE_WORKFLOW_TO_SLACK_FAILED', {
        errorCode: 'SLACK_NOT_CONNECTED',
        errorMessage: 'Not connected to Slack',
      });
      return;
    }

    const { WebClient } = await import('@slack/web-api');
    const client = new WebClient(token);

    const workflow = payload.workflow as Record<string, unknown>;
    const channelId = payload.channelId as string;
    const description = (payload.description as string) || '';

    // Upload workflow JSON as file
    const workflowJson = JSON.stringify(workflow, null, 2);
    await client.filesUploadV2({
      channel_id: channelId,
      content: workflowJson,
      filename: `${workflow.name}.json`,
      title: `Workflow: ${workflow.name}`,
      initial_comment: description || `Shared workflow: ${workflow.name}`,
    });

    reply('SHARE_WORKFLOW_TO_SLACK_SUCCESS', {
      channelId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply('SHARE_WORKFLOW_TO_SLACK_FAILED', {
      errorCode: 'SHARE_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to share to Slack',
    });
  }
}

/**
 * Handle GENERATE_SLACK_DESCRIPTION
 */
export async function handleGenerateSlackDescriptionWeb(
  payload: Record<string, unknown>,
  _workspacePath: string,
  requestId: string | undefined,
  reply: Reply
): Promise<void> {
  // TODO: Port AI description generation from claude-code-service
  reply('GENERATE_SLACK_DESCRIPTION_SUCCESS', {
    description: `Workflow: ${(payload.workflow as Record<string, unknown>)?.name || 'unknown'}`,
    requestId,
  });
}

/**
 * Handle IMPORT_WORKFLOW_FROM_SLACK
 */
export async function handleImportWorkflowFromSlackWeb(
  payload: Record<string, unknown>,
  fileService: FileService,
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const token = await secretStore.get('slack-user-token');
    if (!token) {
      reply('IMPORT_WORKFLOW_FROM_SLACK_FAILED', {
        errorCode: 'SLACK_NOT_CONNECTED',
        errorMessage: 'Not connected to Slack',
      });
      return;
    }

    const { WebClient } = await import('@slack/web-api');
    const client = new WebClient(token);

    const fileId = payload.fileId as string;
    const fileInfo = await client.files.info({ file: fileId });
    const file = fileInfo.file;

    if (!file?.url_private) {
      throw new Error('File URL not available');
    }

    // Download file content
    const response = await fetch(file.url_private, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const content = await response.text();
    const workflow = JSON.parse(content);

    // Save to local workflows directory
    await fileService.ensureWorkflowsDirectory();
    const filePath = fileService.getWorkflowFilePath(workflow.name);
    await fileService.writeFile(filePath, JSON.stringify(workflow, null, 2));

    reply('IMPORT_WORKFLOW_FROM_SLACK_SUCCESS', {
      workflow,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    reply('IMPORT_WORKFLOW_FROM_SLACK_FAILED', {
      errorCode: 'IMPORT_FAILED',
      errorMessage: error instanceof Error ? error.message : 'Failed to import from Slack',
    });
  }
}

/**
 * Handle CONNECT_SLACK_MANUAL
 */
export async function handleConnectSlackManualWeb(
  payload: { userToken: string },
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    const { WebClient } = await import('@slack/web-api');
    const client = new WebClient(payload.userToken);
    const result = await client.auth.test();

    if (!result.ok) {
      throw new Error('Invalid Slack token');
    }

    // Store token
    await secretStore.set('slack-user-token', payload.userToken);

    reply('CONNECT_SLACK_MANUAL_SUCCESS', {
      workspaceId: result.team_id,
      workspaceName: result.team,
    });
  } catch (error) {
    reply('CONNECT_SLACK_MANUAL_FAILED', {
      code: 'SLACK_CONNECTION_FAILED',
      message: error instanceof Error ? error.message : 'Failed to connect to Slack',
    });
  }
}

/**
 * Handle SLACK_CONNECT_OAUTH
 */
export async function handleSlackConnectOAuthWeb(
  _requestId: string | undefined,
  reply: Reply,
  _send: Send
): Promise<void> {
  // OAuth in web mode: redirect to Slack OAuth URL
  // For now, return a message indicating manual token is preferred
  reply('SLACK_OAUTH_FAILED', {
    message: 'OAuth flow is not yet supported in web mode. Please use manual token connection.',
  });
}

/**
 * Handle SLACK_CANCEL_OAUTH
 */
export function handleSlackCancelOAuthWeb(): void {
  // No-op in web mode
}

/**
 * Handle SLACK_DISCONNECT
 */
export async function handleSlackDisconnectWeb(
  _requestId: string | undefined,
  reply: Reply
): Promise<void> {
  try {
    await secretStore.delete('slack-user-token');
    reply('SLACK_DISCONNECT_SUCCESS', {});
  } catch (error) {
    reply('SLACK_DISCONNECT_FAILED', {
      message: error instanceof Error ? error.message : 'Failed to disconnect from Slack',
    });
  }
}
