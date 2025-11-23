/**
 * Slack Share Workflow Command Handler
 *
 * Handles SHARE_WORKFLOW_TO_SLACK messages from Webview.
 * Implements workflow sharing with sensitive data detection and warning flow.
 *
 * Based on specs/001-slack-workflow-sharing/contracts/extension-host-api-contracts.md
 */

import * as vscode from 'vscode';
import type { ShareWorkflowToSlackPayload } from '../../shared/types/messages';
import { log } from '../extension';
import type { FileService } from '../services/file-service';
import type { SlackApiService } from '../services/slack-api-service';
import type {
  SensitiveDataWarningEvent,
  ShareWorkflowFailedEvent,
  ShareWorkflowSuccessEvent,
} from '../types/slack-messages';
import { detectSensitiveData } from '../utils/sensitive-data-detector';
import { handleSlackError } from '../utils/slack-error-handler';
import type { WorkflowMessageBlock } from '../utils/slack-message-builder';

/**
 * Handle workflow sharing to Slack
 *
 * @param payload - Share workflow request
 * @param webview - Webview to send response to
 * @param requestId - Request ID for correlation
 * @param fileService - File service instance
 * @param slackApiService - Slack API service instance
 */
export async function handleShareWorkflowToSlack(
  payload: ShareWorkflowToSlackPayload,
  webview: vscode.Webview,
  requestId: string,
  _fileService: FileService,
  slackApiService: SlackApiService
): Promise<void> {
  const startTime = Date.now();

  log('INFO', 'Slack workflow sharing started', {
    requestId,
    workflowId: payload.workflowId,
    channelId: payload.channelId,
  });

  try {
    // Use workflow object directly from payload (current canvas state)
    const workflow = payload.workflow;
    const workflowContent = JSON.stringify(workflow, null, 2);

    // Step 1: Detect sensitive data (if not overriding warning)
    if (!payload.overrideSensitiveWarning) {
      const findings = detectSensitiveData(workflowContent);

      if (findings.length > 0) {
        log('WARN', 'Sensitive data detected in workflow', {
          requestId,
          findingsCount: findings.length,
          types: findings.map((f) => f.type),
        });

        // Send warning to user
        const warningEvent: SensitiveDataWarningEvent = {
          type: 'SENSITIVE_DATA_WARNING',
          payload: {
            workflowId: payload.workflowId,
            findings,
          },
        };

        webview.postMessage({
          ...warningEvent,
          requestId,
        });

        log('INFO', 'Sensitive data warning sent to user', { requestId });
        return; // Stop here, wait for user confirmation
      }
    }

    log('INFO', 'No sensitive data detected or warning overridden', { requestId });

    // Step 2: Get Slack user information for author
    log('INFO', 'Getting Slack user information', { requestId });
    const userInfo = await slackApiService.getUserInfo(payload.workspaceId);
    const authorName = userInfo.userName;

    // Step 3: Extract workflow metadata
    const nodeCount = workflow.nodes.length;
    const createdAt =
      typeof workflow.createdAt === 'string'
        ? workflow.createdAt
        : new Date(workflow.createdAt).toISOString();

    // Step 4: Post rich message card to channel (main message)
    log('INFO', 'Posting workflow message card to Slack', { requestId });

    const messageBlock: WorkflowMessageBlock = {
      workflowId: workflow.id,
      name: workflow.name,
      description: payload.description || workflow.description,
      version: workflow.version,
      authorName,
      nodeCount,
      createdAt,
      fileId: '', // Will be updated after file upload
      workspaceId: payload.workspaceId,
      channelId: payload.channelId,
    };

    const messageResult = await slackApiService.postWorkflowMessage(
      payload.workspaceId,
      payload.channelId,
      messageBlock
    );

    log('INFO', 'Workflow message card posted successfully', {
      requestId,
      messageTs: messageResult.messageTs,
      permalink: messageResult.permalink,
    });

    // Step 5: Upload workflow file to thread as reply
    log('INFO', 'Uploading workflow file to thread', { requestId });

    const filename = `${payload.workflowName.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`;
    const uploadResult = await slackApiService.uploadWorkflowFile({
      workspaceId: payload.workspaceId,
      content: workflowContent,
      filename,
      title: payload.workflowName,
      channelId: payload.channelId,
      threadTs: messageResult.messageTs,
    });

    log('INFO', 'Workflow file uploaded to thread successfully', {
      requestId,
      fileId: uploadResult.fileId,
    });

    // Step 6: Update message with complete deep link
    log('INFO', 'Updating message with complete deep link', { requestId });

    const updatedMessageBlock: WorkflowMessageBlock = {
      ...messageBlock,
      fileId: uploadResult.fileId,
      messageTs: messageResult.messageTs,
    };

    await slackApiService.updateWorkflowMessage(
      payload.workspaceId,
      payload.channelId,
      messageResult.messageTs,
      updatedMessageBlock
    );

    log('INFO', 'Message updated with complete deep link', { requestId });

    // Step 6: Send success response
    const successEvent: ShareWorkflowSuccessEvent = {
      type: 'SHARE_WORKFLOW_SUCCESS',
      payload: {
        workflowId: payload.workflowId,
        channelId: payload.channelId,
        channelName: '', // TODO: Resolve channel name from channelId
        messageTs: messageResult.messageTs,
        fileId: uploadResult.fileId,
        permalink: messageResult.permalink,
      },
    };

    log('INFO', 'Sending success message to webview', { requestId });

    webview.postMessage({
      ...successEvent,
      requestId,
    });

    // Show native notification
    const viewInSlackButton = 'View in Slack';
    const result = await vscode.window.showInformationMessage(
      `Workflow "${payload.workflowName}" shared to Slack successfully!`,
      viewInSlackButton
    );

    // Open Slack permalink if user clicks the button
    if (result === viewInSlackButton) {
      await vscode.env.openExternal(vscode.Uri.parse(messageResult.permalink));
    }

    log('INFO', 'Workflow sharing completed successfully', {
      requestId,
      executionTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    const errorInfo = handleSlackError(error);

    log('ERROR', 'Workflow sharing failed', {
      requestId,
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
      executionTimeMs: Date.now() - startTime,
    });

    sendShareFailed(webview, requestId, payload.workflowId, errorInfo.code, errorInfo.message);
  }
}

/**
 * Handle list Slack workspaces request
 *
 * @param webview - Webview to send response to
 * @param requestId - Request ID for correlation
 * @param slackApiService - Slack API service instance
 */
export async function handleListSlackWorkspaces(
  webview: vscode.Webview,
  requestId: string,
  slackApiService: SlackApiService
): Promise<void> {
  try {
    log('INFO', 'Listing Slack workspaces', { requestId });

    const workspaces = await slackApiService.getWorkspaces();

    // Convert to message payload format
    const workspaceList = workspaces.map((ws) => ({
      workspaceId: ws.workspaceId,
      workspaceName: ws.workspaceName,
      teamId: ws.teamId,
      authorizedAt: ws.authorizedAt.toISOString(),
      lastValidatedAt: ws.lastValidatedAt?.toISOString(),
    }));

    webview.postMessage({
      type: 'LIST_SLACK_WORKSPACES_SUCCESS',
      requestId,
      payload: {
        workspaces: workspaceList,
      },
    });

    log('INFO', 'Workspace list retrieved successfully', {
      requestId,
      count: workspaceList.length,
    });
  } catch (error) {
    const errorInfo = handleSlackError(error);

    log('ERROR', 'Failed to list workspaces', {
      requestId,
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
    });

    webview.postMessage({
      type: 'LIST_SLACK_WORKSPACES_FAILED',
      requestId,
      payload: {
        message: errorInfo.message,
      },
    });
  }
}

/**
 * Handle get Slack channels request
 *
 * @param payload - Get channels request payload
 * @param webview - Webview to send response to
 * @param requestId - Request ID for correlation
 * @param slackApiService - Slack API service instance
 */
export async function handleGetSlackChannels(
  payload: { workspaceId: string; includePrivate?: boolean; onlyMember?: boolean },
  webview: vscode.Webview,
  requestId: string,
  slackApiService: SlackApiService
): Promise<void> {
  try {
    log('INFO', 'Getting Slack channels', {
      requestId,
      workspaceId: payload.workspaceId,
    });

    const channels = await slackApiService.getChannels(
      payload.workspaceId,
      payload.includePrivate ?? true,
      payload.onlyMember ?? true
    );

    webview.postMessage({
      type: 'GET_SLACK_CHANNELS_SUCCESS',
      requestId,
      payload: {
        channels,
      },
    });

    log('INFO', 'Channel list retrieved successfully', {
      requestId,
      count: channels.length,
    });
  } catch (error) {
    const errorInfo = handleSlackError(error);

    log('ERROR', 'Failed to get channels', {
      requestId,
      errorCode: errorInfo.code,
      errorMessage: errorInfo.message,
    });

    webview.postMessage({
      type: 'GET_SLACK_CHANNELS_FAILED',
      requestId,
      payload: {
        message: errorInfo.message,
      },
    });
  }
}

/**
 * Send share workflow failed event to Webview
 */
function sendShareFailed(
  webview: vscode.Webview,
  requestId: string,
  workflowId: string,
  errorCode: string,
  errorMessage: string
): void {
  const failedEvent: ShareWorkflowFailedEvent = {
    type: 'SHARE_WORKFLOW_FAILED',
    payload: {
      workflowId,
      errorCode: errorCode as ShareWorkflowFailedEvent['payload']['errorCode'],
      errorMessage,
    },
  };

  webview.postMessage({
    ...failedEvent,
    requestId,
  });
}
